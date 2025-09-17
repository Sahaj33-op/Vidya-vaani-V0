import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

/**
 * Abstract storage interface for document storage
 */
export interface StorageProvider {
  /**
   * Save a file to storage
   * @param file File to save
   * @param filename Filename to use
   * @returns Path or identifier where the file is stored
   */
  saveFile(file: File | Blob, filename: string): Promise<string>;
  
  /**
   * Read a file from storage
   * @param identifier File path or identifier
   * @returns File content as string
   */
  readFile(identifier: string): Promise<string>;
  
  /**
   * Delete a file from storage
   * @param identifier File path or identifier
   * @returns Success status
   */
  deleteFile(identifier: string): Promise<boolean>;
}

/**
 * Local file system storage provider
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  
  constructor(basePath?: string) {
    // Default to ./uploads in development
    this.basePath = basePath || path.join(process.cwd(), 'uploads');
  }
  
  /**
   * Ensure the storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    if (!fs.existsSync(this.basePath)) {
      await mkdir(this.basePath, { recursive: true });
    }
  }
  
  /**
   * Save a file to local storage
   * @param file File to save
   * @param filename Filename to use
   * @returns Path where the file is stored
   */
  async saveFile(file: File | Blob, filename: string): Promise<string> {
    await this.ensureDirectory();
    
    // Generate a unique filename to prevent collisions
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(this.basePath, uniqueFilename);
    
    // Convert file to buffer and write to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    
    return filePath;
  }
  
  /**
   * Read a file from local storage
   * @param identifier File path
   * @returns File content as string
   */
  async readFile(identifier: string): Promise<string> {
    return fs.promises.readFile(identifier, 'utf-8');
  }
  
  /**
   * Delete a file from local storage
   * @param identifier File path
   * @returns Success status
   */
  async deleteFile(identifier: string): Promise<boolean> {
    try {
      await fs.promises.unlink(identifier);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${identifier}:`, error);
      return false;
    }
  }
}

/**
 * S3-compatible object storage provider
 * Note: This is a placeholder implementation. In production,
 * you would use the AWS SDK or another S3-compatible client.
 */
export class ObjectStorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint: string;
  private region: string;
  
  constructor(bucket: string, endpoint?: string, region?: string) {
    this.bucket = bucket;
    this.endpoint = endpoint || process.env.S3_ENDPOINT || '';
    this.region = region || process.env.S3_REGION || 'us-east-1';
  }
  
  /**
   * Save a file to object storage
   * @param file File to save
   * @param filename Filename to use
   * @returns Object identifier
   */
  async saveFile(file: File | Blob, filename: string): Promise<string> {
    // In a real implementation, this would use the AWS SDK
    // or another S3-compatible client to upload the file
    
    // For now, we'll just simulate success and return an S3-style URI
    const objectKey = `${Date.now()}-${filename}`;
    console.log(`[ObjectStorage] Would upload file to s3://${this.bucket}/${objectKey}`);
    
    return `s3://${this.bucket}/${objectKey}`;
  }
  
  /**
   * Read a file from object storage
   * @param identifier Object identifier
   * @returns File content as string
   */
  async readFile(identifier: string): Promise<string> {
    // In a real implementation, this would download the file
    // from S3 or another object storage service
    
    // For now, we'll just simulate failure
    throw new Error(`ObjectStorageProvider.readFile not implemented for ${identifier}`);
  }
  
  /**
   * Delete a file from object storage
   * @param identifier Object identifier
   * @returns Success status
   */
  async deleteFile(identifier: string): Promise<boolean> {
    // In a real implementation, this would delete the file
    // from S3 or another object storage service
    
    // For now, we'll just simulate success
    console.log(`[ObjectStorage] Would delete file ${identifier}`);
    return true;
  }
}

/**
 * Get the appropriate storage provider based on environment
 * @returns Storage provider instance
 */
export function getStorageProvider(): StorageProvider {
  // Use object storage in production, local storage in development
  if (process.env.NODE_ENV === 'production' && process.env.STORAGE_BUCKET) {
    return new ObjectStorageProvider(
      process.env.STORAGE_BUCKET,
      process.env.S3_ENDPOINT,
      process.env.S3_REGION
    );
  }
  
  // Default to local storage
  return new LocalStorageProvider();
}