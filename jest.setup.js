// Mock environment variables
process.env.KV_REST_API_URL = 'https://test-redis-url.upstash.io';
process.env.KV_REST_API_TOKEN = 'test-token';

// Global test setup
jest.setTimeout(10000); // 10 second timeout for tests