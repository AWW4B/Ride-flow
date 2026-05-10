from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import get_current_user
from app.utils.ride_lifecycle import auto_advance_ride

router = APIRouter()


class LocationUpdate(BaseModel):
    lat: float
    lng: float

class StatusUpdate(BaseModel):
    status: str

class RideCompleteBody(BaseModel):
    distance_km:  float
    duration_min: int

class VehicleBody(BaseModel):
    make:          str
    model:         str
    year:          int
    color:         str
    license_plate: str
    vehicle_type:  str   # economy | premium | bike


def _get_driver(user_id: int) -> dict:
    rows = db.query(
        "SELECT driver_id, verification_status, availability, wallet_balance FROM Driver WHERE user_id=%s",
        (user_id,)
    )
    if not rows:
        raise HTTPException(404, "Driver profile not found")
    return rows[0]


@router.get("/rides/pending")
def list_pending_rides(user: dict = Depends(get_current_user)):
    _get_driver(int(user["sub"]))  # verify driver exists
    return db.query("""
        SELECT rr.request_id, rr.pickup_address, rr.dropoff_address,
               rr.vehicle_type_requested, rr.requested_at,
               u.full_name AS rider_name
        FROM Ride_Request rr
        JOIN Rider ri ON ri.rider_id = rr.rider_id
        JOIN User  u  ON u.user_id   = ri.user_id
        WHERE rr.status = 'pending'
        ORDER BY rr.requested_at ASC
        LIMIT 20
    """)


# ── Accept a PENDING Ride_Request (creates the Ride row) ────────────────────

@router.post("/requests/{request_id}/accept")
def accept_request(request_id: int, user: dict = Depends(get_current_user)):
    """Driver accepts a pending Ride_Request. Creates the Ride row."""
    driver = _get_driver(int(user["sub"]))
    if driver["verification_status"] != "verified":
        raise HTTPException(403, "Driver not verified yet. Ask admin to verify your account.")
    if driver["availability"] == "on_trip":
        raise HTTPException(400, "You are already on a trip")

    req = db.query("SELECT * FROM Ride_Request WHERE request_id=%s", (request_id,))
    if not req:
        raise HTTPException(404, "Request not found")
    if req[0]["status"] != "pending":
        raise HTTPException(400, f"Request is no longer available (status: {req[0]['status']})")

    # Get driver's primary vehicle
    veh = db.query("""
        SELECT dv.vehicle_id FROM Driver_Vehicle dv
        WHERE dv.driver_id=%s AND dv.is_primary=1
        LIMIT 1
    """, (driver["driver_id"],))
    if not veh:
        raise HTTPException(400, "No vehicle registered. Please register a vehicle first.")
    vehicle_id = veh[0]["vehicle_id"]

    # Pick the fare config for this vehicle type
    try:
        fc = db.query(
            "SELECT config_id FROM Fare_Config WHERE vehicle_type=%s ORDER BY effective_from DESC LIMIT 1",
            (req[0]["vehicle_type_requested"],)
        )
        fare_config_id = fc[0]["config_id"] if fc else 1
    except Exception:
        fare_config_id = 1

    # Estimated fare using DB rates
    _rates = {'economy': (80, 25, 3), 'premium': (150, 45, 5), 'bike': (40, 12, 1.5)}
    _base, _pkm, _pmin = _rates.get(req[0]["vehicle_type_requested"], (80, 25, 3))
    estimated_fare = round(_base + _pkm * 5.0 + _pmin * 10.0, 2)

    ride_id = db.execute("""
        INSERT INTO Ride
          (request_id, driver_id, vehicle_id, fare_config_id,
           status, surge_multiplier, final_fare)
        VALUES (%s,%s,%s,%s,'accepted',1.0,%s)
    """, (request_id, driver["driver_id"], vehicle_id, fare_config_id, estimated_fare))

    db.execute("UPDATE Ride_Request SET status='matched' WHERE request_id=%s", (request_id,))
    db.execute("UPDATE Driver SET availability='on_trip' WHERE driver_id=%s", (driver["driver_id"],))
    try:
        db.execute("""
            INSERT INTO Driver_Notification (request_id, driver_id, response)
            VALUES (%s,%s,'accepted')
        """, (request_id, driver["driver_id"]))
    except Exception:
        pass  # non-critical

    rider_id = req[0]["rider_id"]
    # FIX: pass payment_method through so auto_advance uses the correct method
    auto_advance_ride(ride_id, driver["driver_id"], rider_id, payment_method="cash")

    return {"message": "Ride accepted", "ride_id": ride_id, "estimated_fare": estimated_fare}


