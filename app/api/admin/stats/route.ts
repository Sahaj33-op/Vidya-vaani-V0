import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    // Simulate system statistics
    const stats = {
      totalDocuments: 15,
      totalChunks: 342,
      totalQueries: 1247,
      avgResponseTime: 850,
      activeUsers: 23,
      handoffRequests: 2,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Admin stats API error:", error)
    return NextResponse.json({ error: "Failed to fetch system stats" }, { status: 500 })
  }
}
