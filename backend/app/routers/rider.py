from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import get_current_user
from app.utils.ride_lifecycle import auto_advance_ride
import math

router = APIRouter()


class RideRequest(BaseModel):
    pickup_address:  str
    dropoff_address: str
    vehicle_type:    str
    pickup_lat:      Optional[float] = None
    pickup_lng:      Optional[float] = None
    dropoff_lat:     Optional[float] = None
    dropoff_lng:     Optional[float] = None
    promo_code:      Optional[str] = None
    scheduled_at:    Optional[str] = None
    payment_method:  Optional[str] = "cash"   # NEW: rider chooses payment method

class RatingBody(BaseModel):
    score:   int
    comment: Optional[str] = None

class TopUpBody(BaseModel):
    amount:         float
    payment_method: str


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _get_rider_id(user_id: int) -> int:
    rows = db.query("SELECT rider_id FROM Rider WHERE user_id=%s", (user_id,))
    if not rows:
        raise HTTPException(404, "Rider profile not found")
    return rows[0]["rider_id"]


def _base_fare(vehicle_type: str, distance_km: float, duration_min: int) -> float:
    """Fallback fare calculation when the stored procedure fails."""
    rates = {
        "economy": (80, 25, 3),
        "premium": (150, 45, 5),
        "bike":    (40,  12, 1.5),
    }
    base, per_km, per_min = rates.get(vehicle_type, (80, 25, 3))
    return round(base + per_km * distance_km + per_min * duration_min, 2)


@router.post("/rides/request", status_code=201)
def request_ride(body: RideRequest, user: dict = Depends(get_current_user)):
    if user["role"] != "rider":
        raise HTTPException(403, "Only riders can request rides")

    if body.vehicle_type not in ("economy", "premium", "bike"):
        raise HTTPException(400, "vehicle_type must be economy, premium, or bike")

    if not body.pickup_address.strip():
        raise HTTPException(400, "pickup_address is required")
    if not body.dropoff_address.strip():
        raise HTTPException(400, "dropoff_address is required")

    # FIX: validate payment method before anything else
    valid_payment = {"cash", "wallet", "card"}
    payment_method = body.payment_method if body.payment_method in valid_payment else "cash"

    rider_id = _get_rider_id(int(user["sub"]))

    # Coordinates
    plat = body.pickup_lat  if body.pickup_lat  is not None else 0.0001
    plng = body.pickup_lng  if body.pickup_lng  is not None else 0.0001
    dlat = body.dropoff_lat if body.dropoff_lat is not None else 0.0
    dlng = body.dropoff_lng if body.dropoff_lng is not None else 0.0

    # Distance estimate
    if body.pickup_lat and body.dropoff_lat:
        distance = _haversine(plat, plng, dlat, dlng)
        distance = max(distance, 1.0)
    else:
        distance = 5.0

    duration_min = max(1, int(distance / 0.5))

    # ── Fare calculation ─────────────────────────────────────────────────────
    final_fare     = None
    fare_config_id = 1
    surge_mult     = 1.0

    try:
        fc_rows = db.query(
            "SELECT config_id FROM Fare_Config WHERE vehicle_type=%s ORDER BY effective_from DESC LIMIT 1",
            (body.vehicle_type,)
        )
        if fc_rows:
            fare_config_id = fc_rows[0]["config_id"]
    except Exception:
        pass

    try:
        args, _ = db.call_proc("sp_calculate_fare", [
            body.vehicle_type, round(distance, 2), duration_min,
            body.promo_code or None,
            None, None, None, None, None, None
        ])
        sp_error = args[9] if len(args) > 9 else None
        if not sp_error:
            final_fare     = float(args[7]) if len(args) > 7 and args[7] is not None else None
            fare_config_id = int(args[8])   if len(args) > 8 and args[8] is not None else fare_config_id
            surge_mult     = float(args[5]) if len(args) > 5 and args[5] is not None else 1.0
    except Exception:
        pass

    if final_fare is None:
        final_fare = _base_fare(body.vehicle_type, distance, duration_min)

    # ── Insert Ride_Request ───────────────────────────────────────────────────
    request_id = db.execute("""
        INSERT INTO Ride_Request
          (rider_id, pickup_lat, pickup_lng, pickup_address,
           dropoff_lat, dropoff_lng, dropoff_address,
           vehicle_type_requested, scheduled_time, status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending')
    """, (rider_id, plat, plng, body.pickup_address.strip(),
          dlat, dlng, body.dropoff_address.strip(),
          body.vehicle_type, body.scheduled_at))

    # ── Try to match a driver automatically (GPS-based) ──────────────────────
    matched_driver = None
    if body.pickup_lat:
        drivers = db.query("""
            SELECT ad.driver_id, ad.current_lat, ad.current_lng, ad.vehicle_id
            FROM vw_active_drivers ad
            WHERE ad.vehicle_id IS NOT NULL
              AND ad.current_lat IS NOT NULL
        """)
        if drivers:
            matched_driver = min(
                drivers,
                key=lambda d: _haversine(plat, plng,
                                         float(d["current_lat"]),
                                         float(d["current_lng"]))
            )

    ride_id = None
    if matched_driver:
        ride_id = db.execute("""
            INSERT INTO Ride
              (request_id, driver_id, vehicle_id, fare_config_id,
               status, surge_multiplier, final_fare)
            VALUES (%s,%s,%s,%s,'accepted',%s,%s)
        """, (request_id,
              matched_driver["driver_id"],
              matched_driver["vehicle_id"],
              fare_config_id,
              surge_mult,
              final_fare))

        db.execute("UPDATE Ride_Request SET status='matched' WHERE request_id=%s", (request_id,))
        db.execute("UPDATE Driver SET availability='on_trip' WHERE driver_id=%s",
                   (matched_driver["driver_id"],))
        try:
            db.execute("""
                INSERT INTO Driver_Notification (request_id, driver_id, response)
                VALUES (%s,%s,'accepted')
            """, (request_id, matched_driver["driver_id"]))
        except Exception:
            pass

        # FIX: pass payment_method to auto_advance so Payment row uses the right method
        auto_advance_ride(ride_id, matched_driver["driver_id"], rider_id,
                          payment_method=payment_method)

        status_msg = "accepted"
    else:
        status_msg = "pending"

    return {
        "ride_id":        ride_id,
        "request_id":     request_id,
        "status":         status_msg,
        "estimated_fare": final_fare,
        "payment_method": payment_method,
        "message": (
            "Driver matched and en route!"
            if matched_driver
            else "Request saved. Waiting for a driver to accept."
        ),
    }


