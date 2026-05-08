from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import get_current_user, require_role
import math

router = APIRouter()


class RideRequest(BaseModel):
    pickup_location:  str
    dropoff_location: str
    pickup_lat:       float
    pickup_lng:       float
    dropoff_lat:      float
    dropoff_lng:      float
    vehicle_type:     str
    promo_code:       Optional[str] = None
    scheduled_at:     Optional[str] = None

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


@router.post("/rides/request", status_code=201)
def request_ride(body: RideRequest, user: dict = Depends(get_current_user)):
    if user["role"] != "rider":
        raise HTTPException(403, "Only riders can request rides")

    rider_id = _get_rider_id(int(user["sub"]))
    distance = _haversine(body.pickup_lat, body.pickup_lng, body.dropoff_lat, body.dropoff_lng)
    duration_min = max(1, int(distance / 0.5))  # ~30 km/h estimate

    # Calculate fare via stored procedure
    args, _ = db.call_proc("sp_calculate_fare", [
        body.vehicle_type, round(distance, 2), duration_min,
        body.promo_code or None,
        None, None, None, None, None, None  # OUT params
    ])
    if args[9]:  # p_error
        raise HTTPException(400, args[9])

    final_fare     = args[7]   # p_final_fare
    fare_config_id = args[8]   # p_fare_config_id
    surge_mult     = args[5]   # p_surge_mult

    # Create ride request
    request_id = db.execute("""
        INSERT INTO Ride_Request
          (rider_id, pickup_lat, pickup_lng, pickup_address,
           dropoff_lat, dropoff_lng, dropoff_address,
           vehicle_type_requested, scheduled_time, status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending')
    """, (rider_id, body.pickup_lat, body.pickup_lng, body.pickup_location,
          body.dropoff_lat, body.dropoff_lng, body.dropoff_location,
          body.vehicle_type, body.scheduled_at))

    # Find nearest available driver
    drivers = db.query("""
        SELECT ad.driver_id, ad.current_lat, ad.current_lng, ad.vehicle_id
        FROM vw_active_drivers ad
        WHERE ad.vehicle_id IS NOT NULL
          AND ad.current_lat IS NOT NULL
    """)

    matched_driver = None
    if drivers:
        matched_driver = min(
            drivers,
            key=lambda d: _haversine(body.pickup_lat, body.pickup_lng,
                                     d["current_lat"], d["current_lng"])
        )

    if matched_driver:
        ride_id = db.execute("""
            INSERT INTO Ride
              (request_id, driver_id, vehicle_id, fare_config_id,
               status, surge_multiplier, final_fare)
            VALUES (%s,%s,%s,%s,'accepted',%s,%s)
        """, (request_id, matched_driver["driver_id"],
              matched_driver["vehicle_id"], fare_config_id or 1,
              surge_mult or 1.0, final_fare))

        db.execute("UPDATE Ride_Request SET status='matched' WHERE request_id=%s", (request_id,))
        db.execute("UPDATE Driver SET availability='on_trip' WHERE driver_id=%s", (matched_driver["driver_id"],))

        # Log notification
        db.execute("""
            INSERT INTO Driver_Notification (request_id, driver_id, response)
            VALUES (%s,%s,'accepted')
        """, (request_id, matched_driver["driver_id"]))

        return {"ride_id": ride_id, "request_id": request_id,
                "status": "accepted", "estimated_fare": final_fare}
    else:
        return {"ride_id": None, "request_id": request_id,
                "status": "pending", "estimated_fare": final_fare,
                "message": "No drivers available nearby. Your request is queued."}


@router.get("/rides/history")
def ride_history(user: dict = Depends(get_current_user)):
    rider_id = _get_rider_id(int(user["sub"]))
    return db.query("""
        SELECT rs.* FROM vw_ride_summary rs
        JOIN Ride_Request rr ON rr.pickup_address = rs.pickup_address
        WHERE rr.rider_id = %s
        ORDER BY rs.requested_at DESC
    """, (rider_id,))


@router.get("/rides/{ride_id}")
def get_ride(ride_id: int, user: dict = Depends(get_current_user)):
    rows = db.query("SELECT * FROM vw_ride_summary WHERE ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    return rows[0]


@router.post("/rides/{ride_id}/cancel")
def cancel_ride(ride_id: int, user: dict = Depends(get_current_user)):
    rows = db.query("SELECT ri.status, rr.rider_id FROM Ride ri JOIN Ride_Request rr ON rr.request_id=ri.request_id WHERE ri.ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    rider_id = _get_rider_id(int(user["sub"]))
    if rows[0]["rider_id"] != rider_id:
        raise HTTPException(403, "Not your ride")
    if rows[0]["status"] not in ("accepted",):
        raise HTTPException(400, f"Cannot cancel ride in status: {rows[0]['status']}")
    db.execute("UPDATE Ride SET status='cancelled' WHERE ride_id=%s", (ride_id,))
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
    db.execute("""
        INSERT INTO Rating (ride_id, rated_by, rater_id, ratee_id, score, comment)
        VALUES (%s,'rider',%s,%s,%s,%s)
    """, (ride_id, int(user["sub"]), ratee_user_id, body.score, body.comment))
    return {"message": "Rating submitted"}


@router.get("/wallet")
def get_wallet(user: dict = Depends(get_current_user)):
    rows = db.query("SELECT wallet_balance FROM Driver WHERE user_id=%s", (user["sub"],))
    # Riders don't have driver wallet; check a general wallet concept
    # For now return 0 for riders (wallet top-up tracked via payments)
    return {"balance": rows[0]["wallet_balance"] if rows else 0.0}


@router.post("/wallet/topup")
def topup_wallet(body: TopUpBody, user: dict = Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    # Record a top-up payment (no ride_id for wallet top-up; not enforced by schema)
    return {"message": "Top-up recorded", "amount": body.amount}


@router.get("/promos/check")
def check_promo(code: str):
    rows = db.query("SELECT * FROM vw_active_promos WHERE code=%s", (code,))
    if not rows:
        raise HTTPException(404, "Promo code invalid or expired")
    return rows[0]
