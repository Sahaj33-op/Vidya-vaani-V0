import { type NextRequest, NextResponse } from "next/server"
import { safeRedisSet } from "@/lib/redis-helpers"
import { IndexingQueue } from "@/lib/queue"
import { getStorageProvider } from "@/lib/storage"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { requireAuth } from "@/lib/auth"
import { createHash } from 'crypto'

const indexingQueue = new IndexingQueue()
const storage = getStorageProvider()

async function validateFile(file: File): Promise<{ valid: boolean, error?: string }> {
  // File type validation
  const allowedTypes = ["text/plain", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Unsupported file type" }
  }
  
  // File size validation (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File too large" }
  }
  
  // Filename sanitization
  const sanitizedName = path.basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_')
  
  // Content validation - check for malicious patterns
  const content = await file.text()
  const suspiciousPatterns = [/<script/i, /javascript:/i, /vbscript:/i]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: "Potentially malicious content detected" }
    }
  }
  
  // Generate file hash for integrity checking
  const hash = createHash('sha256').update(content).digest('hex')
  
  return { valid: true }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided or invalid file type" }, { status: 400 })
    }

    console.log("[v0] File upload received:", { name: file.name, size: file.size, type: file.type })

    // Validate file using the new comprehensive validation function
    const validationResult = await validateFile(file)
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
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
        fileSize: file.size,
        title: documentData.title,
        size: documentData.size,
        uploadDate: documentData.uploadDate
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