@router.get("/rides/active")
def get_active_ride(user: dict = Depends(get_current_user)):
    """Poll endpoint — returns the rider's current live ride or pending request."""
    rider_id = _get_rider_id(int(user["sub"]))
    rows = db.query("""
        SELECT
            rr.request_id, rr.pickup_address, rr.dropoff_address,
            rr.vehicle_type_requested, rr.status  AS request_status,
            ri.ride_id,     ri.status             AS ride_status,
            ri.final_fare,
            u.full_name AS driver_name, d.avg_rating AS driver_rating,
            d.current_lat AS driver_lat, d.current_lng AS driver_lng
        FROM Ride_Request rr
        LEFT JOIN Ride   ri ON ri.request_id = rr.request_id
        LEFT JOIN Driver d  ON d.driver_id   = ri.driver_id
        LEFT JOIN `User` u  ON u.user_id     = d.user_id
        WHERE rr.rider_id = %s
          AND rr.status != 'cancelled'
          AND (ri.ride_id IS NULL OR ri.status != 'cancelled')
        ORDER BY rr.requested_at DESC
        LIMIT 1
    """, (rider_id,))
    if not rows:
        return {"active": False}
    row = rows[0]
    return {
        "active":          True,
        "request_id":      row["request_id"],
        "ride_id":         row["ride_id"],
        "pickup_address":  row["pickup_address"],
        "dropoff_address": row["dropoff_address"],
        "vehicle_type":    row["vehicle_type_requested"],
        "request_status":  row["request_status"],
        "ride_status":     row["ride_status"],
        "final_fare":      float(row["final_fare"]) if row["final_fare"] is not None else None,
        "driver_name":     row["driver_name"],
        "driver_rating":   float(row["driver_rating"]) if row["driver_rating"] else None,
        # FIX: expose driver coordinates so rider can see driver moving on map
        "driver_lat":      float(row["driver_lat"]) if row["driver_lat"] else None,
        "driver_lng":      float(row["driver_lng"]) if row["driver_lng"] else None,
    }


@router.get("/rides/history")
def ride_history(user: dict = Depends(get_current_user)):
    rider_id = _get_rider_id(int(user["sub"]))
    return db.query("""
        SELECT
            rr.request_id,
            rr.pickup_address,
            rr.dropoff_address,
            rr.vehicle_type_requested,
            rr.status         AS request_status,
            rr.requested_at,
            ri.ride_id,
            ri.status,
            ri.final_fare     AS fare,
            ri.distance_km,
            ri.duration_min,
            u.full_name       AS driver_name,
            p.payment_method,
            p.payment_status
        FROM Ride_Request rr
        LEFT JOIN Ride    ri ON ri.request_id = rr.request_id
        LEFT JOIN Driver  d  ON d.driver_id   = ri.driver_id
        LEFT JOIN `User`  u  ON u.user_id     = d.user_id
        LEFT JOIN Payment p  ON p.ride_id     = ri.ride_id
        WHERE rr.rider_id = %s
        ORDER BY rr.requested_at DESC
    """, (rider_id,))