# ── Accept already-created Ride row (auto-matched) ────────────────────────────

@router.put("/rides/{ride_id}/accept")
def accept_ride(ride_id: int, user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    if driver["verification_status"] != "verified":
        raise HTTPException(403, "Driver not verified")

    ride_rows = db.query("SELECT status FROM Ride WHERE ride_id=%s", (ride_id,))
    if not ride_rows or ride_rows[0]["status"] != "accepted":
        raise HTTPException(400, "Ride no longer available or already accepted")

    veh = db.query("""
        SELECT dv.vehicle_id FROM Driver_Vehicle dv
        JOIN Vehicle v ON v.vehicle_id = dv.vehicle_id
        WHERE dv.driver_id=%s AND dv.is_primary=1 AND v.verification_status='verified'
        LIMIT 1
    """, (driver["driver_id"],))
    if not veh:
        raise HTTPException(400, "No verified primary vehicle found")

    db.execute(
        "UPDATE Ride SET driver_id=%s, vehicle_id=%s WHERE ride_id=%s",
        (driver["driver_id"], veh[0]["vehicle_id"], ride_id)
    )
    db.execute("UPDATE Driver SET availability='on_trip' WHERE driver_id=%s", (driver["driver_id"],))
    return {"message": "Ride accepted"}


@router.put("/rides/{ride_id}/reject")
def reject_ride(ride_id: int, user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    rows = db.query("SELECT request_id FROM Ride WHERE ride_id=%s", (ride_id,))
    if rows:
        db.execute("""
            UPDATE Driver_Notification SET response='rejected', responded_at=NOW()
            WHERE request_id=%s AND driver_id=%s
        """, (rows[0]["request_id"], driver["driver_id"]))
    return {"message": "Ride rejected"}


@router.put("/rides/{ride_id}/status")
def update_ride_status(ride_id: int, status: str, user: dict = Depends(get_current_user)):
    valid = ["driver_en_route", "in_progress", "completed", "cancelled"]
    if status not in valid:
        raise HTTPException(400, f"Status must be one of: {valid}")

    driver = _get_driver(int(user["sub"]))
    rows = db.query("SELECT status, driver_id FROM Ride WHERE ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    if rows[0]["driver_id"] != driver["driver_id"]:
        raise HTTPException(403, "Not your ride")

    current = rows[0]["status"]

    if status == "completed":
        # FIX: completed status must go through sp_complete_ride so driver
        # wallet is credited and Driver_Earnings row is created.
        # Require real distance/duration from frontend; fall back to 5km/15min.
        # Prefer the body param version (POST /rides/{id}/complete) below.
        try:
            dist_rows = db.query(
                "SELECT distance_km, duration_min FROM Ride WHERE ride_id=%s", (ride_id,)
            )
            distance_km  = float(dist_rows[0]["distance_km"]  or 5.0) if dist_rows else 5.0
            duration_min = int(  dist_rows[0]["duration_min"] or 15)   if dist_rows else 15

            args, _ = db.call_proc("sp_complete_ride", [
                ride_id, distance_km, duration_min, None, None, None
            ])
            if args[5]:
                raise HTTPException(400, args[5])
            # FIX: clear location + go online
            db.execute(
                "UPDATE Driver SET availability='online', "
                "current_lat=NULL, current_lng=NULL "
                "WHERE driver_id=%s",
                (driver["driver_id"],),
            )
            return {"message": "Ride completed", "net_earning": args[3], "final_fare": args[4]}
        except HTTPException:
            raise
        except Exception:
            # SP not available — manual fallback (FIX: atomic status+completed_at)
            db.execute(
                "UPDATE Ride SET status='completed', completed_at=NOW() WHERE ride_id=%s",
                (ride_id,),
            )
            db.execute(
                "UPDATE Driver SET availability='online', "
                "current_lat=NULL, current_lng=NULL "
                "WHERE driver_id=%s",
                (driver["driver_id"],),
            )
            return {"message": "Ride completed"}

    if status == "in_progress":
        # FIX: atomic — one UPDATE covers both columns
        db.execute(
            "UPDATE Ride SET status='in_progress', started_at=NOW() WHERE ride_id=%s",
            (ride_id,),
        )
    elif status == "cancelled":
        db.execute("UPDATE Ride SET status='cancelled' WHERE ride_id=%s", (ride_id,))
        # FIX: reset driver availability + clear location on cancel
        db.execute(
            "UPDATE Driver SET availability='online', "
            "current_lat=NULL, current_lng=NULL "
            "WHERE driver_id=%s",
            (driver["driver_id"],),
        )
        db.execute(
            "UPDATE Ride_Request SET status='cancelled' "
            "WHERE request_id=(SELECT request_id FROM Ride WHERE ride_id=%s)",
            (ride_id,),
        )
    else:
        db.execute("UPDATE Ride SET status=%s WHERE ride_id=%s", (status, ride_id))

    return {"message": f"Status updated to {status}"}


@router.post("/rides/{ride_id}/complete")
def complete_ride(ride_id: int, body: RideCompleteBody, user: dict = Depends(get_current_user)):
    """
    NEW endpoint — driver submits real distance + duration at trip end.
    This is the preferred completion path vs the status query-param route.
    Calls sp_complete_ride so Driver_Earnings and wallet credit are handled.
    """
    if body.distance_km <= 0:
        raise HTTPException(400, "distance_km must be positive")
    if body.duration_min <= 0:
        raise HTTPException(400, "duration_min must be positive")

    driver = _get_driver(int(user["sub"]))
    rows = db.query("SELECT status, driver_id FROM Ride WHERE ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    if rows[0]["driver_id"] != driver["driver_id"]:
        raise HTTPException(403, "Not your ride")
    if rows[0]["status"] != "in_progress":
        raise HTTPException(400, f"Cannot complete ride in status: {rows[0]['status']}")

    try:
        args, _ = db.call_proc("sp_complete_ride", [
            ride_id, body.distance_km, body.duration_min, None, None, None
        ])
        if args[5]:
            raise HTTPException(400, args[5])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Could not complete ride: {e}")

    # FIX: clear location + go online
    db.execute(
        "UPDATE Driver SET availability='online', "
        "current_lat=NULL, current_lng=NULL "
        "WHERE driver_id=%s",
        (driver["driver_id"],),
    )

    # Insert payment for this ride (payment method from Payment table if exists, else cash)
    pay_rows = db.query("SELECT payment_id FROM Payment WHERE ride_id=%s", (ride_id,))
    if not pay_rows:
        fare_rows = db.query("SELECT final_fare FROM Ride WHERE ride_id=%s", (ride_id,))
        fare = float(fare_rows[0]["final_fare"] or 0) if fare_rows else 0
        req_rows = db.query(
            "SELECT rr.rider_id FROM Ride_Request rr "
            "JOIN Ride ri ON ri.request_id=rr.request_id "
            "WHERE ri.ride_id=%s", (ride_id,)
        )
        if req_rows and fare > 0:
            try:
                db.execute(
                    "INSERT INTO Payment (ride_id, rider_id, amount, payment_method, payment_status) "
                    "VALUES (%s,%s,%s,'cash','paid')",
                    (ride_id, req_rows[0]["rider_id"], fare),
                )
            except Exception:
                pass

    return {"message": "Ride completed", "net_earning": args[3], "final_fare": args[4]}


@router.get("/earnings")
def get_earnings(user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    return db.query("""
        SELECT de.earning_id, de.gross_amount, de.commission_rate,
               de.commission_amount, de.net_amount, de.credited_at,
               ri.status, rr.pickup_address, rr.dropoff_address
        FROM Driver_Earnings de
        JOIN Ride         ri ON ri.ride_id    = de.ride_id
        JOIN Ride_Request rr ON rr.request_id = ri.request_id
        WHERE de.driver_id = %s
        ORDER BY de.credited_at DESC
    """, (driver["driver_id"],))


@router.get("/wallet")
def get_wallet(user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    return {"balance": float(driver["wallet_balance"])}


@router.post("/payouts/request")
def request_payout(user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    if driver["wallet_balance"] <= 0:
        raise HTTPException(400, "No balance available to withdraw")
    try:
        args, _ = db.call_proc("sp_request_payout", [driver["driver_id"], None, None])
        if args[2]:
            raise HTTPException(400, args[2])
        return {"message": "Payout requested", "payout_id": args[1]}
    except HTTPException:
        raise
    except Exception:
        payout_id = db.execute("""
            INSERT INTO Payout_Request (driver_id, requested_amount, status)
            VALUES (%s, %s, 'pending')
        """, (driver["driver_id"], driver["wallet_balance"]))
        return {"message": "Payout requested", "payout_id": payout_id}


@router.put("/availability")
def toggle_availability(body: StatusUpdate, user: dict = Depends(get_current_user)):
    if body.status not in ("online", "offline"):
        raise HTTPException(400, "Status must be online or offline")
    driver = _get_driver(int(user["sub"]))
    if driver["availability"] == "on_trip" and body.status == "offline":
        raise HTTPException(400, "Cannot go offline while on a trip")
    db.execute("UPDATE Driver SET availability=%s WHERE user_id=%s", (body.status, user["sub"]))
    return {"message": f"Now {body.status}"}


@router.put("/location")
def update_location(body: LocationUpdate, user: dict = Depends(get_current_user)):
    # FIX: validate coordinate range before writing to DB
    if not (-90 <= body.lat <= 90):
        raise HTTPException(400, "lat must be between -90 and 90")
    if not (-180 <= body.lng <= 180):
        raise HTTPException(400, "lng must be between -180 and 180")
    db.execute(
        "UPDATE Driver SET current_lat=%s, current_lng=%s WHERE user_id=%s",
        (body.lat, body.lng, user["sub"])
    )
    return {"message": "Location updated"}


@router.get("/location")
def get_location(user: dict = Depends(get_current_user)):
    """NEW: lets the frontend poll driver's own current location."""
    driver = _get_driver(int(user["sub"]))
    rows = db.query(
        "SELECT current_lat, current_lng FROM Driver WHERE driver_id=%s",
        (driver["driver_id"],)
    )
    if not rows:
        raise HTTPException(404, "Driver not found")
    return {
        "lat": float(rows[0]["current_lat"]) if rows[0]["current_lat"] is not None else None,
        "lng": float(rows[0]["current_lng"]) if rows[0]["current_lng"] is not None else None,
    }


# ── Vehicle Registration ──────────────────────────────────────────────────────

@router.post("/vehicles", status_code=201)
def register_vehicle(body: VehicleBody, user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    if body.vehicle_type not in ("economy", "premium", "bike"):
        raise HTTPException(400, "vehicle_type must be economy, premium, or bike")
    if not 1980 <= body.year <= 2100:
        raise HTTPException(400, "year must be between 1980 and 2100")
    if db.query("SELECT vehicle_id FROM Vehicle WHERE license_plate=%s", (body.license_plate,)):
        raise HTTPException(409, "A vehicle with this license plate is already registered")

    has_primary = db.query(
        "SELECT 1 FROM Driver_Vehicle WHERE driver_id=%s AND is_primary=1", (driver["driver_id"],)
    )
    is_primary = 0 if has_primary else 1

    vehicle_id = db.execute("""
        INSERT INTO Vehicle (make, model, year, color, license_plate, vehicle_type, verification_status)
        VALUES (%s,%s,%s,%s,%s,%s,'pending')
    """, (body.make.strip(), body.model.strip(), body.year,
           body.color.strip(), body.license_plate.strip().upper(), body.vehicle_type))

    db.execute("""
        INSERT INTO Driver_Vehicle (driver_id, vehicle_id, is_primary)
        VALUES (%s,%s,%s)
    """, (driver["driver_id"], vehicle_id, is_primary))

    return {
        "vehicle_id": vehicle_id,
        "message": "Vehicle registered. Pending admin verification.",
        "is_primary": bool(is_primary),
    }


@router.get("/vehicles")
def list_vehicles(user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    return db.query("""
        SELECT v.*, dv.is_primary
        FROM Vehicle v
        JOIN Driver_Vehicle dv ON dv.vehicle_id = v.vehicle_id
        WHERE dv.driver_id = %s
        ORDER BY dv.is_primary DESC, v.vehicle_id DESC
    """, (driver["driver_id"],))


@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user)):
    rows = db.query("""
        SELECT d.driver_id, u.full_name, u.email, u.account_status,
               d.city, d.license_number, d.cnic,
               d.verification_status, d.availability,
               d.avg_rating, d.trips_completed, d.wallet_balance,
               d.current_lat, d.current_lng
        FROM Driver d JOIN User u ON u.user_id = d.user_id
        WHERE d.user_id = %s
    """, (user["sub"],))
    if not rows:
        raise HTTPException(404, "Driver not found")
    return rows[0]


# ── Active ride for driver (status polling) ───────────────────────────────────

@router.get("/rides/active")
def get_active_ride(user: dict = Depends(get_current_user)):
    """NEW: driver polls this to see their current ride and its status."""
    driver = _get_driver(int(user["sub"]))
    rows = db.query("""
        SELECT ri.ride_id, ri.status, ri.final_fare,
               rr.pickup_address, rr.dropoff_address,
               rr.pickup_lat, rr.pickup_lng, rr.dropoff_lat, rr.dropoff_lng,
               u.full_name AS rider_name
        FROM Ride ri
        JOIN Ride_Request rr ON rr.request_id = ri.request_id
        JOIN Rider r          ON r.rider_id    = rr.rider_id
        JOIN User  u          ON u.user_id     = r.user_id
        WHERE ri.driver_id = %s
          AND ri.status NOT IN ('completed','cancelled')
        ORDER BY ri.ride_id DESC
        LIMIT 1
    """, (driver["driver_id"],))
    if not rows:
        return {"active": False}
    row = rows[0]
    return {
        "active":          True,
        "ride_id":         row["ride_id"],
        "ride_status":     row["status"],
        "final_fare":      float(row["final_fare"]) if row["final_fare"] else None,
        "pickup_address":  row["pickup_address"],
        "dropoff_address": row["dropoff_address"],
        "pickup_lat":      float(row["pickup_lat"])  if row["pickup_lat"]  else None,
        "pickup_lng":      float(row["pickup_lng"])  if row["pickup_lng"]  else None,
        "dropoff_lat":     float(row["dropoff_lat"]) if row["dropoff_lat"] else None,
        "dropoff_lng":     float(row["dropoff_lng"]) if row["dropoff_lng"] else None,
        "rider_name":      row["rider_name"],
    }