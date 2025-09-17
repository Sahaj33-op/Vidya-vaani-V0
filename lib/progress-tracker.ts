import { Redis } from "@upstash/redis";
import { IndexingJob } from "./queue";

// Progress tracking constants
const PROGRESS_KEY_PREFIX = "progress:";
const PROGRESS_EXPIRY = 3600; // 1 hour

interface ProgressUpdate {
  jobId: string;
  docId: string;
  progress: number;
  totalChunks?: number;
  processedChunks?: number;
  estimatedTimeRemaining?: number;
  currentBatch?: number;
  totalBatches?: number;
  startTime?: number;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  workerId?: string;
  timestamp: number;
}

interface BatchProgress {
  batchId: string;
  jobId: string;
  startIndex: number;
  endIndex: number;
  totalChunks: number;
  completed: boolean;
  error?: string;
  startTime: number;
  endTime?: number;
}

/**
 * Tracks and manages progress for indexing jobs
 */
export class ProgressTracker {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }

  /**
   * Initialize progress tracking for a job
   */
  async initializeProgress(job: IndexingJob): Promise<void> {
    const update: ProgressUpdate = {
      jobId: job.jobId,
      docId: job.docId,
      progress: 0,
      totalChunks: job.metadata.totalChunks,
      processedChunks: 0,
      startTime: Date.now(),
      status: "queued",
      workerId: job.workerId,
      timestamp: Date.now()
    };

    await this.redis.set(
      this.getProgressKey(job.jobId),
      JSON.stringify(update),
      { ex: PROGRESS_EXPIRY }
    );
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    progress: number,
    details: Partial<ProgressUpdate> = {}
  ): Promise<void> {
    const key = this.getProgressKey(jobId);
    const currentData = await this.redis.get(key);
    
    if (!currentData) return;
    
    const current = JSON.parse(currentData as string) as ProgressUpdate;
    const timestamp = Date.now();
    
    // Calculate estimated time remaining if we have start time
    let estimatedTimeRemaining: number | undefined;
    if (current.startTime && progress > 0) {
      const elapsed = timestamp - current.startTime;
      const remainingPercentage = 100 - progress;
      estimatedTimeRemaining = Math.floor((elapsed / progress) * remainingPercentage);
    }

    const update: ProgressUpdate = {
      ...current,
      ...details,
      progress,
      estimatedTimeRemaining,
      timestamp
    };

    await this.redis.set(
      key,
      JSON.stringify(update),
      { ex: PROGRESS_EXPIRY }
    );
  }

  /**
   * Track progress for a batch of chunks
   */
  async trackBatch(
    jobId: string,
    batchId: string,
    startIndex: number,
    endIndex: number,
    totalChunks: number
  ): Promise<void> {
    const batch: BatchProgress = {
      batchId,
      jobId,
      startIndex,
      endIndex,
      totalChunks,
      completed: false,
      startTime: Date.now()
    };

    await this.redis.set(
      this.getBatchKey(jobId, batchId),
      JSON.stringify(batch),
      { ex: PROGRESS_EXPIRY }
    );
  }

  /**
   * Mark a batch as completed
   */
  async completeBatch(
    jobId: string,
    batchId: string,
    error?: string
  ): Promise<void> {
    const key = this.getBatchKey(jobId, batchId);
    const data = await this.redis.get(key);
    
    if (!data) return;
    
    const batch = JSON.parse(data as string) as BatchProgress;
    const completed: BatchProgress = {
      ...batch,
      completed: true,
      endTime: Date.now(),
      error
    };

    await this.redis.set(
      key,
      JSON.stringify(completed),
      { ex: PROGRESS_EXPIRY }
    );

    // Update overall job progress
    const processed = completed.endIndex - completed.startIndex + 1;
    await this.incrementProcessedChunks(jobId, processed);
  }

  /**
   * Increment the number of processed chunks
   */
  private async incrementProcessedChunks(
    jobId: string,
    count: number
  ): Promise<void> {
    const key = this.getProgressKey(jobId);
    const data = await this.redis.get(key);
    
    if (!data) return;
    
    const current = JSON.parse(data as string) as ProgressUpdate;
    const processedChunks = (current.processedChunks || 0) + count;
    const progress = current.totalChunks
      ? Math.floor((processedChunks / current.totalChunks) * 100)
      : 0;

    await this.updateProgress(jobId, progress, { processedChunks });
  }

  /**
   * Get all active job progress
   */
  async getAllProgress(): Promise<ProgressUpdate[]> {
    const keys = await this.redis.keys(`${PROGRESS_KEY_PREFIX}*`);
    if (!keys.length) return [];

    const data = await Promise.all(
      keys.map(key => this.redis.get(key))
    );

    return data
      .filter((item): item is string => item !== null)
      .map(item => JSON.parse(item) as ProgressUpdate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get progress for a specific job
   */
  async getJobProgress(jobId: string): Promise<ProgressUpdate | null> {
    const data = await this.redis.get(this.getProgressKey(jobId));
    return data ? JSON.parse(data as string) : null;
  }

  /**
   * Get progress key for a job
   */
  private getProgressKey(jobId: string): string {
    return `${PROGRESS_KEY_PREFIX}${jobId}`;
  }

  /**
   * Get progress key for a batch
   */
  private getBatchKey(jobId: string, batchId: string): string {
    return `${PROGRESS_KEY_PREFIX}${jobId}:batch:${batchId}`;
  }
}