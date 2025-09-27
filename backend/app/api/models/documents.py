from pydantic import BaseModel
from typing import List

class DocumentUploadRequest(BaseModel):
    file_names: List[str]

class DocumentUploadResponse(BaseModel):
    message: str
    uploaded_files: List[str]
