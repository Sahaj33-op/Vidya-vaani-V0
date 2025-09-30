import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only'
process.env.KV_REST_API_URL = 'test-redis-url'
process.env.KV_REST_API_TOKEN = 'test-redis-token'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Web Speech API
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    {
      name: 'Test Voice',
      lang: 'en-US',
      voiceURI: 'test-voice',
      localService: true,
      default: true,
    }
  ]),
  onvoiceschanged: null,
  pending: false,
  speaking: false,
  paused: false,
}

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
}))



// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Global test utilities
global.testUtils = {
  // Common test data
  mockUser: {
    id: 'test-user-123',
    name: 'Test User',
  },
  mockMessage: {
    id: '1',
    text: 'Test message',
    sender: 'user',
    timestamp: new Date(),
  },
  // Common assertions
  expectElementToBeInDocument: (element) => {
    expect(element).toBeInTheDocument()
  },
  expectElementToHaveText: (element, text) => {
    expect(element).toHaveTextContent(text)
  },
}

// Custom matchers for better test assertions
expect.extend({
  toBeValidLanguageCode(received) {
    const validLanguageCodes = ['en', 'hi', 'mr', 'mwr']
    const pass = validLanguageCodes.includes(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid language code`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid language code`,
        pass: false,
      }
    }
  },
  
  toHaveValidMessageStructure(received) {
    const requiredFields = ['id', 'text', 'sender', 'timestamp']
    const pass = requiredFields.every(field => received.hasOwnProperty(field))
    
    if (pass) {
      return {
        message: () => `expected message to not have valid structure`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected message to have valid structure with fields: ${requiredFields.join(', ')}`,
        pass: false,
      }
    }
  },
})

// Mock Next.js Request/Response for API routes
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this.body = options.body || null
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.headers = new Map(Object.entries(options.headers || {}))
      this.ok = this.status >= 200 && this.status < 300
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }
  }
}

// Mock crypto for Node.js environment
if (typeof global.crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
      randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
      subtle: {
        digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      },
    },
  })
}

// Increase timeout for async operations
jest.setTimeout(10000)
