from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app import database as db
from app.utils.security import get_current_user

router = APIRouter()


class EstimateRequest(BaseModel):
    vehicle_type: str
    distance_km:  float
    duration_min: int
    promo_code:   str = ""


@router.post("/estimate")
def estimate_fare(body: EstimateRequest):
    """
    Fare estimation endpoint.
    Calls sp_calculate_fare and returns a full breakdown.
    """
    if body.distance_km <= 0:
        raise HTTPException(400, "distance_km must be positive")
    if body.duration_min <= 0:
        raise HTTPException(400, "duration_min must be positive")
    if body.vehicle_type not in ("economy", "premium", "bike"):
        raise HTTPException(400, "vehicle_type must be economy, premium, or bike")

    args, _ = db.call_proc("sp_calculate_fare", [
        body.vehicle_type,
        body.distance_km,
        body.duration_min,
        body.promo_code if body.promo_code else None,
        None, None, None, None, None, None,
    ])
    error = args[9]
    if error:
        raise HTTPException(400, error)

    return {
        "vehicle_type":    body.vehicle_type,
        "distance_km":     body.distance_km,
        "duration_min":    body.duration_min,
        "base_fare":       args[4],
        "surge_multiplier":args[5],
        "discount":        args[6],
        "final_fare":      args[7],
        "fare_config_id":  args[8],
    }