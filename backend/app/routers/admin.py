from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import database as db
from app.utils.security import require_role

router = APIRouter()
admin_only = Depends(require_role("admin"))


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(role: Optional[str] = None, status: Optional[str] = None, _=admin_only):
    sql = "SELECT user_id, full_name, email, role, account_status, registered_at FROM User WHERE 1=1"
    params = []
    if role:   sql += " AND role=%s";           params.append(role)
    if status: sql += " AND account_status=%s"; params.append(status)
    return db.query(sql, params)


class StatusUpdate(BaseModel):
    status: str

@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, body: StatusUpdate, _=admin_only):
    if body.status not in ("active", "suspended", "banned"):
        raise HTTPException(400, "Invalid status")
    db.execute("UPDATE User SET account_status=%s WHERE user_id=%s", (body.status, user_id))
    return {"message": "Updated"}


# ── Drivers ───────────────────────────────────────────────────────────────────

@router.get("/drivers")
def list_drivers(_=admin_only):
    return db.query("""
        SELECT d.driver_id, u.user_id, u.full_name, u.email, u.account_status,
               d.license_number, d.cnic, d.city,
               d.verification_status, d.availability,
               d.avg_rating, d.trips_completed, d.wallet_balance
        FROM Driver d JOIN User u ON u.user_id = d.user_id
        ORDER BY d.driver_id DESC
    """)


class VerifyBody(BaseModel):
    status: str

@router.put("/drivers/{driver_id}/verify")
def verify_driver(driver_id: int, body: VerifyBody, _=admin_only):
    if body.status not in ("verified", "rejected"):
        raise HTTPException(400, "Status must be verified or rejected")
    db.execute("UPDATE Driver SET verification_status=%s WHERE driver_id=%s", (body.status, driver_id))
    return {"message": f"Driver {body.status}"}


