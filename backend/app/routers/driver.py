from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import get_current_user, require_role

router = APIRouter()


class LocationUpdate(BaseModel):
    lat: float
    lng: float

class StatusUpdate(BaseModel):
    status: str


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
    # Get request_id for this ride
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

    if status == "completed":
        # Use stored procedure for atomic completion
        args, _ = db.call_proc("sp_complete_ride", [
            ride_id, 5.0, 15, None, None, None  # distance/duration defaults; OUT params
        ])
        if args[5]:  # p_error
            raise HTTPException(400, args[5])
        db.execute("UPDATE Driver SET availability='online' WHERE driver_id=%s", (driver["driver_id"],))
        return {"message": "Ride completed", "net_earning": args[3], "final_fare": args[4]}

    db.execute("UPDATE Ride SET status=%s WHERE ride_id=%s", (status, ride_id))

    if status == "in_progress":
        db.execute("UPDATE Ride SET started_at=NOW() WHERE ride_id=%s", (ride_id,))
    elif status == "cancelled":
        db.execute("UPDATE Driver SET availability='online' WHERE driver_id=%s", (driver["driver_id"],))
        db.execute("UPDATE Ride_Request SET status='cancelled' WHERE request_id=(SELECT request_id FROM Ride WHERE ride_id=%s)", (ride_id,))

    return {"message": f"Status updated to {status}"}


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
    return {"balance": driver["wallet_balance"]}


@router.post("/payouts/request")
def request_payout(user: dict = Depends(get_current_user)):
    driver = _get_driver(int(user["sub"]))
    args, _ = db.call_proc("sp_request_payout", [driver["driver_id"], None, None])
    if args[2]:
        raise HTTPException(400, args[2])
    return {"message": "Payout requested", "payout_id": args[1]}


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
    db.execute(
        "UPDATE Driver SET current_lat=%s, current_lng=%s WHERE user_id=%s",
        (body.lat, body.lng, user["sub"])
    )
    return {"message": "Location updated"}


@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user)):
    rows = db.query("""
        SELECT d.driver_id, u.full_name, u.email, u.account_status,
               d.city, d.license_number, d.cnic,
               d.verification_status, d.availability,
               d.avg_rating, d.trips_completed, d.wallet_balance
        FROM Driver d JOIN User u ON u.user_id = d.user_id
        WHERE d.user_id = %s
    """, (user["sub"],))
    if not rows:
        raise HTTPException(404, "Driver not found")
    return rows[0]
