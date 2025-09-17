import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    // Simulate handoff requests retrieval
    const requests = [
      {
        id: "handoff_1",
        userId: "user_123",
        timestamp: "2024-01-15T15:30:00Z",
        status: "pending",
        priority: "high",
        conversation: [
          { sender: "user", message: "I need help with my admission application", timestamp: "2024-01-15T15:25:00Z" },
          {
            sender: "bot",
            message: "I can help with admission information. What specific details do you need?",
            timestamp: "2024-01-15T15:25:30Z",
          },
          { sender: "user", message: "I want to talk to a human", timestamp: "2024-01-15T15:30:00Z" },
        ],
      },
      {
        id: "handoff_2",
        userId: "user_456",
        timestamp: "2024-01-15T14:45:00Z",
        status: "assigned",
        assignedTo: "volunteer1",
        priority: "medium",
        conversation: [
          { sender: "user", message: "मुझे फीस के बारे में जानकारी चाहिए", timestamp: "2024-01-15T14:40:00Z" },
          {
            sender: "bot",
            message: "Fee information is available. Which program are you interested in?",
            timestamp: "2024-01-15T14:40:30Z",
          },
          { sender: "user", message: "I need to speak with someone in Hindi", timestamp: "2024-01-15T14:45:00Z" },
        ],
      },
    ]

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("[v0] Admin handoffs API error:", error)
    return NextResponse.json({ error: "Failed to fetch handoff requests" }, { status: 500 })
  }
}
