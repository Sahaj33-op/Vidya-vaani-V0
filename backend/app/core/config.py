import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"), extra='ignore')

    PROJECT_NAME: str = "Vidya Vaani"
    API_V1_STR: str = "/api/v1"

    # Service API Keys/Credentials
    GEMINI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    S3_BUCKET_NAME: str

    # Operational Modes
    DEMO_MODE: bool = False

settings = Settings()
