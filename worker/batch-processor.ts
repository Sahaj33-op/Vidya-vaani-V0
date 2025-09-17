import { safeRedisSet } from "../lib/redis-helpers";
import { IndexingJob } from "../lib/queue";

interface BatchMetadata {
  title: string;
  filename: string;
  totalChunks: number;
  batchIndex: number;
  totalBatches: number;
}

/**
 * Process a single chunk with metadata
 */
export async function processChunk(
  chunkId: string,
  documentId: string,
  content: string,
  metadata: BatchMetadata
): Promise<void> {
  await safeRedisSet(
    `chunk:${chunkId}`,
    {
      id: chunkId,
      documentId,
      content,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString()
      }
    },
    86400 // 24 hour expiry
  );
}

/**
 * Update job progress in Redis
 */
export async function updateProgress(
  jobId: string,
  documentId: string,
  progress: number
): Promise<void> {
  await safeRedisSet(
    `progress:${jobId}`,
    {
      jobId,
      documentId,
      progress,
      timestamp: Date.now()
    },
    3600 // 1 hour expiry for progress tracking
  );
}

/**
 * Process a batch of chunks concurrently
 */
export async function processBatch(
  job: IndexingJob,
  chunks: string[],
  batchIndex: number,
  totalBatches: number,
  metadata: { title: string; filename: string }
): Promise<void> {
  const batchPromises = chunks.map((chunk, index) => {
    const absoluteIndex = batchIndex * chunks.length + index;
    const chunkId = `${job.docId}_chunk_${absoluteIndex}`;
    
    return processChunk(chunkId, job.docId, chunk, {
      ...metadata,
      totalChunks: job.metadata.totalChunks,
      batchIndex,
      totalBatches
    });
  });

  await Promise.all(batchPromises);
}