@router.get("/rides/{ride_id}")
def get_ride(ride_id: int, user: dict = Depends(get_current_user)):
    rows = db.query("SELECT * FROM vw_ride_summary WHERE ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    return rows[0]


@router.post("/requests/{request_id}/cancel")
def cancel_request(request_id: int, user: dict = Depends(get_current_user)):
    """Cancel a ride request (no Ride row yet — still pending)."""
    rider_id = _get_rider_id(int(user["sub"]))
    rows = db.query("SELECT status, rider_id FROM Ride_Request WHERE request_id=%s", (request_id,))
    if not rows:
        raise HTTPException(404, "Request not found")
    if rows[0]["rider_id"] != rider_id:
        raise HTTPException(403, "Not your request")
    if rows[0]["status"] not in ("pending",):
        raise HTTPException(400, f"Cannot cancel request in status: {rows[0]['status']}")
    db.execute("UPDATE Ride_Request SET status='cancelled' WHERE request_id=%s", (request_id,))
    return {"message": "Request cancelled"}


@router.post("/rides/{ride_id}/cancel")
def cancel_ride(ride_id: int, user: dict = Depends(get_current_user)):
    """Cancel an accepted Ride."""
    rows = db.query(
        "SELECT ri.status, rr.rider_id, ri.driver_id FROM Ride ri "
        "JOIN Ride_Request rr ON rr.request_id=ri.request_id "
        "WHERE ri.ride_id=%s", (ride_id,)
    )
    if not rows:
        raise HTTPException(404, "Ride not found")
    rider_id = _get_rider_id(int(user["sub"]))
    if rows[0]["rider_id"] != rider_id:
        raise HTTPException(403, "Not your ride")
    if rows[0]["status"] not in ("accepted", "driver_en_route"):
        raise HTTPException(400, f"Cannot cancel ride in status: {rows[0]['status']}")

    db.execute("UPDATE Ride SET status='cancelled' WHERE ride_id=%s", (ride_id,))
    db.execute(
        "UPDATE Ride_Request SET status='cancelled' "
        "WHERE request_id=(SELECT request_id FROM Ride WHERE ride_id=%s)", (ride_id,)
    )
    # FIX: free the driver when rider cancels
    if rows[0]["driver_id"]:
        db.execute(
            "UPDATE Driver SET availability='online', "
            "current_lat=NULL, current_lng=NULL "
            "WHERE driver_id=%s",
            (rows[0]["driver_id"],),
        )
    return {"message": "Ride cancelled"}


@router.post("/rides/{ride_id}/rate")
def rate_driver(ride_id: int, body: RatingBody, user: dict = Depends(get_current_user)):
    if not 1 <= body.score <= 5:
        raise HTTPException(400, "Score must be 1-5")
    rows = db.query("SELECT ri.driver_id, ri.status FROM Ride ri WHERE ri.ride_id=%s", (ride_id,))
    if not rows or rows[0]["status"] != "completed":
        raise HTTPException(400, "Ride not completed or not found")
    driver_row = db.query("SELECT user_id FROM Driver WHERE driver_id=%s", (rows[0]["driver_id"],))
    ratee_user_id = driver_row[0]["user_id"]
    rater_user_id = int(user["sub"])
    if rater_user_id == ratee_user_id:
        raise HTTPException(400, "You cannot rate yourself")
    dup = db.query(
        "SELECT rating_id FROM Rating WHERE ride_id=%s AND rated_by='rider' AND rater_id=%s",
        (ride_id, rater_user_id)
    )
    if dup:
        raise HTTPException(409, "You already rated this ride")
    db.execute("""
        INSERT INTO Rating (ride_id, rated_by, rater_id, ratee_id, score, comment)
        VALUES (%s,'rider',%s,%s,%s,%s)
    """, (ride_id, rater_user_id, ratee_user_id, body.score, body.comment))
    return {"message": "Rating submitted"}


@router.get("/wallet")
def get_wallet(user: dict = Depends(get_current_user)):
    # Rider wallet excluded from this iteration per project spec
    return {"balance": 0.0}


@router.post("/wallet/topup")
def topup_wallet(body: TopUpBody, user: dict = Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    return {"message": "Top-up recorded", "amount": body.amount}


@router.get("/promos/active")
def get_active_promos():
    """Public endpoint — returns active promo codes for the booking page."""
    return db.query("""
        SELECT code, discount_type, discount_value, valid_from, valid_to, usage_limit, times_used
        FROM Promo_Code
        WHERE valid_from <= CURDATE()
          AND valid_to   >= CURDATE()
          AND (usage_limit IS NULL OR times_used < usage_limit)
        ORDER BY promo_id DESC
        LIMIT 20
    """)


@router.get("/promos/check")
def check_promo(code: str):
    rows = db.query("SELECT * FROM vw_active_promos WHERE code=%s", (code,))
    if not rows:
        raise HTTPException(404, "Promo code invalid or expired")
    return rows[0]