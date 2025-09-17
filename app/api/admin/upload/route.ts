import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] File upload received:", { name: file.name, size: file.size, type: file.type })

    // Validate file type
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB" }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()

    // Simulate document processing
    const docId = `doc_${Date.now()}`
    const documentData = {
      id: docId,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      filename: file.name,
      size: file.size,
      uploadDate: new Date().toISOString(),
      status: "processing",
      chunks: 0,
      content: fileContent,
    }

    // Store document metadata in Redis
    await redis.set(`document:${docId}`, JSON.stringify(documentData))

    // In production, this would trigger the RAG indexing pipeline
    console.log("[v0] Document stored for processing:", docId)

    // Simulate processing completion after a delay
    setTimeout(async () => {
      try {
        const updatedDoc = {
          ...documentData,
          status: "indexed",
          chunks: Math.floor(fileContent.length / 500), // Simulate chunk count
        }
        await redis.set(`document:${docId}`, JSON.stringify(updatedDoc))
        console.log("[v0] Document processing completed:", docId)
      } catch (error) {
        console.error("[v0] Document processing error:", error)
      }
    }, 3000)

    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        title: documentData.title,
        filename: documentData.filename,
        status: "processing",
      },
    })
  } catch (error) {
    console.error("[v0] Upload API error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
