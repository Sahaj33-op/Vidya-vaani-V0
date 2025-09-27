import os
from abc import ABC, abstractmethod
from app.core.config import settings
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

class AuthService(ABC):
    @abstractmethod
    def verify_token(self, token: str) -> bool:
        pass

class MockAuthService(AuthService):
    def verify_token(self, token: str) -> bool:
        return token == "mock_token"

class SupabaseAuthService(AuthService):
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        # In a real implementation, you would initialize the Supabase client here

    def verify_token(self, token: str) -> bool:
        if not self.supabase_url or not self.supabase_key:
            return False # Supabase not configured
        # Placeholder for actual Supabase JWT verification logic
        return True # Assume token is valid for now

# JWT Authentication Dependency
security = HTTPBearer()

def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security), auth_service: AuthService = Depends(SupabaseAuthService)):
    token = credentials.credentials
    if not auth_service.verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return token
