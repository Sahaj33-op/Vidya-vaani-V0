import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // Fetch stats from backend
    try {
      const response = await fetch(`${backendUrl}/api/v1/admin/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const backendStats = await response.json();
        return NextResponse.json(backendStats);
      }
    } catch (backendError) {
      console.error("[v0] Backend stats unavailable:", backendError);
    }

    // Fallback to basic stats
    const stats = {
      totalDocuments: 0,
      totalChunks: 0,
      totalQueries: 0,
      avgResponseTime: 0,
      activeUsers: 0,
      handoffRequests: 0,
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
