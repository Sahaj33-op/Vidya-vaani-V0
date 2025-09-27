import os
from abc import ABC, abstractmethod
from typing import List
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
