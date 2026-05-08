from fastapi import APIRouter, Depends

router = APIRouter()

# ============================================================
# app/routers/rider.py — Rider Portal Routes
# ============================================================
#
# TODO 1: Implement GET /dashboard
# @router.get("/dashboard")
# async def get_dashboard(current_user = Depends(get_current_user)):
#     # Return active ride status (if any), last trip, promo codes available.
#     pass
#
# TODO 2: Implement GET /trips (Ride History)
# @router.get("/trips")
# async def get_trips(current_user = Depends(get_current_user)):
#     # Select from `vw_rider_stats` and `Ride_History`.
#     pass
#
# TODO 3: Implement GET /wallet
# @router.get("/wallet")
# async def get_wallet(current_user = Depends(get_current_user)):
#     # Return `wallet_balance` and transaction history from `Payment`.
#     pass
#
# TODO 4: Implement POST /wallet/topup
# @router.post("/wallet/topup")
# async def topup_wallet(req: TopUpReq, current_user = Depends(get_current_user)):
#     # Handle mock payment gateway, update Rider wallet balance.
#     pass
#
# TODO 5: Implement POST /ratings (Rate Driver)
# @router.post("/ratings")
# async def submit_rating(req: RatingReq, current_user = Depends(get_current_user)):
#     # Insert into `Rating` table.
#     # `trg_update_driver_avg_rating` will automatically recalculate driver score.
#     pass
