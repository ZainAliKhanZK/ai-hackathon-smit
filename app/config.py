import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "HCM Lite"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hcm-lite-hackathon-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hcm_lite.db")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

settings = Settings()
