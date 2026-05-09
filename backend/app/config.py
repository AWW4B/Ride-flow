import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str = "rideflow"
    DB_CA: str = ""            # Path to TiDB/Aiven CA cert; empty = no SSL

    JWT_SECRET: str
    JWT_EXPIRES_MINUTES: int = 60 * 24   # 24 hours

    ADMIN_USERNAME: str = "admin@rideflow.pk"
    ADMIN_PASSWORD: str = "admin123"

    @field_validator("DB_PORT", mode="before")
    @classmethod
    def parse_db_port(cls, v):
        """Accept empty string from .env — fall back to 3306."""
        if v == "" or v is None:
            return 3306
        return int(v)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
