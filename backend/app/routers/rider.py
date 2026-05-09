from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import get_current_user
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

    # Use provided coords or fallback to 0,0 (address-only mode)
    plat = body.pickup_lat  or 0.0
    plng = body.pickup_lng  or 0.0
    dlat = body.dropoff_lat or 0.0
    dlng = body.dropoff_lng or 0.0

    # Estimate distance: if no real coords, use a default of 5 km so fare calc works
    if body.pickup_lat and body.dropoff_lat:
        distance = _haversine(plat, plng, dlat, dlng)
    else:
        distance = 5.0   # default estimate when no GPS provided

    duration_min = max(1, int(distance / 0.5))  # ~30 km/h estimate

    if body.vehicle_type not in ("economy", "premium", "bike"):
        raise HTTPException(400, "vehicle_type must be economy, premium, or bike")

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
    """, (rider_id, plat, plng, body.pickup_address,
          dlat, dlng, body.dropoff_address,
          body.vehicle_type, body.scheduled_at))

    # Try to find nearest available driver (only when real coords given)
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
                key=lambda d: _haversine(plat, plng, d["current_lat"], d["current_lng"])
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

        db.execute("""
            INSERT INTO Driver_Notification (request_id, driver_id, response)
            VALUES (%s,%s,'accepted')
        """, (request_id, matched_driver["driver_id"]))

        return {"ride_id": ride_id, "request_id": request_id,
                "status": "accepted", "final_fare": final_fare,
                "estimated_fare": final_fare}
    else:
        return {"ride_id": None, "request_id": request_id,
                "status": "pending", "final_fare": final_fare,
                "estimated_fare": final_fare,
                "message": "No drivers available nearby. Your request is queued."}


@router.get("/rides/history")
def ride_history(user: dict = Depends(get_current_user)):
    rider_id = _get_rider_id(int(user["sub"]))
    return db.query("""
        SELECT rr.request_id, rr.pickup_address, rr.dropoff_address,
               rr.vehicle_type_requested, rr.status AS request_status,
               rr.requested_at,
               ri.ride_id, ri.status, ri.final_fare AS fare,
               CONCAT(u.full_name) AS driver_name
        FROM Ride_Request rr
        LEFT JOIN Ride   ri ON ri.request_id = rr.request_id
        LEFT JOIN Driver d  ON d.driver_id   = ri.driver_id
        LEFT JOIN User   u  ON u.user_id     = d.user_id
        WHERE rr.rider_id = %s
        ORDER BY rr.requested_at DESC
    """, (rider_id,))


@router.get("/rides/{ride_id}")
def get_ride(ride_id: int, user: dict = Depends(get_current_user)):
    rows = db.query("SELECT * FROM vw_ride_summary WHERE ride_id=%s", (ride_id,))
    if not rows:
        raise HTTPException(404, "Ride not found")
    return rows[0]


@router.post("/rides/{ride_id}/cancel")
def cancel_ride(ride_id: int, user: dict = Depends(get_current_user)):
    rows = db.query(
        "SELECT ri.status, rr.rider_id FROM Ride ri JOIN Ride_Request rr ON rr.request_id=ri.request_id WHERE ri.ride_id=%s",
        (ride_id,)
    )
    if not rows:
        raise HTTPException(404, "Ride not found")
    rider_id = _get_rider_id(int(user["sub"]))
    if rows[0]["rider_id"] != rider_id:
        raise HTTPException(403, "Not your ride")
    if rows[0]["status"] not in ("accepted",):
        raise HTTPException(400, f"Cannot cancel ride in status: {rows[0]['status']}")
    db.execute("UPDATE Ride SET status='cancelled' WHERE ride_id=%s", (ride_id,))
    db.execute(
        "UPDATE Ride_Request SET status='cancelled' WHERE request_id=(SELECT request_id FROM Ride WHERE ride_id=%s)",
        (ride_id,)
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
    db.execute("""
        INSERT INTO Rating (ride_id, rated_by, rater_id, ratee_id, score, comment)
        VALUES (%s,'rider',%s,%s,%s,%s)
    """, (ride_id, int(user["sub"]), ratee_user_id, body.score, body.comment))
    return {"message": "Rating submitted"}


@router.get("/wallet")
def get_wallet(user: dict = Depends(get_current_user)):
    # Riders don't have a wallet table row — return 0 for now
    return {"balance": 0.0}


@router.post("/wallet/topup")
def topup_wallet(body: TopUpBody, user: dict = Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    return {"message": "Top-up recorded", "amount": body.amount}


@router.get("/promos/check")
def check_promo(code: str):
    rows = db.query("SELECT * FROM vw_active_promos WHERE code=%s", (code,))
    if not rows:
        raise HTTPException(404, "Promo code invalid or expired")
    return rows[0]
