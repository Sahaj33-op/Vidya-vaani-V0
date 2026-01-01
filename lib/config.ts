/**
 * Application Configuration Constants
 * Centralized configuration for frontend application
 */

export const CONFIG = {
  // API Configuration
  API: {
    TIMEOUT_MS: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },

  // Cache Configuration
  CACHE: {
    TTL_SECONDS: 900, // 15 minutes
    MAX_SIZE_MB: 50,
  },

  // RAG Configuration
  RAG: {
    SCORE_THRESHOLD: 0.3,
    TOP_K_RESULTS: 5,
    MAX_CONTEXT_LENGTH: 3000,
  },

  // File Upload Configuration
  FILE_UPLOAD: {
    MAX_SIZE_MB: 10,
    MAX_FILES: 10,
    ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.txt', '.md'],
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
    ],
  },

  // Chat Configuration
  CHAT: {
    MAX_MESSAGE_LENGTH: 2000,
    MAX_HISTORY_LENGTH: 100,
    TYPING_INDICATOR_DELAY_MS: 500,
  },

  // Voice Configuration
  VOICE: {
    MAX_RECORDING_DURATION_MS: 60000, // 1 minute
    SAMPLE_RATE: 16000,
    AUDIO_FORMAT: 'audio/webm',
  },

  // UI Configuration
  UI: {
    TOAST_DURATION_MS: 3000,
    DEBOUNCE_DELAY_MS: 300,
    ANIMATION_DURATION_MS: 200,
  },

  // Storage Keys
  STORAGE_KEYS: {
    MESSAGES: 'vidya-vaani-chat',
    LANGUAGE: 'vidya-vaani-language',
    SESSION: 'vidya-vaani-session',
    THEME: 'vidya-vaani-theme',
  },

  // Supported Languages
  LANGUAGES: {
    en: { name: 'English', flag: '🇬🇧', rtl: false },
    hi: { name: 'Hindi', flag: '🇮🇳', rtl: false },
    mr: { name: 'Marathi', flag: '🇮🇳', rtl: false },
    mwr: { name: 'Marwari', flag: '🇮🇳', rtl: false },
  },

  // Feature Flags
  FEATURES: {
    VOICE_INPUT: true,
    TEXT_TO_SPEECH: true,
    FILE_UPLOAD: true,
    ANALYTICS: false,
    DARK_MODE: true,
  },
} as const

// Type exports for better TypeScript support
export type Language = keyof typeof CONFIG.LANGUAGES
export type StorageKey = keyof typeof CONFIG.STORAGE_KEYS
