import os
from abc import ABC, abstractmethod
from app.core.config import settings
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import jwt
import httpx

class AuthService(ABC):
    @abstractmethod
    def verify_token(self, token: str) -> dict:
        pass

class MockAuthService(AuthService):
    def verify_token(self, token: str) -> dict:
        if token == "mock_token":
            return {"user_id": "mock_admin", "role": "admin"}
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

class SupabaseAuthService(AuthService):
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    def verify_token(self, token: str) -> dict:
        try:
            # Supabase's verify_token method handles JWT verification
            user_response = self.supabase.auth.get_user(token)
            user = user_response.user
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
            
            # Fetch user roles from your user_roles table
            response = self.supabase.from_('user_roles').select('*').eq('user_id', user.id).execute()
            user_roles = response.data
            
            role = "user" # Default role
            if user_roles and len(user_roles) > 0:
                role = user_roles[0]['role']

            return {"user_id": user.id, "role": role}
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Authentication error: {e}")

# JWT Authentication Dependency
security = HTTPBearer()

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security), auth_service: AuthService = Depends(SupabaseAuthService)):
    token = credentials.credentials
    user_data = auth_service.verify_token(token)
    return user_data

async def get_current_admin_user(user_data: dict = Depends(verify_jwt)):
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")
    return user_data
