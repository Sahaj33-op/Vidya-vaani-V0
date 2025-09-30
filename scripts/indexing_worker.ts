#!/usr/bin/env node
import { createClient } from 'redis';
import { IndexingQueue } from '../lib/queue';
import { getStorageProvider } from '../lib/storage';
import { safeRedisGet, safeRedisSet } from '../lib/redis-helpers';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const POLLING_INTERVAL = 1000; // 1 second
const MAX_CONCURRENT_JOBS = 2;
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 10;
const METADATA_DIR = path.join(process.cwd(), 'data', 'metadata');

// Ensure metadata directory exists
if (!fs.existsSync(METADATA_DIR)) {
  fs.mkdirSync(METADATA_DIR, { recursive: true });
}

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: redisUrl });
redis.on('error', (err) => console.error('Redis error:', err));

// Initialize queue and storage
const queue = new IndexingQueue();
const storage = getStorageProvider();

// Track active jobs
let activeJobs = 0;
let isShuttingDown = false;

/**
 * Split text into chunks with sentence and paragraph awareness
 */
function createChunks(text: string): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk and start new one
    if (currentChunk.length + paragraph.length > CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      // If paragraph itself is larger than chunk size, split by sentences
      if (paragraph.length > CHUNK_SIZE) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > CHUNK_SIZE) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
            }
            
            // If sentence is too long, split arbitrarily
            if (sentence.length > CHUNK_SIZE) {
              let remainingSentence = sentence;
              while (remainingSentence.length > 0) {
                const chunkText = remainingSentence.slice(0, CHUNK_SIZE);
                chunks.push(chunkText.trim());
                remainingSentence = remainingSentence.slice(CHUNK_SIZE - CHUNK_OVERLAP);
              }
              currentChunk = '';
            } else {
              currentChunk = sentence;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Call Python embedding service to get embeddings for chunks
 */
async function getEmbeddings(chunks: string[]): Promise<number[][]> {
  try {
    // Write chunks to temporary file
    const tempFile = path.join(process.cwd(), 'temp_chunks.json');
    fs.writeFileSync(tempFile, JSON.stringify(chunks));
    
    // Call Python embedding service
    const result = execSync(`python -m retriever.embed_text ${tempFile}`).toString();
    
    // Parse result
    const embeddings = JSON.parse(result);
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    return embeddings;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Call Python service to add vectors to FAISS index
 */
async function addToFaiss(docId: string, chunkIds: number[], embeddings: number[][]): Promise<boolean> {
  try {
    // Write data to temporary file
    const tempFile = path.join(process.cwd(), 'temp_vectors.json');
    fs.writeFileSync(tempFile, JSON.stringify({
      docId,
      chunkIds,
      embeddings
    }));
    
    // Call Python service to add to FAISS
    execSync(`python -m retriever.add_to_index ${tempFile}`);
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    return true;
  } catch (error) {
    console.error('Error adding to FAISS:', error);
    throw new Error('Failed to add vectors to FAISS index');
  }
}

/**
 * Process a single document
 */
async function processDocument(job: any): Promise<void> {
  const { docId, storagePath, metadata } = job;
  console.log(`[Worker] Processing document ${docId} from ${storagePath}`);
  
  try {
    // Update document status
    await safeRedisSet(`document:${docId}`, { status: 'processing' }, 86400);
    
    // Retrieve document from storage
    const content = await storage.readFile(storagePath);
    if (!content) {
      throw new Error(`Could not read file from storage: ${storagePath}`);
    }
    
    // Create chunks
    const chunks = createChunks(content);
    console.log(`[Worker] Created ${chunks.length} chunks for document ${docId}`);
    
    // Process chunks in batches
    const chunkMetadata = [];
    let processedChunks = 0;
    
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      
      // Generate embeddings
      const embeddings = await getEmbeddings(batchChunks);
      
      // Generate chunk IDs (deterministic based on docId and chunk index)
      const startIdx = i;
      const chunkIds = Array.from({ length: batchChunks.length }, (_, idx) => {
        // Use a hash of docId + chunk index as the numeric ID
        const combinedStr = `${docId}_${startIdx + idx}`;
        let hash = 0;
        for (let j = 0; j < combinedStr.length; j++) {
          hash = ((hash << 5) - hash) + combinedStr.charCodeAt(j);
          hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
      });
      
      // Add to FAISS index
      await addToFaiss(docId, chunkIds, embeddings);
      
      // Store chunk metadata
      for (let j = 0; j < batchChunks.length; j++) {
        chunkMetadata.push({
          id: chunkIds[j],
          docId,
          chunkIndex: startIdx + j,
          text: batchChunks[j],
          source: storagePath,
          timestamp: new Date().toISOString()
        });
      }
      
      processedChunks += batchChunks.length;
      console.log(`[Worker] Processed ${processedChunks}/${chunks.length} chunks for document ${docId}`);
    }
    
    // Save chunk metadata to file
    const metadataPath = path.join(METADATA_DIR, `${docId}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(chunkMetadata, null, 2));
    
    // Update document status in Redis
    const docData = await safeRedisGet(`document:${docId}`);
    if (docData) {
      const updatedDoc = {
        ...docData,
        status: 'indexed',
        chunks: chunks.length,
        indexedAt: new Date().toISOString()
      };
      await safeRedisSet(`document:${docId}`, updatedDoc, 86400);
    }
    
    // Mark job as complete
    await queue.complete(job.jobId, {
      docId,
      chunks: chunks.length,
      status: 'indexed'
    });
    
    console.log(`[Worker] Successfully processed document ${docId}`);
  } catch (error) {
    console.error(`[Worker] Error processing document ${docId}:`, error);
    
    // Update document status
    await safeRedisSet(`document:${docId}`, { status: 'failed' }, 86400);
    
    // Mark job as failed
    await queue.fail(job.jobId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      docId
    });
  }
}

/**
 * Main worker loop
 */
async function workerLoop() {
  if (isShuttingDown) return;
  
  try {
    // Check if we can process more jobs
    if (activeJobs < MAX_CONCURRENT_JOBS) {
      // Dequeue jobs
      const jobs = await queue.dequeue('indexing_worker');
      
      if (jobs && jobs.length > 0) {
        activeJobs += jobs.length;
        for (const job of jobs) {
          console.log(`[Worker] Dequeued job ${job.jobId} for document ${job.docId}`);
          
          // Process the job
          processDocument(job)
            .finally(() => {
              activeJobs--;
            });
        }
      }
    }
  } catch (error) {
    console.error('[Worker] Error in worker loop:', error);
  }
  
  // Schedule next iteration
  setTimeout(workerLoop, POLLING_INTERVAL);
}

/**
 * Handle graceful shutdown
 */
function shutdown() {
  console.log('[Worker] Shutting down...');
  isShuttingDown = true;
  
  // Wait for active jobs to complete
  const checkInterval = setInterval(async () => {
    if (activeJobs === 0) {
      clearInterval(checkInterval);
      console.log('[Worker] All jobs completed, exiting');
      await redis.quit();
      process.exit(0);
    } else {
      console.log(`[Worker] Waiting for ${activeJobs} active jobs to complete...`);
    }
  }, 1000);
  
  // Force exit after timeout
  setTimeout(() => {
    console.log('[Worker] Forced exit after timeout');
    process.exit(1);
  }, 30000);
}

// Handle signals for graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the worker
async function start() {
  try {
    console.log('[Worker] Connecting to Redis...');
    await redis.connect();
    
    console.log('[Worker] Starting indexing worker...');
    workerLoop();
  } catch (error) {
    console.error('[Worker] Failed to start worker:', error);
    process.exit(1);
  }
}

start();
