import { Redis } from "@upstash/redis";
import { safeRedisGet } from "./redis-helpers";

interface LockOptions {
  ttl?: number;  // Lock timeout in seconds
  retryDelay?: number;  // Delay between retries in milliseconds
  maxRetries?: number;  // Maximum number of retry attempts
}

/**
 * Utility class for optimized Redis operations with distributed locking
 */
export class RedisLockManager {
  private redis: Redis;
  private lockPrefix: string;
  private lockTimeout: number;

  constructor(redis: Redis, prefix = "lock:", timeout = 30) {
    this.redis = redis;
    this.lockPrefix = prefix;
    this.lockTimeout = timeout;
  }

  /**
   * Acquire a distributed lock with retry logic
   * @param key Key to lock
   * @param options Lock options
   * @returns Lock token if acquired, null if not
   */
  async acquireLock(
    key: string,
    options: LockOptions = {}
  ): Promise<string | null> {
    const {
      ttl = this.lockTimeout,
      retryDelay = 100,
      maxRetries = 5
    } = options;

    const lockKey = this.getLockKey(key);
    const token = Math.random().toString(36).substring(2);
    let attempts = 0;

    while (attempts < maxRetries) {
      // Try to set the lock with NX (only if it doesn't exist)
      const acquired = await this.redis.set(lockKey, token, {
        nx: true,
        ex: ttl
      });

      if (acquired) {
        return token;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      attempts++;
    }

    return null;
  }

  /**
   * Release a distributed lock
   * @param key Key to unlock
   * @param token Lock token for verification
   * @returns Success status
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    
    // Verify token matches before releasing
    const currentToken = await this.redis.get(lockKey);
    if (currentToken !== token) {
      return false;
    }

    await this.redis.del(lockKey);
    return true;
  }

  /**
   * Execute a function with a distributed lock
   * @param key Key to lock
   * @param fn Function to execute with lock
   * @param options Lock options
   * @returns Function result or null if lock not acquired
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T | null> {
    const token = await this.acquireLock(key, options);
    if (!token) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }

  /**
   * Get key with lock prefix
   */
  private getLockKey(key: string): string {
    return `${this.lockPrefix}${key}`;
  }
}

interface AtomicOptions {
  retries?: number;
  retryDelay?: number;
  lockTTL?: number;
}

/**
 * Utility class for atomic Redis operations
 */
export class AtomicOperations {
  private redis: Redis;
  private lockManager: RedisLockManager;

  constructor(redis: Redis) {
    this.redis = redis;
    this.lockManager = new RedisLockManager(redis);
  }

  /**
   * Atomic get and set operation
   * @param key Key to update
   * @param updateFn Function to generate new value from current
   * @param options Atomic operation options
   * @returns Updated value or null if failed
   */
  async getAndSet<T>(
    key: string,
    updateFn: (current: T | null) => Promise<T> | T,
    options: AtomicOptions = {}
  ): Promise<T | null> {
    return this.lockManager.withLock(
      key,
      async () => {
        const current = await safeRedisGet(key);
        const updated = await updateFn(current);
        await this.redis.set(key, JSON.stringify(updated));
        return updated;
      },
      options
    );
  }

  /**
   * Atomic increment operation
   * @param key Key to increment
   * @param amount Amount to increment by
   * @param options Atomic operation options
   * @returns Updated value or null if failed
   */
  async increment(
    key: string,
    amount: number = 1,
    options: AtomicOptions = {}
  ): Promise<number | null> {
    return this.lockManager.withLock(
      key,
      async () => {
        const result = await this.redis.incrby(key, amount);
        return result as number;
      },
      options
    );
  }

  /**
   * Atomic list operation with locking
   * @param listKey Key of the list
   * @param operation Function to perform on the list
   * @param options Atomic operation options
   * @returns Operation result or null if failed
   */
  async withList<T>(
    listKey: string,
    operation: (list: string[]) => Promise<T> | T,
    options: AtomicOptions = {}
  ): Promise<T | null> {
    return this.lockManager.withLock(
      listKey,
      async () => {
        const list = await this.redis.lrange(listKey, 0, -1);
        return operation(list as string[]);
      },
      options
    );
  }

  /**
   * Atomic hash operation with locking
   * @param hashKey Key of the hash
   * @param operation Function to perform on the hash
   * @param options Atomic operation options
   * @returns Operation result or null if failed
   */
  async withHash<T>(
    hashKey: string,
    operation: (hash: Record<string, string>) => Promise<T> | T,
    options: AtomicOptions = {}
  ): Promise<T | null> {
    return this.lockManager.withLock(
      hashKey,
      async () => {
        const hash = await this.redis.hgetall(hashKey);
        return operation(hash as Record<string, string>);
      },
      options
    );
  }

  /**
   * Atomic operation across multiple keys with locking
   * @param keys Array of keys to lock and operate on
   * @param operation Function to perform atomic operation
   * @param options Atomic operation options
   * @returns Operation result or null if failed
   */
  async withMultipleKeys<T>(
    keys: string[],
    operation: () => Promise<T> | T,
    options: AtomicOptions = {}
  ): Promise<T | null> {
    // Sort keys to prevent deadlocks
    const sortedKeys = [...keys].sort();
    let result: T | null = null;
    let lastLockIndex = -1;
    let locks: string[] = [];

    try {
      // Acquire all locks in order
      for (let i = 0; i < sortedKeys.length; i++) {
        const token = await this.lockManager.acquireLock(sortedKeys[i], options);
        if (!token) {
          // Failed to acquire lock, release all acquired locks
          break;
        }
        locks.push(token);
        lastLockIndex = i;
      }

      // Only proceed if all locks were acquired
      if (lastLockIndex === sortedKeys.length - 1) {
        result = await operation();
      }
    } finally {
      // Release all acquired locks in reverse order
      for (let i = lastLockIndex; i >= 0; i--) {
        await this.lockManager.releaseLock(sortedKeys[i], locks[i]);
      }
    }

    return result;
  }
}

// Export singleton instances
let _lockManager: RedisLockManager;
let _atomicOps: AtomicOperations;

export function getLockManager(redis: Redis): RedisLockManager {
  if (!_lockManager) {
    _lockManager = new RedisLockManager(redis);
  }
  return _lockManager;
}

export function getAtomicOperations(redis: Redis): AtomicOperations {
  if (!_atomicOps) {
    _atomicOps = new AtomicOperations(redis);
  }
  return _atomicOps;
}