@router.get("/vehicles")
def list_vehicles(status: Optional[str] = None, _=admin_only):
    sql = """
        SELECT v.vehicle_id, v.make, v.model, v.year, v.color,
               v.license_plate, v.vehicle_type, v.verification_status,
               dv.is_primary, dv.driver_id,
               u.full_name AS driver_name, u.email AS driver_email
        FROM Vehicle v
        JOIN Driver_Vehicle dv ON dv.vehicle_id = v.vehicle_id
        JOIN Driver d           ON d.driver_id   = dv.driver_id
        JOIN User   u           ON u.user_id     = d.user_id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND v.verification_status=%s"
        params.append(status)
    sql += " ORDER BY v.vehicle_id DESC"
    return db.query(sql, params)


@router.put("/vehicles/{vehicle_id}/verify")
def verify_vehicle(vehicle_id: int, body: VerifyBody, _=admin_only):
    if body.status not in ("verified", "rejected"):
        raise HTTPException(400, "Status must be verified or rejected")
    db.execute("UPDATE Vehicle SET verification_status=%s WHERE vehicle_id=%s", (body.status, vehicle_id))
    return {"message": f"Vehicle {body.status}"}


# ── Rides ─────────────────────────────────────────────────────────────────────

@router.get("/rides")
def list_rides(status: Optional[str] = None, date_from: Optional[str] = None,
               date_to: Optional[str] = None, _=admin_only):
    sql = "SELECT * FROM vw_ride_summary WHERE 1=1"
    params = []
    if status:    sql += " AND status=%s";                     params.append(status)
    if date_from: sql += " AND DATE(requested_at) >= %s";     params.append(date_from)
    if date_to:   sql += " AND DATE(requested_at) <= %s";     params.append(date_to)
    sql += " ORDER BY requested_at DESC LIMIT 200"
    return db.query(sql, params)


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports/revenue")
def report_revenue(date_from: str, date_to: str, _=admin_only):
    return db.query(
        "SELECT * FROM vw_platform_revenue WHERE earning_date BETWEEN %s AND %s ORDER BY earning_date",
        (date_from, date_to),
    )

@router.get("/reports/drivers")
def report_drivers(_=admin_only):
    return db.query("SELECT * FROM vw_driver_earnings_summary ORDER BY total_gross DESC")

@router.get("/reports/payments")
def report_payments(date_from: Optional[str] = None, date_to: Optional[str] = None, _=admin_only):
    sql = """
        SELECT payment_method, payment_status, COUNT(*) AS count, SUM(amount) AS total
        FROM Payment WHERE 1=1
    """
    params = []
    if date_from: sql += " AND DATE(transaction_date) >= %s"; params.append(date_from)
    if date_to:   sql += " AND DATE(transaction_date) <= %s"; params.append(date_to)
    sql += " GROUP BY payment_method, payment_status"
    return db.query(sql, params)

@router.get("/reports/refunds")
def report_refunds(_=admin_only):
    return db.query("""
        SELECT DATE(transaction_date) AS date, payment_method,
               COUNT(*) AS count, SUM(amount) AS total_refunded
        FROM Payment WHERE payment_status='refunded'
        GROUP BY date, payment_method ORDER BY date DESC
    """)

@router.get("/leaderboard")
def leaderboard(_=admin_only):
    return db.query("SELECT * FROM vw_driver_leaderboard ORDER BY city, city_rank LIMIT 50")


# ── Payouts ───────────────────────────────────────────────────────────────────

@router.get("/payouts")
def list_payouts(_=admin_only):
    return db.query("""
        SELECT pr.*, u.full_name AS driver_name
        FROM Payout_Request pr
        JOIN Driver d ON d.driver_id = pr.driver_id
        JOIN User   u ON u.user_id   = d.user_id
        ORDER BY pr.requested_at DESC
    """)

@router.put("/payouts/{payout_id}/approve")
def approve_payout(payout_id: int, _=admin_only):
    db.execute(
        "UPDATE Payout_Request SET status='paid', processed_at=NOW() WHERE payout_id=%s",
        (payout_id,),
    )
    return {"message": "Payout approved"}


# ── Promo Codes ───────────────────────────────────────────────────────────────

class PromoBody(BaseModel):
    code: str
    discount_type: str        # percentage | flat
    discount_value: float
    valid_from: str           # YYYY-MM-DD
    valid_to: str             # YYYY-MM-DD
    usage_limit: Optional[int] = None

@router.get("/promos")
def list_promos(_=admin_only):
    return db.query("SELECT * FROM Promo_Code ORDER BY promo_id DESC")

@router.post("/promos", status_code=201)
def create_promo(body: PromoBody, _=admin_only):
    if db.query("SELECT promo_id FROM Promo_Code WHERE code=%s", (body.code,)):
        raise HTTPException(409, "Promo code already exists")
    if body.discount_type not in ("percentage", "flat"):
        raise HTTPException(400, "discount_type must be 'percentage' or 'flat'")
    if body.discount_type == "percentage" and not (0 < body.discount_value <= 100):
        raise HTTPException(400, "Percentage discount must be between 0 and 100")
    if body.discount_value <= 0:
        raise HTTPException(400, "discount_value must be positive")
    pid = db.execute(
        "INSERT INTO Promo_Code (code, discount_type, discount_value, valid_from, valid_to, usage_limit) VALUES (%s,%s,%s,%s,%s,%s)",
        (body.code.upper(), body.discount_type, body.discount_value, body.valid_from, body.valid_to, body.usage_limit),
    )
    return {"promo_id": pid, "message": "Promo code created"}

@router.put("/promos/{promo_id}")
def update_promo(promo_id: int, body: PromoBody, _=admin_only):
    db.execute(
        "UPDATE Promo_Code SET code=%s, discount_type=%s, discount_value=%s, valid_from=%s, valid_to=%s, usage_limit=%s WHERE promo_id=%s",
        (body.code.upper(), body.discount_type, body.discount_value, body.valid_from, body.valid_to, body.usage_limit, promo_id),
    )
    return {"message": "Updated"}

@router.delete("/promos/{promo_id}")
def delete_promo(promo_id: int, _=admin_only):
    db.execute("DELETE FROM Promo_Code WHERE promo_id=%s", (promo_id,))
    return {"message": "Deleted"}


# ── Flagged Riders ────────────────────────────────────────────────────────────

@router.get("/flagged-riders")
def flagged_riders(_=admin_only):
    return db.query("SELECT * FROM vw_flagged_riders")
