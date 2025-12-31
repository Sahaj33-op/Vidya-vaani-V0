import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"), extra='ignore')

    PROJECT_NAME: str = "Vidya Vaani"
    API_V1_STR: str = "/api/v1"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Operational Modes
    DEMO_MODE: bool = True  # Default to demo mode for easier development

    # Service API Keys/Credentials (optional in demo mode)
    GEMINI_API_KEY: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None

    # Redis Configuration (optional - disabled in demo mode)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_ENABLED: bool = False  # Disable Redis by default

    # Rasa NLU Configuration
    RASA_API_URL: str = "http://localhost:5005"

settings = Settings()
