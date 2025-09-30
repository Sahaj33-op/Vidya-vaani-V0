import { Redis as UpstashRedis } from "@upstash/redis"
import { createClient, RedisClientType } from "redis"
import crypto from "crypto"

type RedisClient = UpstashRedis | RedisClientType

class RedisManager {
  private static instance: RedisClient | null = null

  static getInstance(): RedisClient | null {
    if (!this.instance) {
      this.instance = this.initializeConnection()
    }
    return this.instance
  }

  private static initializeConnection(): RedisClient | null {
    try {
      // Check for HTTP-based Redis (Upstash/Vercel KV)
      const httpUrl = process.env.KV_REST_API_URL
      const token = process.env.KV_REST_API_TOKEN

      if (httpUrl && token && httpUrl.startsWith("https://")) {
        console.log("[v0] Initializing HTTP-based Redis client (Upstash/Vercel KV)")
        const redisClient = new UpstashRedis({
          url: httpUrl,
          token: token,
          retry: {
            retries: 3,
            backoff: (retryCount) => Math.exp(retryCount) * 100,
          },
        })
        console.log("[v0] HTTP Redis client initialized successfully")
        return redisClient
      }

      // Check for standard TCP Redis connection
      const tcpUrl = process.env.REDIS_URL || process.env.REDIS_TCP_URL || "redis://localhost:6379"

      if (tcpUrl && tcpUrl.startsWith("redis://")) {
        console.log("[v0] Initializing TCP-based Redis client (local Redis)")
        const redisClient = createClient({
          url: tcpUrl,
          socket: {
            connectTimeout: 60000,
            lazyConnect: true,
          },
          retry_strategy: (options: any) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.error('Redis server connection refused')
              return new Error('Redis server connection refused')
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              console.error('Redis retry time exhausted')
              return new Error('Retry time exhausted')
            }
            if (options.attempt > 10) {
              console.error('Redis retry attempts exhausted')
              return new Error('Retry attempts exhausted')
            }
            // Exponential backoff
            return Math.min(options.attempt * 100, 3000)
          }
        })

        // Handle connection events
        redisClient.on('error', (err: any) => {
          console.error('Redis client error:', err)
        })

        redisClient.on('connect', () => {
          console.log('[v0] TCP Redis client connected successfully')
        })

        redisClient.on('ready', () => {
          console.log('[v0] TCP Redis client ready')
        })

        redisClient.on('end', () => {
          console.log('[v0] TCP Redis client connection ended')
        })

        // Connect to Redis (lazy connection will happen on first command)
        redisClient.connect().catch((err: any) => {
          console.error('Failed to connect to Redis:', err)
          return null
        })

        return redisClient
      }

      console.warn("[v0] No valid Redis configuration found, running without cache")
      console.warn("[v0] For HTTP Redis (Upstash/Vercel KV): set KV_REST_API_URL and KV_REST_API_TOKEN")
      console.warn("[v0] For local TCP Redis: set REDIS_URL (default: redis://localhost:6379)")
      return null

    } catch (error) {
      console.error("Redis connection failed:", error)
      return null
    }
  }
}

export const redis = RedisManager.getInstance()

/**
 * Creates a secure, hashed Redis cache key from language and text
 * @param lang Language code
 * @param text User input text
 * @returns Formatted cache key using SHA-256 hash
 */
export function cacheKeyFor(lang: string, text: string): string {
  const normalized = text.trim().toLowerCase()
  const hash = crypto.createHash("sha256").update(normalized).digest("hex")
  return `chat:${lang}:${hash}`
}

/**
 * Initializes Redis client with error handling
 * @returns Redis client or null if initialization fails
 */
export function initializeRedis(): RedisClient | null {
  return RedisManager.getInstance()
}

/**
 * Safely retrieves a value from Redis with error handling
 * @param key Redis key
 * @returns Retrieved value or null if operation fails
 */
export async function safeRedisGet(key: string): Promise<any> {
  const redisClient = RedisManager.getInstance()
  if (!redisClient) return null

  try {
    console.log("[v0] Attempting Redis get with key:", key)
    const result = await redisClient.get(key)
    console.log("[v0] Redis get successful:", !!result)
    
    // Parse JSON if the result is a string
    if (typeof result === "string") {
      try {
        return JSON.parse(result)
      } catch {
        return result
      }
    }
    
    return result
  } catch (error) {
    console.error("[v0] Redis get error:", error)
    return null
  }
}

/**
 * Safely sets a value in Redis with error handling and TTL
 * @param key Redis key
 * @param value Value to store
 * @param ttl Time-to-live in seconds (default: 86400 = 24 hours)
 * @returns Success status
 */
export async function safeRedisSet(key: string, value: any, ttl: number = 86400): Promise<boolean> {
  const redisClient = RedisManager.getInstance()
  if (!redisClient) return false

  try {
    // Ensure value is properly stringified
    const payload = typeof value === "string" ? value : JSON.stringify(value)
    
    // Upstash Redis uses set with ex option
    await redisClient.set(key, payload, { ex: ttl })
    
    console.log("[v0] Redis set successful")
    return true
  } catch (error) {
    console.error("[v0] Redis set error:", error)
    return false
  }
}
