import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis-helpers"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    if (!redis) {
      console.error("[v0] Redis client not initialized.")
      return NextResponse.json({ error: "Internal server error: Redis not available" }, { status: 500 })
    }

    const redisClient = redis // Ensure redis is not null for type narrowing

    // Get real statistics from Redis
    const totalDocuments = (await redisClient.keys("document:*")).length
    const totalHandoffRequests = (await redisClient.keys("handoff:*")).length
    // For totalChunks, totalQueries, avgResponseTime, activeUsers, we would need to store and retrieve this data.
    // For now, these will remain simulated or be set to 0.
    const stats = {
      totalDocuments: totalDocuments,
      totalChunks: 0, // Placeholder, needs actual implementation to track chunks
      totalQueries: 0, // Placeholder, needs actual implementation to track queries
      avgResponseTime: 0, // Placeholder, needs actual implementation to track response times
      activeUsers: 0, // Placeholder, needs actual implementation to track active users
      handoffRequests: totalHandoffRequests,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Admin stats API error:", error)
    return NextResponse.json({ error: "Failed to fetch system stats" }, { status: 500 })
  }
}
