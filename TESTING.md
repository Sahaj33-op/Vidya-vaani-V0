# Testing Guide - Vidya Vaani

This document provides comprehensive information about testing the Vidya Vaani multilingual chatbot application.

## Overview

Our testing strategy includes multiple layers of testing to ensure reliability, functionality, and performance:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **End-to-End Tests**: Test complete user workflows in a real browser
- **Backend Tests**: Test Python services and voice processing

## Test Structure

```
tests/
├── __mocks__/                 # Mock implementations
│   └── react-speech-recognition.js
├── unit/                      # Unit tests for components and hooks
│   ├── useVoice.test.tsx
│   └── ChatInterface.test.tsx
├── integration/               # API and service integration tests
│   └── api.test.tsx
├── e2e/                      # End-to-end browser tests
│   └── chat-interface.spec.ts
└── setup.js                  # Jest test setup

backend/tests/                 # Python backend tests
├── test_voice_service.py
└── test_translation_service.py
```

## Running Tests

### Frontend Tests

```bash
# Run all frontend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

### Backend Tests

```bash
# Run Python tests
npm run test:backend

# Run with verbose output
npm run test:backend:verbose

# Run with coverage
npm run test:backend:coverage
```

### All Tests

```bash
# Run complete test suite
npm run test:all
```

## Test Categories

### 1. Unit Tests

#### Voice Hook Tests (`tests/unit/useVoice.test.tsx`)

Tests the custom voice hook functionality:

- **Speech Recognition**:
  - Initialization with default values
  - Starting/stopping listening
  - Language mapping (en, hi, mr, mwr)
  - Browser support detection
  - Transcript handling

- **Speech Synthesis**:
  - Text-to-speech functionality
  - Language-specific voice selection
  - Error handling
  - State management (isSpeaking)

- **Error Handling**:
  - Graceful fallbacks
  - Network errors
  - Browser compatibility

#### Chat Interface Tests (`tests/unit/ChatInterface.test.tsx`)

Tests the main chat component:

- **Initial Render**:
  - Welcome message display
  - Language selector
  - Quick action buttons
  - Input field presence

- **Message Interaction**:
  - Sending messages
  - Receiving responses
  - Input clearing
  - Enter key handling

- **Language Features**:
  - Language selection
  - Placeholder updates
  - Multilingual message handling

- **Voice Features**:
  - Voice button visibility
  - Voice state management
  - Speaking indicators

- **Accessibility**:
  - ARIA labels
  - Keyboard navigation
  - Screen reader support

### 2. Integration Tests

#### API Tests (`tests/integration/api.test.tsx`)

Tests actual API endpoint behavior:

- **Chat API (`/api/ask`)**:
  - Valid request handling
  - Cached response retrieval
  - Intent detection
  - Multilingual processing
  - Error handling

- **Translation API (`/api/translate`)**:
  - Translation requests
  - Language detection
  - Marwari fallback handling
  - Field validation

- **Voice API (`/api/voice`)**:
  - Transcription requests
  - Synthesis requests
  - Parameter validation

- **System Features**:
  - Rate limiting
  - Caching behavior
  - Error recovery

### 3. End-to-End Tests

#### Chat Interface E2E (`tests/e2e/chat-interface.spec.ts`)

Tests complete user workflows:

- **Basic Functionality**:
  - Page loading
  - Message sending/receiving
  - UI interactions

- **Quick Actions**:
  - Button interactions
  - Predefined queries
  - UI state changes

- **Language Selection**:
  - Language switching
  - Placeholder updates
  - Multilingual messaging

- **Voice Features**:
  - Voice button interactions
  - State changes
  - Error handling

- **Responsive Design**:
  - Mobile viewport testing
  - Touch interactions
  - Keyboard handling

- **Accessibility**:
  - ARIA compliance
  - Keyboard navigation
  - Screen reader compatibility

- **Error Handling**:
  - Network failures
  - API timeouts
  - Graceful degradation

### 4. Backend Tests

#### Voice Service Tests (`backend/tests/test_voice_service.py`)

Tests Python voice processing:

- **Initialization**:
  - Model loading
  - Dependency checking
  - Error handling

- **Audio Processing**:
  - Format validation
  - Base64 decoding
  - Whisper integration
  - SpeechRecognition fallback

- **Language Support**:
  - Language mapping
  - Marwari fallback
  - Confidence scoring

- **Error Handling**:
  - File operations
  - Model failures
  - Network issues

## Testing Best Practices

### 1. Mock External Dependencies

- **Speech APIs**: Mocked for consistent testing
- **Network Requests**: Controlled responses
- **File Operations**: Temporary files and cleanup
- **Environment Variables**: Test-specific values

### 2. Comprehensive Coverage

- **Happy Path**: Normal usage scenarios
- **Edge Cases**: Invalid inputs, empty states
- **Error Conditions**: Network failures, API errors
- **Browser Variations**: Different environments

### 3. Performance Considerations

- **Response Times**: API call timeouts
- **Memory Usage**: Cleanup after tests
- **Resource Management**: File and connection cleanup

### 4. Accessibility Testing

- **Keyboard Navigation**: Tab order and focus
- **Screen Readers**: ARIA labels and roles
- **Color Contrast**: Visual accessibility
- **Mobile Support**: Touch and responsive design

## Test Data Management

### Mock Data

```javascript
// Example test data structures
const mockMessage = {
  id: '1',
  text: 'Test message',
  sender: 'user',
  timestamp: new Date(),
}

