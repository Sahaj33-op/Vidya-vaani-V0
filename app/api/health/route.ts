import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis-helpers'

export async function GET() {
  try {
    // Check Redis connection
    if (!redis) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Redis connection not available',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Try to ping Redis
    await redis.ping()

    return NextResponse.json(
      {
        status: 'healthy',
        services: {
          redis: 'connected',
          api: 'running'
        },
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Service unhealthy',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}