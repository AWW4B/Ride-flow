from fastapi import APIRouter, Depends

router = APIRouter()

# ============================================================
# app/routers/driver.py — Driver Portal Routes
# ============================================================
#
# TODO 1: Implement GET /dashboard
# @router.get("/dashboard")
# async def get_dashboard(current_user = Depends(get_current_user)):
#     # Return KPI stats: active_ride, rating, trips_completed, wallet_balance.
#     pass
#
# TODO 2: Implement GET /requests (Incoming Ride Requests)
# @router.get("/requests")
# async def get_requests(current_user = Depends(get_current_user)):
#     # Fetch active `Driver_Notification` for this driver where status='pending'.
#     # Join with `Ride_Request` to get pickup/dropoff and estimated fare.
#     pass
#
# TODO 3: Implement GET /trips (Trip History)
# @router.get("/trips")
# async def get_trips(current_user = Depends(get_current_user)):
#     # Select from `vw_driver_earnings_summary` or `Ride` table.
#     pass
#
# TODO 4: Implement GET /earnings
# @router.get("/earnings")
# async def get_earnings(current_user = Depends(get_current_user)):
#     # Select from `Driver_Earnings` grouped by day/week.
#     pass
#
# TODO 5: Implement POST /payouts
# @router.post("/payouts")
# async def request_payout(req: PayoutReq, current_user = Depends(get_current_user)):
#     # Call `sp_request_payout`.
#     pass
#
# TODO 6: Implement PUT /location (GPS Tracking)
# @router.put("/location")
# async def update_location(req: LocationReq, current_user = Depends(get_current_user)):
#     # Update Redis with TTL of 60s.
#     # Optionally batch flush to MySQL `Driver.current_lat` & `current_lng`.
#     # Emit to 'admin' via WebSocket.
#     pass
