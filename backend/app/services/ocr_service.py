from abc import ABC, abstractmethod

class OCRService(ABC):
    @abstractmethod
    def extract_text_from_image(self, image_data: bytes) -> str:
        pass

class MockOCRService(OCRService):
    def extract_text_from_image(self, image_data: bytes) -> str:
        return "Mock OCR extraction from image"

class RealOCRService(OCRService):
    def extract_text_from_image(self, image_data: bytes) -> str:
        # Implement actual OCR service integration (e.g., Google Cloud Vision AI, Tesseract)
        return "Real OCR extraction from image"
