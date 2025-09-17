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

    // Get real handoff requests from Redis/database
    const handoffKeys = await redisClient.keys("handoff:*")
    const requests = await Promise.all(
      handoffKeys.map(async (key) => {
        const handoff = await redisClient.get(key)
        if (typeof handoff === "string") {
          return JSON.parse(handoff)
        }
        return null // Handle non-string or null handoffs
      })
    )

    return NextResponse.json({ requests: requests.filter(Boolean) })
  } catch (error) {
    console.error("[v0] Admin handoffs API error:", error)
    return NextResponse.json({ error: "Failed to fetch handoff requests" }, { status: 500 })
  }
}
