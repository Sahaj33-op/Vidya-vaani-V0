import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from supabase import Client, create_client

from app.core.config import settings


class StorageService(ABC):
    @abstractmethod
    def upload_file(self, file_name: str, file_content: bytes) -> str:
        pass

    @abstractmethod
    def list_files(self) -> List[str]:
        pass


class LocalStorageService(StorageService):
    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path)
        # Create storage directory if it doesn't exist
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def upload_file(self, file_name: str, file_content: bytes) -> str:
        """Save file to local storage"""
        file_path = self.storage_path / file_name
        with open(file_path, "wb") as f:
            f.write(file_content)
        return f"File {file_name} saved to {self.storage_path}"

    def list_files(self) -> List[str]:
        """List all files in storage directory"""
        try:
            if not self.storage_path.exists():
                return []
            return [f.name for f in self.storage_path.iterdir() if f.is_file()]
        except Exception:
            return []


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
        self.supabase: Client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY
        )
        self.bucket_name = "documents"  # You might want to make this configurable
        try:
            self.supabase.storage.get_bucket(self.bucket_name)
        except Exception:
            self.supabase.storage.create_bucket(self.bucket_name)

    def upload_file(self, file_name: str, file_content: bytes) -> str:
        try:
            self.supabase.storage.from_(self.bucket_name).upload(
                file_name, file_content
            )
            return f"File {file_name} uploaded to Supabase Storage bucket {self.bucket_name}"
        except Exception as e:
            raise Exception(f"Error uploading file to Supabase Storage: {e}")

    def list_files(self) -> List[str]:
        try:
            res = self.supabase.storage.from_(self.bucket_name).list()
            return [file["name"] for file in res]
        except Exception as e:
            raise Exception(f"Error listing files from Supabase Storage: {e}")
