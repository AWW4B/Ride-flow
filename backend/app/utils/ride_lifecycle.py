"""
ride_lifecycle.py — auto-advances a Ride through its states every 6 seconds.
Called after a driver accepts a request. Uses threading.Timer so it works
without async/WebSockets in a single-worker uvicorn process.

FIXES applied
─────────────
1. BUG: Payment hardcoded to 'cash'. Now accepts payment_method as a param.
2. BUG: Driver wallet never credited on auto-completion (sp_complete_ride
   was never called). Fix: call SP so Driver_Earnings INSERT fires the
   trg_credit_wallet_on_earning trigger.
3. BUG: started_at set in a separate UPDATE after status UPDATE — race window.
   Fix: merged into one atomic UPDATE.
4. BUG: completed_at set after status UPDATE — same race. Fixed via SP.
5. BUG: Driver location never cleared after ride — shows stale coords in
   vw_active_drivers. Fix: NULL out lat/lng when going back online.
6. BUG: Driver availability not reset when rider cancels mid-chain.
   Fix: detect cancelled status and reset driver.
"""

import threading
from app import database as db


def auto_advance_ride(
    ride_id: int,
    driver_id: int,
    rider_id: int,
    payment_method: str = "cash",
) -> None:
    """
    Start the ride state machine.
    accepted --6s--> driver_en_route --6s--> in_progress --6s--> completed
    Stops early if the ride is cancelled (also resets driver availability).
    On completion: calls sp_complete_ride so driver wallet is credited via trigger.
    """
    progression = ["driver_en_route", "in_progress", "completed"]

    def advance(idx: int) -> None:
        if idx >= len(progression):
            return
        new_status = progression[idx]
        try:
            rows = db.query(
                "SELECT status, final_fare, distance_km, duration_min "
                "FROM Ride WHERE ride_id=%s",
                (ride_id,),
            )
            if not rows:
                return

            current_status = rows[0]["status"]

            # FIX 6: reset driver if rider cancelled mid-chain
            if current_status == "cancelled":
                db.execute(
                    "UPDATE Driver SET availability='online', "
                    "current_lat=NULL, current_lng=NULL "
                    "WHERE driver_id=%s",
                    (driver_id,),
                )
                return

            if new_status == "in_progress":
                # FIX 3: atomic — status + started_at in one statement
                db.execute(
                    "UPDATE Ride SET status='in_progress', started_at=NOW() "
                    "WHERE ride_id=%s",
                    (ride_id,),
                )

            elif new_status == "completed":
                # FIX 2: call sp_complete_ride so Driver_Earnings is inserted
                # and trg_credit_wallet_on_earning fires automatically.
                distance_km  = float(rows[0]["distance_km"]  or 5.0)
                duration_min = int(rows[0]["duration_min"] or 15)

                try:
                    args, _ = db.call_proc("sp_complete_ride", [
                        ride_id, distance_km, duration_min, None, None, None
                    ])
                    sp_error = args[5] if len(args) > 5 else None
                    if sp_error:
                        _manual_complete(ride_id, driver_id, rider_id,
                                         rows[0]["final_fare"], payment_method)
                    else:
                        final_fare = float(args[4]) if args[4] is not None \
                                     else float(rows[0]["final_fare"] or 0)
                        _insert_payment(ride_id, rider_id, final_fare, payment_method)
                        # FIX 5: clear location when driver goes back online
                        db.execute(
                            "UPDATE Driver SET availability='online', "
                            "current_lat=NULL, current_lng=NULL "
                            "WHERE driver_id=%s",
                            (driver_id,),
                        )
                except Exception:
                    _manual_complete(ride_id, driver_id, rider_id,
                                     rows[0]["final_fare"], payment_method)
                return  # chain ends here

            else:
                # driver_en_route — plain status update
                db.execute(
                    "UPDATE Ride SET status=%s WHERE ride_id=%s",
                    (new_status, ride_id),
                )

        except Exception:
            return  # DB error — stop chain

        threading.Timer(6.0, advance, args=[idx + 1]).start()

    threading.Timer(6.0, advance, args=[0]).start()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _insert_payment(
    ride_id: int, rider_id: int, amount: float, payment_method: str
) -> None:
    """FIX 1: payment_method is a parameter, not hardcoded 'cash'."""
    try:
        valid = {"cash", "wallet", "card"}
        method = payment_method if payment_method in valid else "cash"
        db.execute(
            """
            INSERT INTO Payment
              (ride_id, rider_id, amount, payment_method, payment_status)
            VALUES (%s, %s, %s, %s, 'paid')
            """,
            (ride_id, rider_id, amount, method),
        )
    except Exception:
        pass


def _manual_complete(
    ride_id: int, driver_id: int, rider_id: int,
    final_fare, payment_method: str
) -> None:
    """Fallback when sp_complete_ride is unavailable."""
    fare = float(final_fare or 0)
    # FIX 4: completed_at atomic with status
    db.execute(
        "UPDATE Ride SET status='completed', completed_at=NOW() "
        "WHERE ride_id=%s",
        (ride_id,),
    )
    try:
        commission_rows = db.query(
            "SELECT commission_rate FROM Platform_Config "
            "WHERE effective_from <= CURDATE() "
            "  AND (effective_to IS NULL OR effective_to >= CURDATE()) "
            "ORDER BY effective_from DESC LIMIT 1"
        )
        rate = float(commission_rows[0]["commission_rate"]) if commission_rows else 20.0
        comm = round(fare * rate / 100, 2)
        net  = round(fare - comm, 2)
        db.execute(
            """
            INSERT INTO Driver_Earnings
              (driver_id, ride_id, gross_amount, commission_rate,
               commission_amount, net_amount)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (driver_id, ride_id, fare, rate, comm, net),
        )
    except Exception:
        pass

    # FIX 5: clear location + go online
    db.execute(
        "UPDATE Driver SET availability='online', "
        "current_lat=NULL, current_lng=NULL "
        "WHERE driver_id=%s",
        (driver_id,),
    )
    _insert_payment(ride_id, rider_id, fare, payment_method)