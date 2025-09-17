import { Redis } from "@upstash/redis";

// Queue configuration
const QUEUE_KEY = "indexing_queue";
const PROCESSING_KEY = "indexing_processing";
const RESULTS_KEY_PREFIX = "indexing_result:";
const FAILED_QUEUE = "indexing_failed";

/**
 * Job interface for document indexing
 */
export interface IndexingJob {
  jobId: string;
  docId: string;
  storagePath: string;
  metadata: {
    filename: string;
    size: number;
    title: string;
    uploadDate: string;
    [key: string]: any;
  };
  attempts?: number;
  timestamp?: number;
}

/**
 * Redis-based queue implementation for document indexing
 */
export class IndexingQueue {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }

  /**
   * Add a job to the indexing queue
   * @param job Indexing job to be processed
   * @returns Success status
   */
  async enqueue(job: Omit<IndexingJob, "jobId" | "timestamp" | "attempts">): Promise<{ success: boolean; jobId: string }> {
    try {
      // Generate a unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the complete job object
      const completeJob: IndexingJob = {
        ...job,
        jobId,
        attempts: 0,
        timestamp: Date.now(),
      };
      
      // Add job to the queue
      await this.redis.lpush(QUEUE_KEY, JSON.stringify(completeJob));
      console.log(`[Queue] Job ${jobId} for document ${job.docId} added to indexing queue`);
      
      return { success: true, jobId };
    } catch (error) {
      console.error("[Queue] Failed to enqueue job:", error);
      return { success: false, jobId: "" };
    }
  }

  /**
   * Get the next job from the queue for processing
   * @returns Job object or null if queue is empty
   */
  async dequeue(): Promise<IndexingJob | null> {
    try {
      // Move item from queue to processing list with atomic operation
      const item = await this.redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
      
      if (!item) {
        return null;
      }
      
      const job = JSON.parse(item as string) as IndexingJob;
      console.log(`[Queue] Job ${job.jobId} for document ${job.docId} dequeued for processing`);
      
      // Update attempts count
      job.attempts = (job.attempts || 0) + 1;
      
      // Update the job in the processing list
      await this.redis.lset(
        PROCESSING_KEY,
        -1, // Last item (the one we just pushed)
        JSON.stringify(job)
      );
      
      return job;
    } catch (error) {
      console.error("[Queue] Failed to dequeue job:", error);
      return null;
    }
  }

  /**
   * Mark a job as successfully processed
   * @param jobId Job ID that was processed
   * @param result Processing result data
   * @returns Success status
   */
  async complete(jobId: string, result: any): Promise<boolean> {
    try {
      // Start a transaction
      const multi = this.redis.multi();
      
      // Find and remove from processing list
      const processingList = await this.redis.lrange(PROCESSING_KEY, 0, -1);
      let jobIndex = -1;
      let job: IndexingJob | null = null;
      
      for (let i = 0; i < processingList.length; i++) {
        const item = JSON.parse(processingList[i] as string);
        if (item.jobId === jobId) {
          jobIndex = i;
          job = item;
          break;
        }
      }
      
      if (job === null) {
        console.warn(`[Queue] Job ${jobId} not found in processing list`);
        return false;
      }
      
      // Remove from processing list
      multi.lrem(PROCESSING_KEY, 1, JSON.stringify(job));
      
      // Store the result
      multi.set(
        `${RESULTS_KEY_PREFIX}${jobId}`, 
        JSON.stringify({
          ...result,
          docId: job.docId,
          completedAt: Date.now(),
          status: "completed"
        }),
        { ex: 86400 } // Store results for 24 hours
      );
      
      // Update document status
      multi.hset(`document:${job.docId}`, {
        status: "indexed",
        indexedAt: new Date().toISOString()
      });
      
      await multi.exec();
      console.log(`[Queue] Job ${jobId} for document ${job.docId} marked as completed`);
      return true;
    } catch (error) {
      console.error("[Queue] Failed to complete job processing:", error);
      return false;
    }
  }

  /**
   * Mark a job as failed during processing
   * @param jobId Job ID that failed
   * @param error Error information
   * @param retry Whether to retry the job
   * @returns Success status
   */
  async fail(jobId: string, error: any, retry: boolean = false): Promise<boolean> {
    try {
      // Start a transaction
      const multi = this.redis.multi();
      
      // Find job in processing list
      const processingList = await this.redis.lrange(PROCESSING_KEY, 0, -1);
      let job: IndexingJob | null = null;
      
      for (const item of processingList) {
        const parsedItem = JSON.parse(item as string);
        if (parsedItem.jobId === jobId) {
          job = parsedItem;
          break;
        }
      }
      
      if (job === null) {
        console.warn(`[Queue] Job ${jobId} not found in processing list`);
        return false;
      }
      
      // Remove from processing list
      multi.lrem(PROCESSING_KEY, 1, JSON.stringify(job));
      
      // If retry and attempts < 3, add back to queue
      if (retry && (job.attempts || 0) < 3) {
        // Add to front of queue for faster retry
        multi.rpush(QUEUE_KEY, JSON.stringify(job));
        console.log(`[Queue] Job ${jobId} for document ${job.docId} scheduled for retry (attempt ${job.attempts})`);
      } else {
        // Add to failed queue
        multi.lpush(FAILED_QUEUE, JSON.stringify({
          ...job,
          error: error.message || String(error),
          failedAt: Date.now()
        }));
        
        // Store the error
        multi.set(
          `${RESULTS_KEY_PREFIX}${jobId}`, 
          JSON.stringify({
            error: error.message || String(error),
            docId: job.docId,
            failedAt: Date.now(),
            status: "failed"
          }),
          { ex: 86400 } // Store results for 24 hours
        );
        
        // Update document status
        multi.hset(`document:${job.docId}`, {
          status: "failed",
          error: error.message || String(error),
          failedAt: new Date().toISOString()
        });
        
        console.log(`[Queue] Job ${jobId} for document ${job.docId} marked as failed`);
      }
      
      await multi.exec();
      return true;
    } catch (error) {
      console.error("[Queue] Failed to mark job as failed:", error);
      return false;
    }
  }

  /**
   * Get queue statistics
   * @returns Queue statistics
   */
  async getStats(): Promise<{ queued: number; processing: number; failed: number }> {
    try {
      const [queuedCount, processingCount, failedCount] = await Promise.all([
        this.redis.llen(QUEUE_KEY),
        this.redis.llen(PROCESSING_KEY),
        this.redis.llen(FAILED_QUEUE),
      ]);
      
      return {
        queued: queuedCount as number,
        processing: processingCount as number,
        failed: failedCount as number,
      };
    } catch (error) {
      console.error("[Queue] Failed to get queue stats:", error);
      return { queued: 0, processing: 0, failed: 0 };
    }
  }
  
  /**
   * Get job status
   * @param jobId Job ID to check
   * @returns Job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<{ status: string; result?: any } | null> {
    try {
      // Check completed/failed results first
      const result = await this.redis.get(`${RESULTS_KEY_PREFIX}${jobId}`);
      
      if (result) {
        return JSON.parse(result as string);
      }
      
      // Check processing list
      const processingList = await this.redis.lrange(PROCESSING_KEY, 0, -1);
      for (const item of processingList) {
        const job = JSON.parse(item as string);
        if (job.jobId === jobId) {
          return { status: "processing", attempts: job.attempts };
        }
      }
      
      // Check queue
      const queueList = await this.redis.lrange(QUEUE_KEY, 0, -1);
      for (const item of queueList) {
        const job = JSON.parse(item as string);
        if (job.jobId === jobId) {
          return { status: "queued" };
        }
      }
      
      // Check failed queue
      const failedList = await this.redis.lrange(FAILED_QUEUE, 0, -1);
      for (const item of failedList) {
        const job = JSON.parse(item as string);
        if (job.jobId === jobId) {
          return { 
            status: "failed",
            result: {
              error: job.error,
              failedAt: job.failedAt
            }
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`[Queue] Failed to get status for job ${jobId}:`, error);
      return null;
    }
  }
}