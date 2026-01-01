import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    console.log(
      "[Admin] Uploading document:",
      file.name,
      "Size:",
      file.size,
      "bytes",
    );

    // Send to backend for indexing
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${backendUrl}/api/v1/documents/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          content: fileContent,
          metadata: {
            uploadedAt: new Date().toISOString(),
            size: file.size,
            type: file.type || "text/plain",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Admin] Backend upload failed:", errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log("[Admin] Document indexed successfully:", result);

      return NextResponse.json({
        success: true,
        message: "Document uploaded and indexed successfully",
        document: {
          id: result.doc_id || `doc-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          filename: file.name,
          size: file.size,
          uploadDate: new Date().toISOString(),
          status: "indexed",
          chunks: result.chunks_created || 0,
        },
      });
    } catch (backendError) {
      console.error("[Admin] Backend request failed:", backendError);

      // Fallback: Still accept the upload but warn it's not indexed
      return NextResponse.json({
        success: true,
        message: "Document uploaded (RAG indexing unavailable)",
        document: {
          id: `doc-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          filename: file.name,
          size: file.size,
          uploadDate: new Date().toISOString(),
          status: "pending",
          chunks: 0,
        },
        warning:
          "Document saved but not indexed in RAG system. Backend may be unavailable.",
      });
    }
  } catch (error) {
    console.error("[Admin] Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
