/**
 * Mock Data Store for Local Development
 * 
 * Provides in-memory storage for documents, handoffs, and stats
 * Data persists during dev server session (module-level state)
 * Replaces Redis when NEXT_PUBLIC_DEV_MODE=true
 */

export interface Document {
    id: string
    title: string
    filename: string
    size: number
    uploadDate: string
    status: "indexed" | "processing" | "error"
    chunks: number
}

export interface HandoffRequest {
    id: string
    userId: string
    timestamp: string
    status: "pending" | "assigned" | "resolved"
    assignedTo?: string
    conversation: Array<{ sender: string; message: string; timestamp: string }>
    priority: "low" | "medium" | "high"
}

class MockDataStore {
    private documents: Map<string, Document> = new Map()
    private handoffs: Map<string, HandoffRequest> = new Map()
    private queryCount: number = 0

    constructor() {
        // Initialize with sample data
        this.initializeSampleData()
    }

    private initializeSampleData() {
        // Sample documents
        const doc1: Document = {
            id: "1",
            title: "Sample Education Document",
            filename: "education-handbook.pdf",
            size: 2048000,
            uploadDate: new Date().toISOString(),
            status: "indexed",
            chunks: 42
        }

        const doc2: Document = {
            id: "2",
            title: "Admission Guidelines",
            filename: "admission-guide.docx",
            size: 1024000,
            uploadDate: new Date().toISOString(),
            status: "processing",
            chunks: 28
        }

        this.documents.set(doc1.id, doc1)
        this.documents.set(doc2.id, doc2)
    }

    // Document operations
    getAllDocuments(): Document[] {
        return Array.from(this.documents.values())
    }

    getDocument(id: string): Document | undefined {
        return this.documents.get(id)
    }

    addDocument(document: Document): void {
        this.documents.set(document.id, document)
    }

    deleteDocument(id: string): boolean {
        return this.documents.delete(id)
    }

    // Handoff operations
    getAllHandoffs(): HandoffRequest[] {
        return Array.from(this.handoffs.values())
    }

    getHandoff(id: string): HandoffRequest | undefined {
        return this.handoffs.get(id)
    }

    addHandoff(handoff: HandoffRequest): void {
        this.handoffs.set(handoff.id, handoff)
    }

    updateHandoff(id: string, updates: Partial<HandoffRequest>): boolean {
        const handoff = this.handoffs.get(id)
        if (!handoff) return false

        this.handoffs.set(id, { ...handoff, ...updates })
        return true
    }

    // Stats operations
    getStats() {
        const documents = this.getAllDocuments()
        const handoffs = this.getAllHandoffs()

        const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks, 0)
        const pendingHandoffs = handoffs.filter(h => h.status === "pending").length

        return {
            totalDocuments: documents.length,
            totalChunks,
            totalQueries: this.queryCount,
            avgResponseTime: 125, // Mock value
            activeUsers: 1, // Mock value
            handoffRequests: pendingHandoffs
        }
    }

    incrementQueryCount(): void {
        this.queryCount++
    }

    // Reset for testing
    reset(): void {
        this.documents.clear()
        this.handoffs.clear()
        this.queryCount = 0
        this.initializeSampleData()
    }
}

// Export singleton instance
export const mockDataStore = new MockDataStore()
