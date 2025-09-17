import { NextRequest, NextResponse } from 'next/server'

const rateLimiter = new Map<string, number[]>()

export function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const userRequests = rateLimiter.get(identifier) || []
  
  // Filter requests within the time window
  const recentRequests = userRequests.filter(time => now - time < windowMs)
  
  if (recentRequests.length >= maxRequests) {
    return false
  }
  
  recentRequests.push(now)
  rateLimiter.set(identifier, recentRequests)
  return true
}

export function rateLimitMiddleware(maxRequests = 10, windowMs = 60000) {
  return async (request: NextRequest) => {
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    if (!checkRateLimit(clientIP, maxRequests, windowMs)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    return null // Continue processing
  }
}
