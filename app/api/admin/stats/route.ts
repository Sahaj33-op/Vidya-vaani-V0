import { type NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis-helpers";
import { requireAuth } from "@/lib/auth";
import { mockDataStore } from "@/lib/mock-data-store";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Development mode: use mock data store
    if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
      console.log("[v0] Dev mode: using mock data store for stats");
      const stats = mockDataStore.getStats();
      return NextResponse.json(stats);
    }

    // Production mode: use Redis
    if (!redis) {
      console.error("[v0] Redis client not initialized.");
      return NextResponse.json(
        { error: "Internal server error: Redis not available" },
        { status: 500 },
      );
    }

    const redisClient = redis;

    const totalDocuments = (await redisClient.keys("document:*")).length;
    const totalHandoffRequests = (await redisClient.keys("handoff:*")).length;

    const stats = {
      totalDocuments: totalDocuments,
      totalChunks: 0,
      totalQueries: 0,
      avgResponseTime: 0,
      activeUsers: 0,
      handoffRequests: totalHandoffRequests,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[v0] Admin stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system stats" },
      { status: 500 },
    );
  }
}
