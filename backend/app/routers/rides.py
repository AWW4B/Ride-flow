from fastapi import APIRouter, Depends

router = APIRouter()

# ============================================================
# app/routers/rides.py — Ride Lifecycle Routes
# ============================================================
#
# TODO 1: Implement Fare Estimation (POST /estimate)
# @router.post("/estimate")
# async def estimate_fare(req: EstimateRequest):
#     # Call stored procedure `sp_calculate_fare`.
#     # In database.py: call_proc('sp_calculate_fare', (req.vehicle_type, req.distance_km, req.duration_min, req.promo_code))
#     # Return base_fare, surge_mult, promo_disc, final_fare.
#     pass
#
# TODO 2: Implement Request a Ride (POST /request)
# @router.post("/request")
# async def request_ride(req: RideRequest, current_user = Depends(get_current_user)):
#     # Ensure role == 'rider'
#     # Call `sp_submit_ride_request`.
#     # Get `request_id`.
#     # Trigger background task or call `sp_find_nearest_driver` to start matching.
#     # Broadcast via websocket to matched driver.
#     pass
#
# TODO 3: Implement Driver Accept/Decline (POST /{id}/accept)
# @router.post("/{request_id}/accept")
# async def accept_ride(request_id: int, current_user = Depends(get_current_user)):
#     # Ensure role == 'driver'
#     # Update `Driver_Notification` status to 'accepted'.
#     # Insert into `Ride` table.
#     # Broadcast success to Rider via websocket.
#     pass
#
# TODO 4: Implement Complete Ride (POST /{id}/complete)
# @router.post("/{ride_id}/complete")
# async def complete_ride(ride_id: int, req: CompleteRideReq, current_user = Depends(get_current_user)):
#     # Ensure role == 'driver'
#     # Call `sp_complete_ride`.
#     # Return final fare and net earnings.
#     pass
#
# TODO 5: Implement Cancel Ride (POST /{id}/cancel)
# @router.post("/{ride_id}/cancel")
# async def cancel_ride(ride_id: int, req: CancelRideReq, current_user = Depends(get_current_user)):
#     # Call `sp_cancel_ride`.
#     pass
