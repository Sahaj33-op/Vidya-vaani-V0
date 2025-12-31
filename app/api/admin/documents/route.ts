import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis-helpers"
import { requireAuth } from "@/lib/auth"
import { mockDataStore } from "@/lib/mock-data-store"

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Development mode: use mock data store
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('[v0] Dev mode: using mock data store for documents')
      const documents = mockDataStore.getAllDocuments()
      return NextResponse.json({ documents })
    }

    // Production mode: use Redis
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
