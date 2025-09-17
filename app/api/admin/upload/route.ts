import { type NextRequest, NextResponse } from "next/server"
import { safeRedisSet } from "@/lib/redis-helpers"
import { IndexingQueue } from "@/lib/queue"
import { getStorageProvider } from "@/lib/storage"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const indexingQueue = new IndexingQueue()
const storage = getStorageProvider()

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

    // Generate unique IDs
    const docId = `doc_${Date.now()}`
    const jobId = uuidv4()
    
    // Read file content
    const fileContent = await file.text()
    
    // Generate storage path
    const fileExtension = path.extname(file.name)
    const storagePath = `documents/${docId}${fileExtension}`
    
    // Save file to storage
    await storage.saveFile(storagePath, fileContent)
    console.log(`[v0] File saved to storage at: ${storagePath}`)

    // Create document metadata (without content)
    const documentData = {
      id: docId,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      filename: file.name,
      size: file.size,
      uploadDate: new Date().toISOString(),
      status: "queued",
      chunks: 0,
      storagePath: storagePath,
    }

    // Store document metadata in Redis
    await safeRedisSet(`document:${docId}`, documentData)

    // Create job and add to indexing queue
    const jobResult = await indexingQueue.enqueue({
      docId,
      storagePath,
      metadata: {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size
      }
    })
    
    if (!jobResult.success) {
      throw new Error("Failed to enqueue document for processing")
    }
    
    console.log("[v0] Document queued for processing:", { docId, jobId: jobResult.jobId })

    // Return 202 Accepted with job information
    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        title: documentData.title,
        filename: documentData.filename,
        status: "queued",
      },
      job: {
        id: jobResult.jobId,
        status: "queued"
      }
    }, { status: 202 }) // 202 Accepted
  } catch (error) {
    console.error("[v0] Upload API error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
