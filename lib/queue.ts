import { Redis } from "@upstash/redis";
import { getLockManager, getAtomicOperations } from "./redis-atomic";

// Queue configuration
const QUEUE_KEY = "indexing_queue";
const PROCESSING_KEY = "indexing_processing";
const RESULTS_KEY_PREFIX = "indexing_result:";
const FAILED_QUEUE = "indexing_failed";
const QUEUE_LOCK_TTL = 30; // 30 seconds
const WORKER_POOL_KEY = "worker_pool";
const WORKER_STATUS_KEY = "worker_status";

// Worker pool configuration
const DEFAULT_POOL_SIZE = 3;
const MAX_JOBS_PER_WORKER = 5;
const JOB_BATCH_SIZE = 10;
const WORKER_HEARTBEAT_INTERVAL = 10000; // 10 seconds
const WORKER_TIMEOUT = 30000; // 30 seconds

// Job priority levels
export enum JobPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

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
  priority?: JobPriority;
  workerId?: string;
  batchId?: string;
  progress?: number;
  estimatedTime?: number;
  chunkStart?: number;
  chunkEnd?: number;
  error?: string;
  failedAt?: number;
}

/**
 * Redis-based queue implementation for document indexing
 */
export class IndexingQueue {
  private redis: Redis;
  private lockManager: ReturnType<typeof getLockManager>;
  private atomicOps: ReturnType<typeof getAtomicOperations>;

  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    this.lockManager = getLockManager(this.redis);
    this.atomicOps = getAtomicOperations(this.redis);
  }

  /**
   * Add a job to the indexing queue with atomic operations
   * @param job Indexing job to be processed
   * @returns Success status and job ID
   */
  async enqueue(job: Omit<IndexingJob, "jobId" | "timestamp" | "attempts">): Promise<{ success: boolean; jobId: string }> {
    try {
      const result = await this.lockManager.withLock(
        QUEUE_KEY,
        async () => {
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
            
            // Add job to queue atomically
            await this.redis.lpush(QUEUE_KEY, JSON.stringify(completeJob));
            console.log(`[Queue] Job ${jobId} for document ${job.docId} added to indexing queue`);
            
            return { success: true, jobId };
          } catch (error) {
            console.error("[Queue] Failed to enqueue job in lock:", error);
            return { success: false, jobId: "" };
          }
        },
        { ttl: QUEUE_LOCK_TTL }
      );
      return result ?? { success: false, jobId: "" };
    } catch (error) {
      console.error("[Queue] Failed to enqueue job:", error);
      return { success: false, jobId: "" };
    }
  }

  /**
   * Get the next batch of jobs from the queue for processing using atomic operations
   * @param workerId ID of the worker requesting jobs
   * @returns Array of jobs or empty array if queue is empty
   */
  async dequeue(workerId: string): Promise<IndexingJob[]> {
    try {
      const result = await this.lockManager.withLock(
        QUEUE_KEY,
        async () => {
          const jobs: IndexingJob[] = [];

          try {
            // Process multiple jobs up to the worker limit
            for (let i = 0; i < MAX_JOBS_PER_WORKER; i++) {
              const result = await this.atomicOps.withList<IndexingJob | null>(
                QUEUE_KEY,
                async (list: string[]) => {
                  if (list.length === 0) return null;
                  
                  const item = list[list.length - 1];
                  try {
                    const job = JSON.parse(item) as IndexingJob;
                    job.attempts = (job.attempts || 0) + 1;
                    job.workerId = workerId;
                    job.timestamp = Date.now();
                    
                    // Move job to processing list
                    await this.redis.rpop(QUEUE_KEY);
                    await this.redis.lpush(PROCESSING_KEY, JSON.stringify(job));
                    
                    return job;
                  } catch (err) {
                    console.error("[Queue] Failed to parse job:", err);
                    return null;
                  }
                }
              );

              if (!result) break;
              
              jobs.push(result);
              console.log(`[Queue] Job ${result.jobId} for document ${result.docId} assigned to worker ${workerId}`);
            }

            if (jobs.length > 0) {
              // Update worker status atomically
              await this.atomicOps.withHash(
                WORKER_STATUS_KEY,
                async (hash: Record<string, string>) => {
                  hash[workerId] = JSON.stringify({
                    activeJobs: jobs.length,
                    lastHeartbeat: Date.now(),
                    status: "active"
                  });
                  return hash;
                }
              );
            }

            return jobs;
          } catch (error) {
            console.error("[Queue] Failed to dequeue jobs:", error);
            return [];
          }
        },
        { ttl: QUEUE_LOCK_TTL }
      );
      return result ?? [];
    } catch (error) {
      console.error("[Queue] Failed to dequeue jobs:", error);
      return [];
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
      const result = await this.lockManager.withLock(
        PROCESSING_KEY,
        async () => {
          try {
            // Find and remove job from processing list atomically
            const processingJob = await this.atomicOps.withList<IndexingJob | null>(
              PROCESSING_KEY,
              async (list: string[]) => {
                let foundJob: IndexingJob | null = null;
                let foundIndex = -1;
                
                // Find the job in the list
                for (let i = 0; i < list.length; i++) {
                  try {
                    const job = JSON.parse(list[i]) as IndexingJob;
                    if (job.jobId === jobId) {
                      foundJob = job;
                      foundIndex = i;
                      break;
                    }
                  } catch (err) {
                    console.error("[Queue] Failed to parse job:", err);
                  }
                }
                
                if (foundJob === null) {
                  console.warn(`[Queue] Job ${jobId} not found in processing list`);
                  return null;
                }
                
                // Remove the job from the list
                await this.redis.lrem(PROCESSING_KEY, 1, list[foundIndex]);
                return foundJob;
              }
            );

            if (!processingJob) return false;

            // Atomic operations to update job results and document status
            await Promise.all([
              // Store the result
              this.redis.set(
                `${RESULTS_KEY_PREFIX}${jobId}`,
                JSON.stringify({
                  result,
                  docId: processingJob.docId,
                  completedAt: Date.now(),
                  status: "completed"
                }),
                { ex: 86400 } // Store results for 24 hours
              ),
              
              // Update document status
              this.redis.hset(`document:${processingJob.docId}`, {
                status: "indexed",
                indexedAt: new Date().toISOString()
              })
            ]);

            console.log(`[Queue] Job ${jobId} for document ${processingJob.docId} marked as completed`);
            return true;
          } catch (error) {
            console.error("[Queue] Failed to complete job in lock:", error);
            return false;
          }
        },
        { ttl: QUEUE_LOCK_TTL }
      );
      return result ?? false;
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
  async fail(jobId: string, error: any, retry = false): Promise<boolean> {
    try {
      const result = await this.lockManager.withLock(
        PROCESSING_KEY,
        async () => {
          try {
            // Find and remove job from processing list atomically
            const processingJob = await this.atomicOps.withList<IndexingJob | null>(
              PROCESSING_KEY,
              async (list: string[]) => {
                let foundJob: IndexingJob | null = null;
                let foundIndex = -1;
                
                // Find the job in the list
                for (let i = 0; i < list.length; i++) {
                  try {
                    const job = JSON.parse(list[i]) as IndexingJob;
                    if (job.jobId === jobId) {
                      foundJob = job;
                      foundIndex = i;
                      break;
                    }
                  } catch (err) {
                    console.error("[Queue] Failed to parse job:", err);
                  }
                }
                
                if (foundJob === null) {
                  console.warn(`[Queue] Job ${jobId} not found in processing list`);
                  return null;
                }
                
                // Remove the job from the list
                await this.redis.lrem(PROCESSING_KEY, 1, list[foundIndex]);
                return foundJob;
              }
            );

            if (!processingJob) return false;

            // Handle retry or failure atomically
            if (retry && (processingJob.attempts || 0) < 3) {
              // Add to front of queue for faster retry
              await this.redis.rpush(QUEUE_KEY, JSON.stringify(processingJob));
              console.log(`[Queue] Job ${jobId} for document ${processingJob.docId} scheduled for retry (attempt ${processingJob.attempts})`);
            } else {
              // Handle failure atomically
              await Promise.all([
                // Add to failed queue
                this.redis.lpush(
                  FAILED_QUEUE,
                  JSON.stringify({
                    ...processingJob,
                    error: error.message || String(error),
                    failedAt: Date.now()
                  })
                ),
                
                // Store the error
                this.redis.set(
                  `${RESULTS_KEY_PREFIX}${jobId}`,
                  JSON.stringify({
                    error: error.message || String(error),
                    docId: processingJob.docId,
                    failedAt: Date.now(),
                    status: "failed"
                  }),
                  { ex: 86400 } // Store results for 24 hours
                ),
                
                // Update document status
                this.redis.hset(`document:${processingJob.docId}`, {
                  status: "failed",
                  error: error.message || String(error),
                  failedAt: new Date().toISOString()
                })
              ]);

              console.log(`[Queue] Job ${jobId} for document ${processingJob.docId} marked as failed`);
            }

            return true;
          } catch (error) {
            console.error("[Queue] Failed to mark job as failed in lock:", error);
            return false;
          }
        },
        { ttl: QUEUE_LOCK_TTL }
      );
      return result ?? false;
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
      // Read all list lengths atomically
      const stats = await this.atomicOps.withMultipleKeys<{
        queued: number;
        processing: number;
        failed: number;
      }>(
        [QUEUE_KEY, PROCESSING_KEY, FAILED_QUEUE],
        async () => {
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
        }
      );

      return stats ?? { queued: 0, processing: 0, failed: 0 };
    } catch (error) {
      console.error("[Queue] Failed to get queue stats:", error);
      return { queued: 0, processing: 0, failed: 0 };
    }
  }
  
  /**
   * Get job status and details
   * @param jobId Job ID to check
   * @returns Job status and details or null if not found
   */
  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    result?: any;
    progress?: number;
    workerId?: string;
    error?: string;
    failedAt?: number;
  } | null> {
    try {
      // Check all possible locations atomically
      return this.atomicOps.withMultipleKeys<{
        status: "queued" | "processing" | "completed" | "failed";
        result?: any;
        progress?: number;
        workerId?: string;
        error?: string;
        failedAt?: number;
      } | null>(
        [
          `${RESULTS_KEY_PREFIX}${jobId}`,
          PROCESSING_KEY,
          QUEUE_KEY,
          FAILED_QUEUE
        ],
        async () => {
          // Check completed/failed results first
          const result = await this.redis.get(`${RESULTS_KEY_PREFIX}${jobId}`);
          
          if (result) {
            const parsed = JSON.parse(result as string);
            return {
              status: parsed.status,
              result: parsed.result,
              error: parsed.error,
              failedAt: parsed.failedAt
            };
          }
          
          // Check processing list
          const processingList = await this.redis.lrange(PROCESSING_KEY, 0, -1);
          for (const item of processingList) {
            try {
              const job = JSON.parse(item as string) as IndexingJob;
              if (job.jobId === jobId) {
                return {
                  status: "processing",
                  workerId: job.workerId,
                  progress: job.progress
                };
              }
            } catch (err) {
              console.error("[Queue] Failed to parse processing job:", err);
            }
          }
          
          // Check queue
          const queueList = await this.redis.lrange(QUEUE_KEY, 0, -1);
          for (const item of queueList) {
            try {
              const job = JSON.parse(item as string) as IndexingJob;
              if (job.jobId === jobId) {
                return { status: "queued" };
              }
            } catch (err) {
              console.error("[Queue] Failed to parse queued job:", err);
            }
          }
          
          // Check failed queue
          const failedList = await this.redis.lrange(FAILED_QUEUE, 0, -1);
          for (const item of failedList) {
            try {
              const job = JSON.parse(item as string) as IndexingJob;
              if (job.jobId === jobId) {
                return { 
                  status: "failed",
                  error: job.error,
                  failedAt: job.failedAt
                };
              }
            } catch (err) {
              console.error("[Queue] Failed to parse failed job:", err);
            }
          }
          
          return null;
        }
      ) ?? null;
    } catch (error) {
      console.error(`[Queue] Failed to get status for job ${jobId}:`, error);
      return null;
    }
  }
}