import os
from abc import ABC, abstractmethod
from typing import List
from app.core.config import settings
from supabase import create_client, Client

class StorageService(ABC):
    @abstractmethod
    def upload_file(self, file_name: str, file_content: bytes) -> str:
        pass

    @abstractmethod
    def list_files(self) -> List[str]:
        pass

class LocalStorageService(StorageService):
    def __init__(self, storage_path: str):
        self.storage_path = storage_path

    def upload_file(self, file_name: str, file_content: bytes) -> str:
        # In a real implementation, you would save the file to the local disk
        return f"File {file_name} saved locally"

    def list_files(self) -> List[str]:
        return ["local_file1.txt", "local_file2.txt"]

class S3StorageService(StorageService):
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        # In a real implementation, you would initialize the S3 client here (e.g., boto3)

    def upload_file(self, file_name: str, file_content: bytes) -> str:
        if not self.bucket_name:
            return "S3 bucket name is not configured."
        # Placeholder for actual S3 upload logic
        return f"File {file_name} uploaded to S3 bucket {self.bucket_name}"

    def list_files(self) -> List[str]:
        if not self.bucket_name:
            return []
        # Placeholder for actual S3 list files logic
        return [f"s3_{self.bucket_name}_file1.txt", f"s3_{self.bucket_name}_file2.txt"]

class SupabaseStorageAdapter(StorageService):
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        self.bucket_name = "documents" # You might want to make this configurable
        try:
            self.supabase.storage.get_bucket(self.bucket_name)
        except Exception:
            self.supabase.storage.create_bucket(self.bucket_name)

    def upload_file(self, file_name: str, file_content: bytes) -> str:
        try:
            self.supabase.storage.from_(self.bucket_name).upload(file_name, file_content)
            return f"File {file_name} uploaded to Supabase Storage bucket {self.bucket_name}"
        except Exception as e:
            raise Exception(f"Error uploading file to Supabase Storage: {e}")

    def list_files(self) -> List[str]:
        try:
            res = self.supabase.storage.from_(self.bucket_name).list()
            return [file['name'] for file in res]
        except Exception as e:
            raise Exception(f"Error listing files from Supabase Storage: {e}")
