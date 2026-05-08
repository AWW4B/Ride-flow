import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str = "rideflow"
    DB_CA: str = ""          # Path to TiDB/Aiven CA cert; empty = no SSL

    JWT_SECRET: str
    JWT_EXPIRES_MINUTES: int = 60 * 24  # 24 hours

    ADMIN_USERNAME: str = "admin@rideflow.com"
    ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
