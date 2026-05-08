from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

# ============================================================
# app/routers/auth.py — Authentication Routes
# ============================================================
# TODO 1: Define Pydantic models for request bodies.
# class LoginRequest(BaseModel):
#     email: EmailStr
#     password: str
#     role: str  # 'admin', 'driver', 'rider'
#
# class RegisterRequest(BaseModel):
#     full_name: str
#     email: EmailStr
#     password: str
#     phone: str | None = None
#     role: str
#     # driver extras
#     city: str | None = None
#     license_number: str | None = None
#
# TODO 2: Implement the POST /login endpoint.
# @router.post("/login")
# async def login(req: LoginRequest):
#     # 1. Fetch user by email from DB.
#     # 2. Check account_status == 'active'.
#     # 3. Check role matches req.role.
#     # 4. Verify password hash using app.utils.security.verify_password.
#     # 5. Fetch rider_id or driver_id from respective tables.
#     # 6. Generate JWT token using app.utils.security.create_access_token.
#     # 7. Return token and user details.
#     pass
#
# TODO 3: Implement the POST /register endpoint.
# @router.post("/register")
# async def register(req: RegisterRequest):
#     # 1. Hash password using app.utils.security.get_password_hash.
#     # 2. Insert into `User` table.
#     # 3. If role is 'rider', insert into `Rider`.
#     # 4. If role is 'driver', insert into `Driver`.
#     # 5. Return success and optionally automatically log them in.
#     pass
#
# TODO 4: Implement GET /me endpoint (Session restore).
# from app.utils.security import get_current_user
# @router.get("/me")
# async def me(current_user: dict = Depends(get_current_user)):
#     return {"success": True, "data": current_user}
