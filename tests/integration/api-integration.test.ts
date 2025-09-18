/**
 * Integration tests for API endpoints
 * Tests API interaction patterns and response formats
 */

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Redis helpers
jest.mock('@/lib/redis-helpers', () => ({
  safeRedisGet: jest.fn(),
  safeRedisSet: jest.fn(),
  cacheKeyFor: jest.fn((lang, text) => `${lang}:${text}`),
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}))

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Chat API Integration', () => {
    it('should handle successful chat request flow', async () => {
      const mockResponse = {
        reply: 'Mock admission requirements information',
        confidence: 0.95,
        action: 'answer:admission',
        cached: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user-123',
          text: 'What are the admission requirements?',
          lang: 'en',
        })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveProperty('reply')
      expect(data).toHaveProperty('confidence')
      expect(data).toHaveProperty('action')
      expect(typeof data.reply).toBe('string')
      expect(typeof data.confidence).toBe('number')
    })

    it('should handle error responses properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Bad Request',
          message: 'Invalid input data'
        })
      })

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user-123',
          // missing text field
          lang: 'en',
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('Translation API Integration', () => {
    it('should handle translation requests', async () => {
      const mockTranslationResponse = {
        translated_text: 'हैलो वर्ल्ड',
        confidence: 0.9,
        source_lang: 'en',
        target_lang: 'hi',
        method: 'english_to_hindi'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTranslationResponse
      })

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello world',
          source_lang: 'en',
          target_lang: 'hi',
        })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveProperty('translated_text')
      expect(data).toHaveProperty('confidence')
      expect(data).toHaveProperty('source_lang')
      expect(data).toHaveProperty('target_lang')
    })

    it('should handle cached translation responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          translated_text: 'Cached translation',
          confidence: 1.0,
          source_lang: 'en',
          target_lang: 'hi',
          cached: true
        })
      })

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello world',
          target_lang: 'hi',
        })
      })

      const data = await response.json()
      expect(data.cached).toBe(true)
    })
  })

  describe('Voice API Integration', () => {
    it('should handle voice processing requests', async () => {
      const mockVoiceResponse = {
        text: 'Hello world',
        confidence: 0.85,
        language: 'en'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVoiceResponse
      })

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_data: 'base64-encoded-audio-data',
          language: 'en'
        })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveProperty('text')
      expect(data).toHaveProperty('confidence')
      expect(data).toHaveProperty('language')
    })
  })

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'test-user-123',
            text: 'Test message',
            lang: 'en',
          })
        })
      } catch (error) {
        expect(error.message).toBe('Network error')
      }
    })

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
          retry_after: 60
        })
      })

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user-123',
          text: 'Test message',
          lang: 'en',
        })
      })

      expect(response.status).toBe(429)
    })
  })

  describe('Cross-language Integration Flow', () => {
    it('should handle end-to-end multilingual conversation', async () => {
      // Step 1: Translate user input from Hindi to English
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            translated_text: 'What are the admission requirements?',
            confidence: 0.9,
            source_lang: 'hi',
            target_lang: 'en'
          })
        })
        // Step 2: Get response from chat API
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            reply: 'The admission requirements include...',
            confidence: 0.95,
            action: 'answer:admission'
          })
        })
        // Step 3: Translate response back to Hindi
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            translated_text: 'प्रवेश आवश्यकताओं में शामिल हैं...',
            confidence: 0.9,
            source_lang: 'en',
            target_lang: 'hi'
          })
        })

      // Simulate complete conversation flow
      const translations = await Promise.all([
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'प्रवेश की आवश्यकताएं क्या हैं?',
            source_lang: 'hi',
            target_lang: 'en'
          })
        }),
        fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'test-user-123',
            text: 'What are the admission requirements?',
            lang: 'en'
          })
        }),
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'The admission requirements include...',
            source_lang: 'en',
            target_lang: 'hi'
          })
        })
      ])

      expect(translations).toHaveLength(3)
      translations.forEach(response => {
        expect(response.ok).toBe(true)
      })
    })
  })
})