import { Redis } from "@upstash/redis";
import { IndexingQueue, JobPriority, IndexingJob } from "./queue";
import { v4 as uuidv4 } from "uuid";
import { safeRedisGet, safeRedisSet } from "./redis-helpers";

interface WorkerState {
  workerId: string;
  status: "idle" | "active" | "error";
  activeJobs: number;
  lastHeartbeat: number;
  error?: string;
}

interface WorkerConfig {
  maxJobs?: number;
  heartbeatInterval?: number;
  workerTimeout?: number;
}

/**
 * Manages a pool of workers for concurrent job processing
 */
export class WorkerPoolManager {
  private redis: Redis;
  private queue: IndexingQueue;
  private workerId: string;
  private config: Required<WorkerConfig>;
  private isRunning: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(queue: IndexingQueue, config?: WorkerConfig) {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    this.queue = queue;
    this.workerId = `worker_${uuidv4()}`;
    this.config = {
      maxJobs: config?.maxJobs ?? 5,
      heartbeatInterval: config?.heartbeatInterval ?? 10000,
      workerTimeout: config?.workerTimeout ?? 30000
    };
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    console.log(`[Worker ${this.workerId}] Starting...`);
    this.isRunning = true;
    
    // Register worker
    await this.updateWorkerState({
      workerId: this.workerId,
      status: "idle",
      activeJobs: 0,
      lastHeartbeat: Date.now()
    });

    // Start heartbeat
    this.startHeartbeat();

    // Start processing loop
    this.processJobs();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    console.log(`[Worker ${this.workerId}] Stopping...`);
    this.isRunning = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Update state to stopped
    await this.updateWorkerState({
      workerId: this.workerId,
      status: "idle",
      activeJobs: 0,
      lastHeartbeat: Date.now()
    });
  }

  /**
   * Process jobs continuously
   */
  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        const jobs = await this.queue.dequeue(this.workerId);
        
        if (jobs.length > 0) {
          // Process jobs concurrently
          await Promise.all(jobs.map(job => this.processJob(job)));
        } else {
          // No jobs available, wait before next poll
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[Worker ${this.workerId}] Error processing jobs:`, error);
        // Update worker state with error
        await this.updateWorkerState({
          workerId: this.workerId,
          status: "error",
          activeJobs: 0,
          lastHeartbeat: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        });
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: IndexingJob): Promise<void> {
    try {
      // Update job progress
      await this.updateJobProgress(job, 0);
      
      // Get document metadata
      const docData = await safeRedisGet(`document:${job.docId}`);
      if (!docData) {
        throw new Error(`Document ${job.docId} not found`);
      }

      // Process document in chunks
      const chunks = this.createChunks(docData.content);
      let processedChunks = 0;

      for (const chunk of chunks) {
        await this.processChunk(job, chunk, processedChunks);
        processedChunks++;
        
        // Update progress
        const progress = Math.floor((processedChunks / chunks.length) * 100);
        await this.updateJobProgress(job, progress);
      }

      // Mark job as completed
      await this.queue.complete(job.jobId, {
        chunks: chunks.length,
        indexedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[Worker ${this.workerId}] Failed to process job ${job.jobId}:`, error);
      await this.queue.fail(job.jobId, error);
    }
  }

  /**
   * Process a single chunk of a document
   */
  private async processChunk(job: IndexingJob, chunk: string, index: number): Promise<void> {
    const chunkId = `${job.docId}_chunk_${index}`;
    
    // Store chunk in Redis
    await safeRedisSet(`chunk:${chunkId}`, {
      id: chunkId,
      documentId: job.docId,
      content: chunk,
      index,
      metadata: job.metadata
    });
  }

  /**
   * Update job progress in Redis
   */
  private async updateJobProgress(job: IndexingJob, progress: number): Promise<void> {
    await safeRedisSet(`progress:${job.jobId}`, {
      jobId: job.jobId,
      docId: job.docId,
      progress,
      timestamp: Date.now(),
      workerId: this.workerId
    });
  }

  /**
   * Split text into chunks
   */
  private createChunks(text: string): string[] {
    const CHUNK_SIZE = 1000;
    const CHUNK_OVERLAP = 100;
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      start = end - CHUNK_OVERLAP;
    }
    
    return chunks;
  }

  /**
   * Start worker heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.updateWorkerState({
          workerId: this.workerId,
          status: "active",
          activeJobs: 0, // This will be updated with actual count
          lastHeartbeat: Date.now()
        });
      } catch (error) {
        console.error(`[Worker ${this.workerId}] Failed to update heartbeat:`, error);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Update worker state in Redis
   */
  private async updateWorkerState(state: WorkerState): Promise<void> {
    await this.redis.hset("worker_status", {
      [this.workerId]: JSON.stringify(state)
    });
  }
}