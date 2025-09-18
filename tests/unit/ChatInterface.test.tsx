import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInterface } from '@/components/chat-interface'

// Mock DOM APIs
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: jest.fn(),
})

// Mock the useVoice hook
const mockUseVoice = {
  transcript: '',
  isListening: false,
  isSpeaking: false,
  startListening: jest.fn(),
  stopListening: jest.fn(),
  speak: jest.fn(),
  stopSpeaking: jest.fn(),
  resetTranscript: jest.fn(),
  language: 'en'
}

jest.mock('@/hooks/useVoice', () => ({
  useVoice: jest.fn(() => mockUseVoice)
}))

// Mock fetch globally for API calls
global.fetch = jest.fn()

describe('ChatInterface Component', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: 'Mock response',
        confidence: 0.9,
        action: 'answer',
      }),
    } as Response)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Initial Render', () => {
    it('should render the chat interface with initial elements', () => {
      render(<ChatInterface />)
      
      expect(screen.getByText('College Assistant')).toBeInTheDocument()
      expect(screen.getByText('Multilingual Education Support')).toBeInTheDocument()
      expect(screen.getByText(/Hello! I'm your college assistant/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Type your message in English/)).toBeInTheDocument()
    })

    it('should show initial welcome message', () => {
      render(<ChatInterface />)
      
      const welcomeMessage = screen.getByText(/Hello! I'm your college assistant/)
      expect(welcomeMessage).toBeInTheDocument()
    })

    it('should display language selector with default English', () => {
      render(<ChatInterface />)
      
      // The Select component should be present
      expect(screen.getByDisplayValue('English')).toBeInTheDocument()
    })

    it('should show quick action buttons on initial render', () => {
      render(<ChatInterface />)
      
      expect(screen.getByText('Admission Information')).toBeInTheDocument()
      expect(screen.getByText('Fee Structure')).toBeInTheDocument()
      expect(screen.getByText('Timetable')).toBeInTheDocument()
      expect(screen.getByText('Contact Info')).toBeInTheDocument()
    })
  })

  describe('Message Input', () => {
    it('should allow typing in the input field', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message in English/)
      await user.type(input, 'What are the admission requirements?')
      
      expect(input).toHaveValue('What are the admission requirements?')
    })

    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message in English/)
      const sendButton = screen.getByRole('button', { name: /send/i })
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_123',
          text: 'Test message',
          lang: 'en',
        }),
      })
    })

    it('should send message when Enter key is pressed', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message in English/)
      
      await user.type(input, 'Test message{enter}')
      
      expect(mockFetch).toHaveBeenCalledWith('/api/ask', expect.any(Object))
    })

    it('should not send empty messages', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      
      await user.click(sendButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should clear input after sending message', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message in English/)
      const sendButton = screen.getByRole('button', { name: /send/i })
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      expect(input).toHaveValue('')
    })
  })

  describe('Quick Actions', () => {
    it('should send predefined query when quick action is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const admissionButton = screen.getByText('Admission Information')
      await user.click(admissionButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_123',
          text: 'Tell me about admission process',
          lang: 'en',
        }),
      })
    })

    it('should hide quick actions after first user message', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      // Quick actions should be visible initially
      expect(screen.getByText('Admission Information')).toBeInTheDocument()
      
      // Send a message
      const input = screen.getByPlaceholderText(/Type your message in English/)
      await user.type(input, 'Hello{enter}')
      
      // Wait for the response and check if quick actions are hidden
      await waitFor(() => {
        expect(screen.queryByText('Admission Information')).not.toBeInTheDocument()
      })
    })
  })

  describe('Language Selection', () => {
    it('should change input placeholder when language is changed', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      // Change language to Hindi
      const languageSelector = screen.getByDisplayValue('English')
      await user.selectOptions(languageSelector, 'hi')
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message in हिंदी/)).toBeInTheDocument()
      })
    })

    it('should send messages with correct language code', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      // Change to Hindi
      const languageSelector = screen.getByDisplayValue('English')
      await user.selectOptions(languageSelector, 'hi')
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'नमस्ते{enter}')
      
      expect(mockFetch).toHaveBeenCalledWith('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_123',
          text: 'नमस्ते',
          lang: 'hi',
        }),
      })
    })
  })

  describe('Voice Features', () => {
    it('should show voice input button when browser supports speech recognition', () => {
      render(<ChatInterface />)
      
      // Look for microphone button
      const micButton = screen.getByTitle(/Start voice input/)
      expect(micButton).toBeInTheDocument()
    })

    it('should show voice output toggle button when browser supports speech synthesis', () => {
      render(<ChatInterface />)
      
      // Look for volume button
      const volumeButton = screen.getByTitle(/voice output/)
      expect(volumeButton).toBeInTheDocument()
    })

    it('should handle voice input button click', async () => {
      const mockStartListening = jest.fn()
      const { useVoice } = require('@/hooks/useVoice')
      useVoice.mockReturnValue({
        transcript: '',
        isListening: false,
        hasRecognitionSupport: true,
        startListening: mockStartListening,
        stopListening: jest.fn(),
        resetTranscript: jest.fn(),
        isSpeaking: false,
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        hasSpeechSynthesis: true,
      })

      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const micButton = screen.getByTitle(/Start voice input/)
      await user.click(micButton)
      
      expect(mockStartListening).toHaveBeenCalled()
    })

    it('should show listening state when voice input is active', () => {
      const { useVoice } = require('@/hooks/useVoice')
      useVoice.mockReturnValue({
        transcript: '',
        isListening: true,
        hasRecognitionSupport: true,
        startListening: jest.fn(),
        stopListening: jest.fn(),
        resetTranscript: jest.fn(),
        isSpeaking: false,
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        hasSpeechSynthesis: true,
      })

      render(<ChatInterface />)
      
      expect(screen.getByPlaceholderText('Listening...')).toBeInTheDocument()
      expect(screen.getByTitle(/Stop listening/)).toBeInTheDocument()
    })

    it('should display speaking indicator when bot is speaking', () => {
      const { useVoice } = require('@/hooks/useVoice')
      useVoice.mockReturnValue({
        transcript: '',
        isListening: false,
        hasRecognitionSupport: true,
        startListening: jest.fn(),
        stopListening: jest.fn(),
        resetTranscript: jest.fn(),
        isSpeaking: true,
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        hasSpeechSynthesis: true,
      })

      render(<ChatInterface />)
      
      expect(screen.getByText('Speaking...')).toBeInTheDocument()
    })
  })

  describe('Message Display', () => {
    it('should display user messages with correct styling', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'User message{enter}')
      
      await waitFor(() => {
        const userMessage = screen.getByText('User message')
        expect(userMessage).toBeInTheDocument()
        // Check if it has user message styling (right-aligned)
        expect(userMessage.closest('.max-w-\\[70%\\]')).toBeInTheDocument()
      })
    })

    it('should display bot responses', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'Test question{enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Mock response')).toBeInTheDocument()
      })
    })

    it('should show loading state while waiting for response', async () => {
      const user = userEvent.setup()
      
      // Mock a delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ reply: 'Delayed response' }),
        } as Response), 100))
      )
      
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'Test question{enter}')
      
      // Should show loading indicator
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
      
      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Delayed response')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'Test question{enter}')
      
      await waitFor(() => {
        expect(screen.getByText(/I'm sorry, I'm having technical difficulties/)).toBeInTheDocument()
      })
    })

    it('should show confidence warning for low confidence responses', async () => {
      const user = userEvent.setup()
      
      // Mock low confidence response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: 'Uncertain response',
          confidence: 0.5,
          action: 'answer',
        }),
      } as Response)
      
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'Uncertain question{enter}')
      
      await waitFor(() => {
        expect(screen.getByText(/I'm not entirely sure about this answer/)).toBeInTheDocument()
      })
    })
  })

  describe('Message Sources', () => {
    it('should display source information when available', async () => {
      const user = userEvent.setup()
      
      // Mock response with sources
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: 'Response with sources',
          confidence: 0.9,
          source_ids: ['doc:admission_guide:1', 'doc:fee_structure:2'],
        }),
      } as Response)
      
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      await user.type(input, 'Question with sources{enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Sources:')).toBeInTheDocument()
        expect(screen.getByText('admission_guide - Page 1')).toBeInTheDocument()
        expect(screen.getByText('fee_structure - Page 2')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<ChatInterface />)
      
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument()
    })

    it('should have proper form labels', () => {
      render(<ChatInterface />)
      
      const input = screen.getByPlaceholderText(/Type your message/)
      expect(input).toHaveAttribute('placeholder')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)
      
      // Tab should focus on input
      await user.tab()
      const input = screen.getByPlaceholderText(/Type your message/)
      expect(input).toHaveFocus()
      
      // Tab should move to send button
      await user.tab()
      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toHaveFocus()
    })
  })
})