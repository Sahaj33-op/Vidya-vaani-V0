import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // Fetch handoffs from backend
    try {
      const response = await fetch(`${backendUrl}/api/v1/handoffs/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const backendData = await response.json();
        return NextResponse.json({ requests: backendData.handoffs || [] });
      }
    } catch (backendError) {
      console.error("[v0] Backend handoffs unavailable:", backendError);
    }

    // Fallback to empty list
    return NextResponse.json({ requests: [] });
  } catch (error) {
    console.error("[v0] Admin handoffs API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch handoff requests" },
      { status: 500 },
    );
  }
}