const mockVoiceResponse = {
  success: true,
  transcribed_text: 'Hello world',
  confidence: 0.85,
  method: 'whisper'
}
```

### Test Fixtures

- **Audio Data**: Base64 encoded sample audio
- **API Responses**: Typical response structures
- **User Interactions**: Common user actions
- **Language Examples**: Multilingual test cases

## Debugging Tests

### Frontend Debugging

```bash
# Run tests in debug mode
npm run test:watch --verbose

# Debug specific test file
npm test -- --testNamePattern="Chat Interface"

# Run with detailed output
npm test -- --verbose --coverage
```

### E2E Debugging

```bash
# Run with browser UI
npm run test:e2e:ui

# Debug mode with step-through
npm run test:e2e:debug

# Run specific test
npx playwright test --grep "should send messages"
```

### Backend Debugging

```bash
# Run with verbose output
pytest -v -s

# Run specific test file
pytest tests/test_voice_service.py -v

# Debug with breakpoints
pytest --pdb
```

## Continuous Integration

### Test Pipeline

1. **Lint Check**: Code quality validation
2. **Unit Tests**: Component isolation testing
3. **Integration Tests**: API contract testing
4. **Build Verification**: Application builds successfully
5. **E2E Tests**: User workflow validation

### Coverage Requirements

- **Unit Tests**: > 80% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user journeys covered
- **Backend Tests**: > 90% Python service coverage

## Common Test Scenarios

### Multilingual Testing

```javascript
const languageTests = [
  { lang: 'en', text: 'Hello world', expected: 'en' },
  { lang: 'hi', text: 'नमस्ते दुनिया', expected: 'hi' },
  { lang: 'mr', text: 'नमस्कार जग', expected: 'mr' },
  { lang: 'mwr', text: 'थारो नाम क्या है', expected: 'mwr' },
]
```

### Voice Processing Testing

```python
def test_voice_transcription():
    audio_data = base64.b64encode(b"fake audio").decode()
    result = voice_service.transcribe_audio(audio_data, "en")
    assert result['success'] is True
    assert 'transcribed_text' in result
```

### Error Handling Testing

```javascript
test('should handle API errors gracefully', async () => {
  // Mock API failure
  mockFetch.mockRejectedValue(new Error('Network error'))
  
  // Trigger error scenario
  await userAction()
  
  // Verify graceful handling
  expect(screen.getByText(/error message/)).toBeVisible()
})
```

## Performance Testing

### Load Testing

- **Concurrent Users**: Test multiple simultaneous conversations
- **API Response Times**: Measure endpoint performance
- **Memory Usage**: Monitor resource consumption
- **Cache Efficiency**: Validate caching strategies

### Stress Testing

- **High Message Volume**: Rapid message sending
- **Large Audio Files**: Voice processing limits
- **Long Conversations**: Extended session handling
- **Resource Exhaustion**: Graceful degradation

## Reporting

### Test Results

- **Coverage Reports**: HTML coverage visualization
- **Test Reports**: Detailed pass/fail information
- **Performance Metrics**: Response time analysis
- **Error Logs**: Detailed failure information

### Monitoring

- **Test Execution Times**: Track test performance
- **Flaky Test Detection**: Identify unstable tests
- **Coverage Trends**: Monitor coverage changes
- **Success Rates**: Track test reliability

This comprehensive testing approach ensures the Vidya Vaani application is robust, reliable, and ready for the Smart India Hackathon demonstration.