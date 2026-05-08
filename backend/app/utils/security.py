from passlib.context import CryptContext
# ============================================================
# app/utils/security.py — JWT and Password Hashing
# ============================================================
# TODO 1: Setup Passlib for password hashing.
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# 
# def verify_password(plain_password, hashed_password):
#     return pwd_context.verify(plain_password, hashed_password)
# 
# def get_password_hash(password):
#     return pwd_context.hash(password)
#
# TODO 2: Implement JWT Token generation.
# from jose import jwt
# from datetime import datetime, timedelta
# from app.config import settings
#
# def create_access_token(data: dict):
#     to_encode = data.copy()
#     expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
#     return encoded_jwt
#
# TODO 3: Implement get_current_user dependency for FastAPI.
# This will extract the token from the Authorization header and verify it.
# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# 
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
#
# async def get_current_user(token: str = Depends(oauth2_scheme)):
#     # decode token, fetch user from DB using app.database, return user dict
#     pass
