import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { mockDataStore } from "@/lib/mock-data-store"
import type { Document } from "@/lib/mock-data-store"

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Development mode: simulate file upload
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('[v0] Dev mode: simulating file upload for:', file.name)

      // Create mock document
      const newDocument: Document = {
        id: `doc-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        filename: file.name,
        size: file.size,
        uploadDate: new Date().toISOString(),
        status: "indexed",
        chunks: Math.floor(Math.random() * 50) + 10 // Random chunk count
      }

      mockDataStore.addDocument(newDocument)

      return NextResponse.json({
        success: true,
        message: "Document uploaded successfully",
        document: newDocument
      })
    }

    // Production mode: actual file upload logic would go here
    // This would involve saving to storage (S3, Supabase) and Redis
    return NextResponse.json({ error: "Production mode not implemented yet" }, { status: 501 })

  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
