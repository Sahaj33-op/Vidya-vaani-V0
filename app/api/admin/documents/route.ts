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

    const redisClient = redis; // Ensure redis is not null for type narrowing

    // Get real documents from Redis/database
    const documentKeys = await redisClient.keys('document:*')
    const documents = await Promise.all(
      documentKeys.map(async (key) => {
        const doc = await redisClient.get(key)
        if (typeof doc === 'string') {
          return JSON.parse(doc)
        }
        return null // Handle non-string or null documents
      })
    )
    
    return NextResponse.json({ documents: documents.filter(Boolean) }) // Filter out nulls
  } catch (error) {
    console.error("[v0] Admin documents API error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
