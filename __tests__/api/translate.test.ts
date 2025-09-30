import { POST } from '@/app/api/translate/route';
import * as redisHelpers from '@/lib/redis-helpers';
import { NextRequest } from 'next/server';

// Mock Redis helpers
jest.mock('@/lib/redis-helpers', () => ({
  cacheKeyFor: jest.fn().mockImplementation((lang, text) => `mocked-key-${lang}-${text}`),
  safeRedisGet: jest.fn(),
  safeRedisSet: jest.fn().mockResolvedValue(true),
}));

// Mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { origin: 'http://localhost:3000' },
  } as unknown as NextRequest;
}

// Mock NextResponse.json to return a proper Response object
const mockJson = jest.fn((body, init = {}) => {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

jest.mock('next/server', () => ({
  NextRequest,
  NextResponse: {
    json: mockJson,
  },
}));

describe('Translation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 when text is missing', async () => {
    const mockRequest = createMockRequest({ target_lang: 'hi' });
    const response = await POST(mockRequest);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Text is required');
  });

  it('should return 400 when target language is missing', async () => {
    const mockRequest = createMockRequest({ text: 'Hello world' });
    const response = await POST(mockRequest);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Target language is required');
  });

  it('should return cached response when available', async () => {
    const cachedResponse = {
      translated_text: 'नमस्ते दुनिया',
      source_lang: 'en',
      target_lang: 'hi',
      confidence: 0.9,
      method: 'cached',
    };
    
    (redisHelpers.safeRedisGet as jest.Mock).mockResolvedValue(cachedResponse);
    
    const mockRequest = createMockRequest({
      text: 'Hello world',
      target_lang: 'hi',
    });
    
    const response = await POST(mockRequest);
    
    expect(redisHelpers.cacheKeyFor).toHaveBeenCalled();
    expect(redisHelpers.safeRedisGet).toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual(cachedResponse);
  });

  it('should translate text and cache the result when no cache exists', async () => {
    (redisHelpers.safeRedisGet as jest.Mock).mockResolvedValue(null);
    
    const mockRequest = createMockRequest({
      text: 'Hello world',
      source_lang: 'en',
      target_lang: 'hi',
    });
    
    const response = await POST(mockRequest);
    
    expect(redisHelpers.safeRedisGet).toHaveBeenCalled();
    expect(redisHelpers.safeRedisSet).toHaveBeenCalled();
    const body = await response.json();
    expect(body.translated_text).toBeTruthy();
    expect(body.source_lang).toBe('en');
    expect(body.target_lang).toBe('hi');
  });

  it('should handle errors gracefully', async () => {
    (redisHelpers.safeRedisGet as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    const mockRequest = createMockRequest({
      text: 'Hello world',
      target_lang: 'hi',
    });
    
    const response = await POST(mockRequest);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Translation service unavailable');
  });
});
