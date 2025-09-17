import os
from typing import List, Optional

class EnvironmentValidator:
    REQUIRED_VARS = [
        'KV_REST_API_URL',
        'KV_REST_API_TOKEN',
        'UPSTASH_SEARCH_REST_URL',
        'UPSTASH_SEARCH_REST_TOKEN',
        'JWT_SECRET'
    ]

    @staticmethod
    def get_required_env(name: str) -> str:
        """Get a required environment variable and ensure it exists."""
        value = os.getenv(name)
        if not value:
            raise ValueError(f"Required environment variable {name} is not defined")
        return value

    @classmethod
    def validate_environment(cls) -> None:
        """
        Validates that all required environment variables are set and have valid values.
        Raises ValueError if any required variable is missing or invalid.
        """
        missing: List[str] = [var for var in cls.REQUIRED_VARS if not os.getenv(var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Validate URL formats
        kv_url = cls.get_required_env('KV_REST_API_URL')
        if not kv_url.startswith('https://'):
            raise ValueError('KV_REST_API_URL must be a valid HTTPS URL')
        
        search_url = cls.get_required_env('UPSTASH_SEARCH_REST_URL')
        if not search_url.startswith('https://'):
            raise ValueError('UPSTASH_SEARCH_REST_URL must be a valid HTTPS URL')
        
        # Validate token lengths
        kv_token = cls.get_required_env('KV_REST_API_TOKEN')
        if len(kv_token) < 32:
            raise ValueError('KV_REST_API_TOKEN is too short')
        
        search_token = cls.get_required_env('UPSTASH_SEARCH_REST_TOKEN')
        if len(search_token) < 32:
            raise ValueError('UPSTASH_SEARCH_REST_TOKEN is too short')
        
        jwt_secret = cls.get_required_env('JWT_SECRET')
        if len(jwt_secret) < 32:
            raise ValueError('JWT_SECRET must be at least 32 characters long')

        print('[v0] Environment validation successful')