from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, admin, rider, driver, rides
from app import database as db

app = FastAPI(title="RideFlow API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,   prefix="/api/v1/auth",   tags=["Auth"])
app.include_router(admin.router,  prefix="/api/v1/admin",  tags=["Admin"])
app.include_router(rider.router,  prefix="/api/v1/rider",  tags=["Rider"])
app.include_router(driver.router, prefix="/api/v1/driver", tags=["Driver"])
# FIX: rides router was imported but never registered — /estimate was unreachable
app.include_router(rides.router,  prefix="/api/v1/rides",  tags=["Rides"])


@app.get("/")
def root():
    return {"message": "RideFlow API v2.1 is running"}


@app.get("/api/v1/rides/fare-estimate")
def fare_estimate(
    vehicle_type: str,
    distance_km: float,
    duration_min: int,
    promo_code: str = "",
):
    """
    Fare estimate endpoint (GET version — kept for backward compatibility).
    Prefer POST /api/v1/rides/estimate for new clients.
    """
    if distance_km <= 0:
        raise HTTPException(400, "distance_km must be positive")
    if duration_min <= 0:
        raise HTTPException(400, "duration_min must be positive")
    if vehicle_type not in ("economy", "premium", "bike"):
        raise HTTPException(400, "vehicle_type must be economy, premium, or bike")

    args, _ = db.call_proc("sp_calculate_fare", [
        vehicle_type,
        distance_km,
        duration_min,
        promo_code if promo_code else None,
        None, None, None, None, None, None,
    ])

    error = args[9]
    if error:
        raise HTTPException(400, error)

    return {
        "vehicle_type":    vehicle_type,
        "distance_km":     distance_km,
        "duration_min":    duration_min,
        "base_fare":       args[4],
        "surge_multiplier":args[5],
        "discount":        args[6],
        "final_fare":      args[7],
        "fare_config_id":  args[8],
    }