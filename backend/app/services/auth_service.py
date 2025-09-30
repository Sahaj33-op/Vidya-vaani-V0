from abc import ABC, abstractmethod

class AuthService(ABC):
    @abstractmethod
    def authenticate(self, token: str) -> bool:
        pass

class MockAuthService(AuthService):
    def authenticate(self, token: str) -> bool:
        return token == "mock_token"

class SupabaseAuthService(AuthService):
    def authenticate(self, token: str) -> bool:
        # Placeholder for actual Supabase authentication logic
        return True # Always return True for now