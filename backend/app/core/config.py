import os
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        extra="ignore",
    )

    PROJECT_NAME: str = "Vidya Vaani"
    API_V1_STR: str = "/api/v1"

    # Environment
    NODE_ENV: str = "development"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Operational Modes
    DEMO_MODE: bool = True

    # Service API Keys/Credentials (optional in demo mode)
    GEMINI_API_KEY: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    S3_ENDPOINT: Optional[str] = None
    S3_REGION: str = "us-east-1"

    # Redis Configuration (optional - disabled in demo mode)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_ENABLED: bool = False
    REDIS_TLS: bool = False

    # Rasa NLU Configuration
    RASA_API_URL: str = "http://localhost:5005"
    RASA_ENABLED: bool = False

    # Security
    SECRET_KEY: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 10

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"
    SENTRY_DSN: Optional[str] = None

    # Monitoring
    ENABLE_METRICS: bool = False
    ENABLE_TRACING: bool = False

    # Translation
    TRANSLATION_PROVIDER: str = "mock"
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None

    # Database
    USE_PGVECTOR: bool = False
    POSTGRES_CONNECTION_STRING: Optional[str] = None

    def get_allowed_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.NODE_ENV == "production" and not self.DEMO_MODE


settings = Settings()
