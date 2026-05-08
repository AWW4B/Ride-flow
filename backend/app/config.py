from pydantic_settings import BaseSettings

# ============================================================
# app/config.py — Environment Variables
# ============================================================
# TODO 1: Define your environment variables here.
# Pydantic will automatically load them from the .env file.
# 
# Example:
# class Settings(BaseSettings):
#     DB_HOST: str = "localhost"
#     DB_PORT: int = 3306
#     DB_USER: str = "rf_admin"
#     DB_PASSWORD: str
#     DB_NAME: str = "rideflow"
#     
#     JWT_SECRET: str
#     JWT_EXPIRES_MINUTES: int = 60 * 24 * 7 # 7 days
#
#     class Config:
#         env_file = ".env"
#
# settings = Settings()
