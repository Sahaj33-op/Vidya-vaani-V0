"""
Application Constants
Centralized configuration constants for backend
"""

# Cache Configuration
CACHE_TTL_SECONDS = 900  # 15 minutes
CACHE_MAX_SIZE = 1000  # Maximum number of cached items

# RAG Configuration
RAG_SCORE_THRESHOLD = 0.3
RAG_TOP_K_RESULTS = 5
RAG_MAX_CONTEXT_LENGTH = 3000
RAG_CHUNK_SIZE = 500
RAG_CHUNK_OVERLAP = 50

# LLM Configuration
LLM_MAX_TOKENS = 150
LLM_TEMPERATURE = 0.7
LLM_TOP_P = 0.9

# Translation Configuration
TRANSLATION_CONFIDENCE_THRESHOLD = 0.5
TRANSLATION_MAX_LENGTH = 5000

# File Upload Configuration
MAX_FILE_SIZE_MB = 10
MAX_FILES_PER_REQUEST = 10
ALLOWED_FILE_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
}

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE = 60
RATE_LIMIT_BURST = 10

# Timeout Configuration
HTTP_REQUEST_TIMEOUT_SECONDS = 30
DATABASE_QUERY_TIMEOUT_SECONDS = 10

# Supported Languages
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "mwr": "Marwari",
}

# Session Configuration
SESSION_EXPIRY_HOURS = 24
SESSION_ID_LENGTH = 36  # UUID length

# Logging
LOG_FORMAT_JSON = "json"
LOG_FORMAT_TEXT = "text"
LOG_LEVEL_DEBUG = "DEBUG"
LOG_LEVEL_INFO = "INFO"
LOG_LEVEL_WARNING = "WARNING"
LOG_LEVEL_ERROR = "ERROR"

# Health Check
HEALTH_CHECK_TIMEOUT_SECONDS = 5

# Error Messages
ERROR_MESSAGES = {
    "generic": "An error occurred. Please try again.",
    "timeout": "Request timed out. Please try again.",
    "invalid_input": "Invalid input. Please check your request.",
    "file_too_large": f"File size exceeds maximum limit of {MAX_FILE_SIZE_MB}MB.",
    "unsupported_file": "Unsupported file type.",
    "rate_limit": "Too many requests. Please try again later.",
}
