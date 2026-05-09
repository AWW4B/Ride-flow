"""
ride_lifecycle.py — auto-advances a Ride through its states every 6 seconds.
Called after a driver accepts a request. Uses threading.Timer so it works
without async/WebSockets in a single-worker uvicorn process.
"""
import threading
from app import database as db


def auto_advance_ride(ride_id: int, driver_id: int, rider_id: int) -> None:
    """
    Start the ride state machine.
    accepted ──6s──► driver_en_route ──6s──► in_progress ──6s──► completed
    Stops early if the ride is cancelled.
    On completion: sets completed_at, frees driver, inserts Payment row.
    """
    progression = ["driver_en_route", "in_progress", "completed"]

    def advance(idx: int) -> None:
        if idx >= len(progression):
            return
        new_status = progression[idx]
        try:
            rows = db.query(
                "SELECT status, final_fare FROM Ride WHERE ride_id=%s", (ride_id,)
            )
            if not rows or rows[0]["status"] == "cancelled":
                return  # rider cancelled — halt the chain

            db.execute(
                "UPDATE Ride SET status=%s WHERE ride_id=%s", (new_status, ride_id)
            )

            if new_status == "in_progress":
                db.execute(
                    "UPDATE Ride SET started_at=NOW() WHERE ride_id=%s", (ride_id,)
                )

            elif new_status == "completed":
                fare = float(rows[0]["final_fare"] or 0)
                db.execute(
                    "UPDATE Ride SET completed_at=NOW() WHERE ride_id=%s", (ride_id,)
                )
                db.execute(
                    "UPDATE Driver SET availability='online' WHERE driver_id=%s",
                    (driver_id,),
                )
                # Create Payment record (cash, paid immediately)
                try:
                    db.execute(
                        """
                        INSERT INTO Payment
                          (ride_id, rider_id, amount, payment_method, payment_status)
                        VALUES (%s, %s, %s, 'cash', 'paid')
                        """,
                        (ride_id, rider_id, fare),
                    )
                except Exception:
                    pass  # Payment insert non-critical
                return  # Chain ends here

        except Exception:
            return  # DB error — stop chain

        threading.Timer(6.0, advance, args=[idx + 1]).start()

    # Kick off first transition after 6 seconds
    threading.Timer(6.0, advance, args=[0]).start()
