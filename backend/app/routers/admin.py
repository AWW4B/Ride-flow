from fastapi import APIRouter, Depends

router = APIRouter()

# ============================================================
# app/routers/admin.py — Admin Portal Routes
# ============================================================
#
# TODO 1: Implement GET /dashboard
# @router.get("/dashboard")
# async def get_dashboard(current_user = Depends(get_current_user)):
#     # Return aggregated stats: total rides, active drivers, gross revenue.
#     # Select from `vw_platform_revenue`.
#     pass
#
# TODO 2: Implement GET /rides/active
# @router.get("/rides/active")
# async def get_active_rides(current_user = Depends(get_current_user)):
#     # Select from `vw_active_rides`.
#     pass
#
# TODO 3: Implement GET /drivers
# @router.get("/drivers")
# async def get_drivers(current_user = Depends(get_current_user)):
#     # Select from `vw_driver_leaderboard_by_city`.
#     pass
#
# TODO 4: Implement POST /drivers/{id}/verify
# @router.post("/drivers/{driver_id}/verify")
# async def verify_driver(driver_id: int, req: VerifyReq, current_user = Depends(get_current_user)):
#     # Call `sp_verify_driver`.
#     pass
#
# TODO 5: Implement GET /payments/revenue
# @router.get("/payments/revenue")
# async def get_revenue_report(date_from: str, date_to: str, current_user = Depends(get_current_user)):
#     # Call `sp_revenue_report`.
#     pass
#
# TODO 6: Implement GET /settings/fare-config
# @router.get("/settings/fare-config")
# async def get_fare_config(current_user = Depends(get_current_user)):
#     # Select from `Fare_Config` where effective_to IS NULL.
#     pass
#
# TODO 7: Implement POST /settings/fare-config
# @router.post("/settings/fare-config")
# async def update_fare_config(req: FareConfigReq, current_user = Depends(get_current_user)):
#     # Update current config to set effective_to = NOW().
#     # Insert new config with effective_from = NOW().
#     pass
