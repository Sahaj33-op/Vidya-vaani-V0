// Mock implementation of react-speech-recognition for testing
const mockUseSpeechRecognition = {
  transcript: '',
  listening: false,
  resetTranscript: jest.fn(),
  browserSupportsSpeechRecognition: true,
}

const mockSpeechRecognition = {
  startListening: jest.fn(),
  stopListening: jest.fn(),
  abortListening: jest.fn(),
}

// Allow tests to control the mock state
mockSpeechRecognition.setListening = (listening) => {
  mockUseSpeechRecognition.listening = listening
}

mockSpeechRecognition.setTranscript = (transcript) => {
  mockUseSpeechRecognition.transcript = transcript
}

mockSpeechRecognition.setBrowserSupport = (supported) => {
  mockUseSpeechRecognition.browserSupportsSpeechRecognition = supported
}

// Reset mock state
mockSpeechRecognition.reset = () => {
  mockUseSpeechRecognition.transcript = ''
  mockUseSpeechRecognition.listening = false
  mockUseSpeechRecognition.browserSupportsSpeechRecognition = true
  jest.clearAllMocks()
}

module.exports = {
  __esModule: true,
  default: mockSpeechRecognition,
  useSpeechRecognition: jest.fn(() => mockUseSpeechRecognition),
}