from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, admin, rider, driver
from app import database as db

app = FastAPI(title="RideFlow API", version="2.0.0")

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


@app.get("/")
def root():
    return {"message": "RideFlow API v2 is running"}


@app.get("/api/v1/rides/fare-estimate")
def fare_estimate(
    vehicle_type: str,
    distance_km: float,
    duration_min: int,
    promo_code: str = "",
):
    """
    Fare estimate endpoint used by both rider booking and admin views.
    Calls sp_calculate_fare stored procedure.
    SP OUT params order: [4]=base_fare [5]=surge_mult [6]=discount
                         [7]=final_fare [8]=fare_config_id [9]=error
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
        None, None, None, None, None, None,  # OUT params: base_fare, surge_mult, discount, final_fare, fare_config_id, error
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
