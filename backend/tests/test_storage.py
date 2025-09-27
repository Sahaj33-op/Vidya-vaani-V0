import unittest
from unittest.mock import MagicMock, patch
from app.services.storage_service import SupabaseStorageAdapter
from supabase import Client

class TestSupabaseStorageAdapter(unittest.TestCase):

    @patch('app.services.storage_service.create_client')
    def setUp(self, mock_create_client):
        self.mock_supabase_client = MagicMock(spec=Client)
        mock_create_client.return_value = self.mock_supabase_client
        self.storage_adapter = SupabaseStorageAdapter()

    def test_upload_file_success(self):
        mock_storage_from = self.mock_supabase_client.storage.from_.return_value
        mock_storage_from.upload.return_value = {'path': 'test_file.txt'}

        file_name = "test_file.txt"
        file_content = b"This is test content."
        result = self.storage_adapter.upload_file(file_name, file_content)

        mock_storage_from.upload.assert_called_once_with(file_name, file_content)
        self.assertIn(f"File {file_name} uploaded to Supabase Storage bucket", result)

    def test_upload_file_failure(self):
        mock_storage_from = self.mock_supabase_client.storage.from_.return_value
        mock_storage_from.upload.side_effect = Exception("Upload failed")

        file_name = "test_file.txt"
        file_content = b"This is test content."
        with self.assertRaisesRegex(Exception, "Error uploading file to Supabase Storage: Upload failed"):
            self.storage_adapter.upload_file(file_name, file_content)

    def test_list_files_success(self):
        mock_storage_from = self.mock_supabase_client.storage.from_.return_value
        mock_storage_from.list.return_value = [{'name': 'file1.txt'}, {'name': 'file2.txt'}]

        result = self.storage_adapter.list_files()

        mock_storage_from.list.assert_called_once()
        self.assertEqual(result, ['file1.txt', 'file2.txt'])

    def test_list_files_failure(self):
        mock_storage_from = self.mock_supabase_client.storage.from_.return_value
        mock_storage_from.list.side_effect = Exception("List failed")

        with self.assertRaisesRegex(Exception, "Error listing files from Supabase Storage: List failed"):
            self.storage_adapter.list_files()

if __name__ == '__main__':
    unittest.main()
