import unittest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.core.security import SupabaseAuthService, get_current_admin_user, verify_jwt
from app.core.config import settings
from supabase import Client
import jwt

class TestSupabaseAuthService(unittest.TestCase):

    @patch('app.core.security.create_client')
    def setUp(self, mock_create_client):
        self.mock_supabase_client = MagicMock(spec=Client)
        mock_create_client.return_value = self.mock_supabase_client
        
        # Mock the 'auth' attribute and its 'get_user' method
        self.mock_supabase_client.auth = MagicMock()
        
        # Create a mock for the UserResponse object
        self.mock_user_response = MagicMock()
        self.mock_supabase_client.auth.get_user.return_value = self.mock_user_response

        self.auth_service = SupabaseAuthService()

    def test_verify_token_valid_admin(self):
        mock_user = MagicMock()
        mock_user.id = "test_admin_id"
        self.mock_supabase_client.auth.get_user.return_value.user = mock_user
        self.mock_supabase_client.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'user_id': 'test_admin_id', 'role': 'admin'}]

        token = "valid_admin_token"
        user_data = self.auth_service.verify_token(token)
        self.assertEqual(user_data['user_id'], "test_admin_id")
        self.assertEqual(user_data['role'], "admin")

    def test_verify_token_valid_user(self):
        mock_user = MagicMock()
        mock_user.id = "test_user_id"
        self.mock_supabase_client.auth.get_user.return_value.user = mock_user
        self.mock_supabase_client.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'user_id': 'test_user_id', 'role': 'user'}]

        token = "valid_user_token"
        user_data = self.auth_service.verify_token(token)
        self.assertEqual(user_data['user_id'], "test_user_id")
        self.assertEqual(user_data['role'], "user")

        def test_verify_token_invalid(self):
            from supabase.lib.client_options import AuthApiError
            self.mock_supabase_client.auth.get_user.side_effect = AuthApiError("Invalid token", 401)
    
            token = "invalid_token"
            with self.assertRaises(HTTPException) as cm:
                self.auth_service.verify_token(token)
            self.assertEqual(cm.exception.status_code, 401)
    def test_verify_token_expired(self):
        # Mock jwt.ExpiredSignatureError directly
        self.mock_supabase_client.auth.get_user.side_effect = jwt.ExpiredSignatureError("Token has expired")

        token = "expired_token"
        with self.assertRaises(HTTPException) as cm:
            self.auth_service.verify_token(token)
        self.assertEqual(cm.exception.status_code, 401)

class TestAuthDependencies(unittest.IsolatedAsyncioTestCase):

    async def test_get_current_admin_user_success(self):
        mock_user_data = {"user_id": "admin123", "role": "admin"}
        result = await get_current_admin_user(mock_user_data)
        self.assertEqual(result, mock_user_data)

    async def test_get_current_admin_user_forbidden(self):
        mock_user_data = {"user_id": "user123", "role": "user"}
        with self.assertRaises(HTTPException) as cm:
            await get_current_admin_user(mock_user_data)
        self.assertEqual(cm.exception.status_code, 403)

if __name__ == '__main__':
    unittest.main()
