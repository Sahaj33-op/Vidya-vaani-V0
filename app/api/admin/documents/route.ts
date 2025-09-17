import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    // Simulate document retrieval from database
    const documents = [
      {
        id: "doc_1",
        title: "Admission Guide 2024",
        filename: "admission_guide_2024.pdf",
        size: 2048000,
        uploadDate: "2024-01-15T10:30:00Z",
        status: "indexed",
        chunks: 45,
      },
      {
        id: "doc_2",
        title: "Fee Structure",
        filename: "fee_structure.txt",
        size: 512000,
        uploadDate: "2024-01-14T14:20:00Z",
        status: "indexed",
        chunks: 12,
      },
      {
        id: "doc_3",
        title: "Academic Calendar",
        filename: "academic_calendar.docx",
        size: 1024000,
        uploadDate: "2024-01-13T09:15:00Z",
        status: "processing",
        chunks: 0,
      },
    ]

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("[v0] Admin documents API error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
