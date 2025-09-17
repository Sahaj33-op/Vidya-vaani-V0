import { IndexingQueue } from "../lib/queue";
import { initializeRedis, safeRedisGet, safeRedisSet } from "../lib/redis-helpers";

// Initialize Redis client
const redis = initializeRedis();
const queue = new IndexingQueue();

// Configuration
const CHUNK_SIZE = 500; // Characters per chunk
const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_CONCURRENT_JOBS = 2;

// Processing state
let activeJobs = 0;
let isRunning = true;

/**
 * Process a document from the queue
 * @param documentId Document ID to process
 */
async function processDocument(documentId: string): Promise<void> {
  console.log(`[Worker] Processing document: ${documentId}`);
  
  try {
    // Get document data from Redis
    const documentData = await safeRedisGet(`document:${documentId}`);
    
    if (!documentData) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    // Extract content and create chunks
    const { content, title, filename } = documentData;
    
    if (!content) {
      throw new Error(`Document ${documentId} has no content`);
    }
    
    // Create chunks from content
    const chunks = createChunks(content, CHUNK_SIZE);
    console.log(`[Worker] Created ${chunks.length} chunks for document ${documentId}`);
    
    // Store each chunk in Redis
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${documentId}_chunk_${i}`;
      await safeRedisSet(`chunk:${chunkId}`, {
        id: chunkId,
        documentId,
        content: chunks[i],
        index: i,
        metadata: {
          title,
          filename,
          totalChunks: chunks.length
        }
      });
    }
    
    // Update document status
    const updatedDoc = {
      ...documentData,
      status: "indexed",
      chunks: chunks.length,
      indexedAt: new Date().toISOString()
    };
    
    await safeRedisSet(`document:${documentId}`, updatedDoc);
    
    // Mark job as complete
    await queue.complete(documentId, {
      chunks: chunks.length,
      indexedAt: new Date().toISOString()
    });
    
    console.log(`[Worker] Successfully indexed document: ${documentId} (${chunks.length} chunks)`);
  } catch (error) {
    console.error(`[Worker] Failed to process document ${documentId}:`, error);
    await queue.fail(documentId, error);
  } finally {
    activeJobs--;
  }
}

/**
 * Split text into chunks of specified size
 * @param text Text to split
 * @param chunkSize Maximum chunk size in characters
 * @returns Array of text chunks
 */
function createChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  
  // Simple chunking by character count
  // In a production system, this would use more sophisticated chunking
  // that respects sentence/paragraph boundaries
  let i = 0;
  while (i < text.length) {
    // Find a good break point near the chunk size
    let endPos = Math.min(i + chunkSize, text.length);
    
    // Try to break at sentence or paragraph
    if (endPos < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', endPos);
      if (paragraphBreak > i && paragraphBreak > endPos - 200) {
        endPos = paragraphBreak + 2;
      } else {
        // Look for sentence break
        const sentenceBreak = Math.max(
          text.lastIndexOf('. ', endPos),
          text.lastIndexOf('! ', endPos),
          text.lastIndexOf('? ', endPos)
        );
        if (sentenceBreak > i && sentenceBreak > endPos - 100) {
          endPos = sentenceBreak + 2;
        }
      }
    }
    
    chunks.push(text.substring(i, endPos).trim());
    i = endPos;
  }
  
  return chunks;
}

/**
 * Main worker loop
 */
async function workerLoop(): Promise<void> {
  console.log("[Worker] Starting indexing worker");
  
  while (isRunning) {
    try {
      // Check queue stats
      const stats = await queue.getStats();
      console.log(`[Worker] Queue stats: ${stats.queued} queued, ${stats.processing} processing, ${activeJobs} active jobs`);
      
      // Process documents if capacity available
      while (activeJobs < MAX_CONCURRENT_JOBS) {
        const documentId = await queue.dequeue();
        
        if (!documentId) {
          console.log("[Worker] No documents in queue");
          break;
        }
        
        activeJobs++;
        // Process document asynchronously
        processDocument(documentId).catch(error => {
          console.error("[Worker] Unhandled error in document processing:", error);
          activeJobs--;
        });
      }
      
      // Wait before next polling cycle
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    } catch (error) {
      console.error("[Worker] Error in worker loop:", error);
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL * 2));
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupShutdown(): void {
  const shutdown = async () => {
    console.log("[Worker] Shutting down...");
    isRunning = false;
    
    // Wait for active jobs to complete (max 10 seconds)
    let waitTime = 0;
    while (activeJobs > 0 && waitTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitTime += 500;
      console.log(`[Worker] Waiting for ${activeJobs} active jobs to complete...`);
    }
    
    console.log("[Worker] Shutdown complete");
    process.exit(0);
  };
  
  // Handle termination signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start the worker
setupShutdown();
workerLoop().catch(error => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});