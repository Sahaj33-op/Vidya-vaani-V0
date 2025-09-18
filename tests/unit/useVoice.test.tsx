import { renderHook, act, waitFor } from '@testing-library/react'
import { useVoice } from '@/hooks/useVoice'
import SpeechRecognition from 'react-speech-recognition'

// Mock the speech recognition module
jest.mock('react-speech-recognition')

describe('useVoice Hook', () => {
  const mockSpeechRecognition = SpeechRecognition as jest.Mocked<typeof SpeechRecognition>

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    // Reset Speech Synthesis mock
    global.speechSynthesis.speak.mockClear()
    global.speechSynthesis.cancel.mockClear()
    // Reset the mock state
    if (mockSpeechRecognition.reset) {
      mockSpeechRecognition.reset()
    }
  })

  describe('Speech Recognition', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useVoice())

      expect(result.current.transcript).toBe('')
      expect(result.current.isListening).toBe(false)
      expect(result.current.hasRecognitionSupport).toBe(true)
      expect(result.current.isSpeaking).toBe(false)
      expect(result.current.hasSpeechSynthesis).toBe(true)
    })

    it('should start listening when startListening is called', () => {
      const { result } = renderHook(() => useVoice({ language: 'en' }))

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.startListening).toHaveBeenCalledWith({
        continuous: false,
        language: 'en-US',
      })
    })

    it('should handle different languages correctly', () => {
      const { result } = renderHook(() => useVoice({ language: 'hi' }))

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.startListening).toHaveBeenCalledWith({
        continuous: false,
        language: 'hi-IN',
      })
    })

    it('should fallback to Hindi for Marwari', () => {
      const { result } = renderHook(() => useVoice({ language: 'mwr' }))

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.startListening).toHaveBeenCalledWith({
        continuous: false,
        language: 'hi-IN',
      })
    })

    it('should not start listening if browser does not support speech recognition', () => {
      // Mock browser not supporting speech recognition
      mockSpeechRecognition.setBrowserSupport(false)
      
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.startListening).not.toHaveBeenCalled()
      expect(result.current.hasRecognitionSupport).toBe(false)
    })

    it('should stop listening when stopListening is called', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.stopListening()
      })

      expect(mockSpeechRecognition.stopListening).toHaveBeenCalled()
    })

    it('should reset transcript when resetTranscript is called', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.resetTranscript()
      })

      expect(result.current.transcript).toBe('')
    })

    it('should call onTranscriptChange when transcript changes', async () => {
      const mockOnTranscriptChange = jest.fn()
      const { useSpeechRecognition } = require('react-speech-recognition')
      
      // Mock the hook to return a transcript
      useSpeechRecognition.mockReturnValue({
        transcript: 'Hello world',
        listening: false,
        resetTranscript: jest.fn(),
        browserSupportsSpeechRecognition: true,
      })
      
      renderHook(() => useVoice({ onTranscriptChange: mockOnTranscriptChange }))

      // The effect should trigger when transcript is present
      await waitFor(() => {
        expect(mockOnTranscriptChange).toHaveBeenCalledWith('Hello world')
      })
    })
  })

  describe('Speech Synthesis', () => {
    it('should speak text when speak function is called', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.speak('Hello world')
      })

      expect(global.speechSynthesis.speak).toHaveBeenCalled()
      expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Hello world')
    })

    it('should not speak empty or whitespace-only text', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.speak('   ')
      })

      expect(global.speechSynthesis.speak).not.toHaveBeenCalled()
    })

    it('should set correct language for synthesis', () => {
      const { result } = renderHook(() => useVoice({ language: 'hi' }))

      act(() => {
        result.current.speak('नमस्ते')
      })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
      const utteranceCall = (global.SpeechSynthesisUtterance as jest.Mock).mock.calls[0]
      expect(utteranceCall[0]).toBe('नमस्ते')
    })

    it('should override language when provided in speak function', () => {
      const { result } = renderHook(() => useVoice({ language: 'en' }))

      act(() => {
        result.current.speak('Hola', 'es')
      })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Hola')
    })

    it('should cancel current speech before speaking new text', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.speak('First message')
      })

      act(() => {
        result.current.speak('Second message')
      })

      expect(global.speechSynthesis.cancel).toHaveBeenCalledTimes(2) // Once for each speak call
    })

    it('should stop speaking when stopSpeaking is called', () => {
      const { result } = renderHook(() => useVoice())

      act(() => {
        result.current.stopSpeaking()
      })

      expect(global.speechSynthesis.cancel).toHaveBeenCalled()
    })

    it('should update isSpeaking state correctly', () => {
      const { result } = renderHook(() => useVoice())

      expect(result.current.isSpeaking).toBe(false)

      // Mock utterance events
      let mockUtterance: any
      ;(global.SpeechSynthesisUtterance as jest.Mock).mockImplementation((text) => {
        mockUtterance = {
          text,
          onstart: null,
          onend: null,
          onerror: null,
        }
        return mockUtterance
      })

      act(() => {
        result.current.speak('Test message')
      })

      // Simulate speech start
      act(() => {
        if (mockUtterance.onstart) {
          mockUtterance.onstart()
        }
      })

      expect(result.current.isSpeaking).toBe(true)

      // Simulate speech end
      act(() => {
        if (mockUtterance.onend) {
          mockUtterance.onend()
        }
      })

      expect(result.current.isSpeaking).toBe(false)
    })

    it('should handle speech synthesis errors gracefully', () => {
      const { result } = renderHook(() => useVoice())
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock utterance with error
      let mockUtterance: any
      ;(global.SpeechSynthesisUtterance as jest.Mock).mockImplementation((text) => {
        mockUtterance = {
          text,
          onstart: null,
          onend: null,
          onerror: null,
        }
        return mockUtterance
      })

      act(() => {
        result.current.speak('Test message')
      })

      // Simulate speech error
      act(() => {
        if (mockUtterance.onerror) {
          mockUtterance.onerror({ error: 'synthesis-failed' })
        }
      })

      expect(result.current.isSpeaking).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Speech synthesis error:', 'synthesis-failed')

      consoleSpy.mockRestore()
    })
  })

  describe('Language Handling', () => {
    it('should map language codes correctly for speech recognition', () => {
      const testCases = [
        { input: 'en', expected: 'en-US' },
        { input: 'hi', expected: 'hi-IN' },
        { input: 'mr', expected: 'mr-IN' },
        { input: 'mwr', expected: 'hi-IN' },
        { input: 'unknown', expected: 'en-US' },
      ]

      testCases.forEach(({ input, expected }) => {
        const { result } = renderHook(() => useVoice({ language: input }))

        act(() => {
          result.current.startListening()
        })

        expect(mockSpeechRecognition.startListening).toHaveBeenCalledWith({
          continuous: false,
          language: expected,
        })

        // Clear mock for next iteration
        mockSpeechRecognition.startListening.mockClear()
      })
    })

    it('should handle voice selection for different languages', () => {
      // Mock multiple voices
      global.speechSynthesis.getVoices.mockReturnValue([
        { name: 'English Voice', lang: 'en-US' },
        { name: 'Hindi Voice', lang: 'hi-IN' },
        { name: 'Marathi Voice', lang: 'mr-IN' },
      ] as any)

      const { result } = renderHook(() => useVoice({ language: 'hi' }))

      act(() => {
        result.current.speak('Test message')
      })

      expect(global.speechSynthesis.getVoices).toHaveBeenCalled()
    })
  })
})