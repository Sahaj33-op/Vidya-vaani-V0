import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { mockDataStore } from "@/lib/mock-data-store"

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult

    try {
        const { id } = params

        if (!id) {
            return NextResponse.json({ error: "Document ID required" }, { status: 400 })
        }

        // Development mode: delete from mock store
        if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
            console.log('[v0] Dev mode: deleting document:', id)
            const deleted = mockDataStore.deleteDocument(id)

            if (!deleted) {
                return NextResponse.json({ error: "Document not found" }, { status: 404 })
            }

            return NextResponse.json({
                success: true,
                message: "Document deleted successfully"
            })
        }

        // Production mode: delete from Redis/storage would go here
        return NextResponse.json({ error: "Production mode not implemented yet" }, { status: 501 })

    } catch (error) {
        console.error("[v0] Delete error:", error)
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }
}
