from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app import database as db
from app.utils.security import hash_password, verify_password, create_token

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str

class RiderRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None

class DriverRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
    license_number: str | None = None
    cnic: str | None = None
    city: str | None = "Unknown"


@router.post("/login")
def login(req: LoginRequest):
    rows = db.query("SELECT * FROM User WHERE email=%s LIMIT 1", (req.email,))
    if not rows:
        raise HTTPException(401, "Invalid email or password")
    user = rows[0]

    if user["account_status"] != "active":
        raise HTTPException(403, f"Account is {user['account_status']}")
    if user["role"] != req.role:
        raise HTTPException(401, "Role does not match")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    # Fetch sub-entity id
    entity_id = user["user_id"]
    driver_id = None
    if req.role == "driver":
        d = db.query("SELECT driver_id FROM Driver WHERE user_id=%s", (user["user_id"],))
        if d:
            driver_id = d[0]["driver_id"]
            entity_id = driver_id
    elif req.role == "rider":
        r = db.query("SELECT rider_id FROM Rider WHERE user_id=%s", (user["user_id"],))
        if r:
            entity_id = r[0]["rider_id"]

    token = create_token(user["user_id"], user["role"], user["email"])
    return {
        "token": token,
        "user": {
            "user_id":   user["user_id"],
            "entity_id": entity_id,
            "driver_id": driver_id,
            "full_name": user["full_name"],
            "email":     user["email"],
            "role":      user["role"],
        },
    }


@router.post("/register", status_code=201)
def register_rider(req: RiderRegister):
    if db.query("SELECT user_id FROM User WHERE email=%s", (req.email,)):
        raise HTTPException(409, "Email already registered")
    pw = hash_password(req.password)
    user_id = db.execute(
        "INSERT INTO User (full_name, email, password_hash, role) VALUES (%s,%s,%s,'rider')",
        (req.full_name, req.email, pw),
    )
    rider_id = db.execute("INSERT INTO Rider (user_id) VALUES (%s)", (user_id,))
    if req.phone:
        db.execute("INSERT INTO Phone (user_id, phone_number, is_primary) VALUES (%s,%s,1)", (user_id, req.phone))
    token = create_token(user_id, "rider", req.email)
    return {"token": token, "user": {"user_id": user_id, "entity_id": rider_id, "role": "rider", "email": req.email, "full_name": req.full_name}}


@router.post("/driver/register", status_code=201)
def register_driver(req: DriverRegister):
    if db.query("SELECT user_id FROM User WHERE email=%s", (req.email,)):
        raise HTTPException(409, "Email already registered")
    pw = hash_password(req.password)
    user_id = db.execute(
        "INSERT INTO User (full_name, email, password_hash, role) VALUES (%s,%s,%s,'driver')",
        (req.full_name, req.email, pw),
    )
    driver_id = db.execute(
        "INSERT INTO Driver (user_id, license_number, cnic, city) VALUES (%s,%s,%s,%s)",
        (user_id, req.license_number or "PENDING", req.cnic or "0000000000000", req.city or "Unknown"),
    )
    if req.phone:
        db.execute("INSERT INTO Phone (user_id, phone_number, is_primary) VALUES (%s,%s,1)", (user_id, req.phone))
    token = create_token(user_id, "driver", req.email)
    return {"token": token, "user": {"user_id": user_id, "driver_id": driver_id, "entity_id": driver_id, "role": "driver", "full_name": req.full_name}}
