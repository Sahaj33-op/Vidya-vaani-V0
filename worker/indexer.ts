import { IndexingQueue, IndexingJob } from "../lib/queue";
import { safeRedisGet, safeRedisSet, initializeRedis } from "../lib/redis-helpers";
import { processBatch } from "./batch-processor";
import { ProgressTracker } from "../lib/progress-tracker";
import { v4 as uuidv4 } from "uuid";

// Initialize services
const redis = initializeRedis();
const queue = new IndexingQueue();
const progress = new ProgressTracker();
const workerId = `worker_${uuidv4()}`;

// Configuration
const CHUNK_SIZE = 500; // Characters per chunk
const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_CONCURRENT_JOBS = 2;

// Processing state
let activeJobs = 0;
let isRunning = true;

/**
 * Process a document from the queue with batched operations
 * @param job Indexing job to process
 */
async function processDocument(job: IndexingJob): Promise<void> {
  console.log(`[Worker] Processing document: ${job.docId}`);
  
  try {
    // Get document data from Redis
    const documentData = await safeRedisGet(`document:${job.docId}`);
    
    if (!documentData) {
      throw new Error(`Document ${job.docId} not found`);
    }
    
    // Extract content and create chunks
    const { content, title, filename } = documentData;
    
    if (!content) {
      throw new Error(`Document ${job.docId} has no content`);
    }
    
    // Create chunks from content with overlap
    const chunks = createChunks(content, CHUNK_SIZE);
    console.log(`[Worker] Created ${chunks.length} chunks for document ${job.docId}`);
    
    // Process chunks in batches
    const BATCH_SIZE = 10; // Process 10 chunks concurrently
    let processed = 0;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);
      const batchId = `batch_${batchIndex}_${Date.now()}`;

      try {
        // Track batch progress
        await progress.trackBatch(job.jobId, batchId, i, i + batchChunks.length - 1, chunks.length);

        // Process batch
        await processBatch(job, batchChunks, batchIndex, totalBatches, { title, filename });

        processed += batchChunks.length;

        // Mark batch as completed and update progress
        await progress.completeBatch(job.jobId, batchId);

        console.log(`[Worker] Processed batch ${batchIndex + 1}/${totalBatches} for document ${job.docId}`);
      } catch (batchError) {
        console.error(`[Worker] Error processing batch ${batchIndex + 1}:`, batchError);

        // Mark batch as failed but continue with next batch
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        await progress.completeBatch(job.jobId, batchId, errorMessage);
      }
    }
    
    // Update document status
    const updatedDoc = {
      ...documentData,
      status: "indexed",
      chunks: chunks.length,
      indexedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    
    await safeRedisSet(
      `document:${job.docId}`,
      updatedDoc,
      86400 // 24 hour expiry
    );
    
    // Mark job as complete
    await queue.complete(job.jobId, {
      chunks: chunks.length,
      indexedAt: new Date().toISOString(),
      progress: 100
    });
    
    console.log(`[Worker] Successfully indexed document: ${job.docId} (${chunks.length} chunks)`);
  } catch (error) {
    console.error(`[Worker] Failed to process document ${job.docId}:`, error);
    await queue.fail(job.jobId, error);
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
  console.log(`[Worker ${workerId}] Starting indexing worker`);
  
  while (isRunning) {
    try {
      // Check queue stats
      const stats = await queue.getStats();
      console.log(`[Worker ${workerId}] Queue stats: ${stats.queued} queued, ${stats.processing} processing, ${activeJobs} active jobs`);
      
      // Process documents if capacity available
      while (activeJobs < MAX_CONCURRENT_JOBS) {
        const jobs = await queue.dequeue(workerId);
        
        if (jobs.length === 0) {
          console.log(`[Worker ${workerId}] No documents in queue`);
          break;
        }
        
        // Process each job in the batch
        for (const job of jobs) {
          activeJobs++;
          processDocument(job).catch(error => {
            console.error(`[Worker ${workerId}] Unhandled error in document processing:`, error);
            activeJobs--;
          });
        }
      }
      
      // Wait before next polling cycle
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    } catch (error) {
      console.error(`[Worker ${workerId}] Error in worker loop:`, error);
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
