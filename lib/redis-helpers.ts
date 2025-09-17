import { Redis } from "@upstash/redis"
import crypto from "crypto"

let redis: Redis | null = null

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
export function initializeRedis(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    console.log("[v0] Redis config validation:", {
      hasUrl: !!url,
      hasToken: !!token,
      urlValid: url?.startsWith("https://"),
      tokenLength: token?.length || 0,
    })

    if (!url || !token) {
      console.warn("[v0] Redis credentials missing, running without cache")
      return null
    }

    if (!url.startsWith("https://")) {
      console.error("[v0] Invalid Redis URL format")
      return null
    }

    const redisClient = new Redis({
      url: url,
      token: token,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
    })

    console.log("[v0] Redis client initialized successfully")
    return redisClient
  } catch (error) {
    console.error("[v0] Redis initialization failed:", error)
    return null
  }
}

/**
 * Safely retrieves a value from Redis with error handling
 * @param key Redis key
 * @returns Retrieved value or null if operation fails
 */
export async function safeRedisGet(key: string): Promise<any> {
  if (!redis) {
    redis = initializeRedis()
    if (!redis) return null
  }

  try {
    console.log("[v0] Attempting Redis get with key:", key)
    const result = await redis.get(key)
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
 * @param ttl Time-to-live in seconds
 * @returns Success status
 */
export async function safeRedisSet(key: string, value: any, ttl: number): Promise<boolean> {
  if (!redis) {
    redis = initializeRedis()
    if (!redis) return false
  }

  try {
    // Ensure value is properly stringified
    const payload = typeof value === "string" ? value : JSON.stringify(value)
    
    // Handle different Redis client API patterns
    if (typeof redis.setex === 'function') {
      await redis.setex(key, ttl, payload)
    } else {
      await redis.set(key, payload, { ex: ttl })
    }
    
    console.log("[v0] Redis set successful")
    return true
  } catch (error) {
    console.error("[v0] Redis set error:", error)
    return false
  }
}