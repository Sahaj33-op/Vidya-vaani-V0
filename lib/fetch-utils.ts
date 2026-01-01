/**
 * Fetch utilities with timeout support
 */

import { CONFIG } from './config'
import { createLogger } from './logger'

const logger = createLogger('FetchUtils')

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch with automatic timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = CONFIG.API.TIMEOUT_MS, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.warn(`Request timeout after ${timeout}ms`, { url })
        throw new TimeoutError()
      }
    }

    throw error
  }
}

/**
 * Fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = CONFIG.API.RETRY_ATTEMPTS
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, options)
    } catch (error) {
      lastError = error as Error
      logger.warn(`Fetch attempt ${attempt + 1} failed`, { url, error })

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        const delay = CONFIG.API.RETRY_DELAY_MS * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('All retry attempts failed')
}
