import { cacheKeyFor, initializeRedis, safeRedisGet, safeRedisSet } from '@/lib/redis-helpers';
import crypto from 'crypto';

// Mock Redis client
jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockImplementation((key) => Promise.resolve(`{"mocked":"data-for-${key}"}`)),
      set: jest.fn().mockImplementation(() => Promise.resolve('OK')),
      setex: jest.fn().mockImplementation(() => Promise.resolve('OK')),
    })),
  };
});

// Mock crypto for deterministic tests
jest.mock('crypto', () => ({
  createHash: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash'),
  })),
}));

describe('Redis Helpers', () => {
  describe('cacheKeyFor', () => {
    it('should normalize text and create a hashed key', () => {
      const result = cacheKeyFor('en', '  Test Message  ');
      
      // Verify text was normalized
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.createHash('sha256').update).toHaveBeenCalledWith('test message');
      
      // Verify key format
      expect(result).toBe('chat:en:mocked-hash');
    });

    it('should handle different languages correctly', () => {
      const result = cacheKeyFor('hi', 'नमस्ते');
      expect(result).toBe('chat:hi:mocked-hash');
    });
  });

  describe('initializeRedis', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });
    
    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return null when Redis credentials are missing', () => {
      process.env.KV_REST_API_URL = '';
      process.env.KV_REST_API_TOKEN = '';
      
      const redis = initializeRedis();
      expect(redis).toBeNull();
    });

    it('should return null when Redis URL is invalid', () => {
      process.env.KV_REST_API_URL = 'invalid-url';
      process.env.KV_REST_API_TOKEN = 'test-token';
      
      const redis = initializeRedis();
      expect(redis).toBeNull();
    });

    it('should initialize Redis client with valid credentials', () => {
      process.env.KV_REST_API_URL = 'https://valid-url.upstash.io';
      process.env.KV_REST_API_TOKEN = 'test-token';
      
      const redis = initializeRedis();
      expect(redis).not.toBeNull();
    });
  });

  describe('safeRedisGet', () => {
    it('should handle JSON parsing of string results', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      mockRedisInstance.get.mockResolvedValueOnce('{"key":"value"}');
      
      const result = await safeRedisGet('test-key');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return non-JSON strings as is', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      mockRedisInstance.get.mockResolvedValueOnce('plain text');
      
      const result = await safeRedisGet('test-key');
      expect(result).toBe('plain text');
    });

    it('should handle Redis errors gracefully', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await safeRedisGet('test-key');
      expect(result).toBeNull();
    });
  });

  describe('safeRedisSet', () => {
    it('should stringify objects before storing', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      
      const testObject = { test: 'data' };
      await safeRedisSet('test-key', testObject, 60);
      
      // Check if setex was called with stringified data
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key', 
        60, 
        JSON.stringify(testObject)
      );
    });

    it('should use set with ex option when setex is not available', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      
      // Remove setex method to test fallback
      mockRedisInstance.setex = undefined;
      
      await safeRedisSet('test-key', 'test-value', 60);
      
      // Check if set was called with ex option
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key', 
        'test-value', 
        { ex: 60 }
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedisInstance = new Redis();
      mockRedisInstance.setex.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await safeRedisSet('test-key', 'test-value', 60);
      expect(result).toBe(false);
    });
  });
});