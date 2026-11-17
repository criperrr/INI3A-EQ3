import { createClient } from "redis";
import { env } from "../config/env";

const rawRedisUrl = process.env.REDIS_URL || env.REDIS_URL || "redis://localhost:6379";
const redisUrl = rawRedisUrl.trim().replace(/^['"]|['"]$/g, "");
const isTls = redisUrl.startsWith("rediss://");

const rawPrefix = (process.env.REDIS_KEY_PREFIX || "").trim();
export const REDIS_KEY_PREFIX = rawPrefix
  ? rawPrefix.endsWith(":")
    ? rawPrefix
    : `${rawPrefix}:`
  : "";

export function redisKey(key: string): string {
  return `${REDIS_KEY_PREFIX}${key}`;
}

// Helper to sanitize Redis connection URL for logs
export function getSanitizedRedisUrl(url: string = redisUrl): string {
  try {
    return url.replace(/:[^:@]+@/, ":***@");
  } catch {
    return "redis://localhost:6379";
  }
}

export async function withRedisTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  // Prevent unhandled rejection if caller already timed out
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`REDIS: Command timeout after ${ms}ms`)), ms);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type StoreNamespace = "auth" | "cache";

interface StoreEntry {
  value: string;
  expiresAt?: number | undefined;
  byteSize: number;
}

class BoundedLruPartition {
  private store = new Map<string, StoreEntry>();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxTotalBytes: number,
    private readonly maxEntryBytes: number,
  ) {}

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.totalBytes = Math.max(0, this.totalBytes - entry.byteSize);
      this.store.delete(key);
      return null;
    }
    // LRU promotion on read
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string, exSeconds?: number): boolean {
    const byteSize = Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
    if (byteSize > this.maxEntryBytes) {
      this.del(key);
      return false;
    }

    const existing = this.store.get(key);
    if (existing) {
      this.totalBytes = Math.max(0, this.totalBytes - existing.byteSize);
      this.store.delete(key);
    }

    if (this.store.size >= this.maxEntries || this.totalBytes + byteSize > this.maxTotalBytes) {
      this.cleanExpired();
    }

    while (
      (this.store.size >= this.maxEntries || this.totalBytes + byteSize > this.maxTotalBytes) &&
      this.store.size > 0
    ) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.store.get(oldestKey);
      this.store.delete(oldestKey);
      if (oldest) {
        this.totalBytes = Math.max(0, this.totalBytes - oldest.byteSize);
      }
    }

    const expiresAt = exSeconds && exSeconds > 0 ? Date.now() + exSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt, byteSize });
    this.totalBytes += byteSize;
    return true;
  }

  del(key: string): number {
    const existing = this.store.get(key);
    if (!existing) return 0;
    this.totalBytes = Math.max(0, this.totalBytes - existing.byteSize);
    this.store.delete(key);
    return 1;
  }

  exists(key: string): number {
    return this.get(key) !== null ? 1 : 0;
  }

  incr(key: string): number {
    const current = this.get(key);
    const existing = this.store.get(key);
    const num = (current ? parseInt(current, 10) || 0 : 0) + 1;
    const nextVal = String(num);
    const remainingSec = existing?.expiresAt
      ? Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000))
      : undefined;
    this.set(key, nextVal, remainingSec);
    if (existing?.expiresAt) {
      const updated = this.store.get(key);
      if (updated) updated.expiresAt = existing.expiresAt;
    }
    return num;
  }

  expire(key: string, seconds: number): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (seconds <= 0) {
      this.del(key);
      return 1;
    }
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  keys(regex: RegExp | null): string[] {
    const now = Date.now();
    const result: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.totalBytes = Math.max(0, this.totalBytes - entry.byteSize);
        this.store.delete(key);
        continue;
      }
      if (!regex || regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.totalBytes = Math.max(0, this.totalBytes - entry.byteSize);
        this.store.delete(key);
      }
    }
  }

  flush(): void {
    this.store.clear();
    this.totalBytes = 0;
  }

  stats(): { entries: number; bytes: number; maxEntries: number; maxTotalBytes: number } {
    return {
      entries: this.store.size,
      bytes: this.totalBytes,
      maxEntries: this.maxEntries,
      maxTotalBytes: this.maxTotalBytes,
    };
  }
}

const AUTH_MAX_ENTRIES = 2000;
const AUTH_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
const CACHE_MAX_ENTRIES = 300;
const CACHE_MAX_BYTES = 8 * 1024 * 1024; // 8 MiB
const MAX_SINGLE_ENTRY_BYTES = 256 * 1024; // 256 KiB

// Partitioned, bounded LRU in-memory fallback cache when Redis is unavailable
export class InMemoryStore {
  private readonly partitions: Record<StoreNamespace, BoundedLruPartition> = {
    auth: new BoundedLruPartition(AUTH_MAX_ENTRIES, AUTH_MAX_BYTES, MAX_SINGLE_ENTRY_BYTES),
    cache: new BoundedLruPartition(CACHE_MAX_ENTRIES, CACHE_MAX_BYTES, MAX_SINGLE_ENTRY_BYTES),
  };

  private resolveNamespace(key: string, explicit?: StoreNamespace): StoreNamespace {
    if (explicit) return explicit;
    const stripped =
      REDIS_KEY_PREFIX && key.startsWith(REDIS_KEY_PREFIX)
        ? key.slice(REDIS_KEY_PREFIX.length)
        : key;
    if (stripped.startsWith("cache:http:") || stripped.startsWith("cache:img:")) {
      return "cache";
    }
    return "auth";
  }

  get(key: string, namespace?: StoreNamespace): string | null {
    return this.partitions[this.resolveNamespace(key, namespace)].get(key);
  }

  set(key: string, value: string, exSeconds?: number, namespace?: StoreNamespace): void {
    this.partitions[this.resolveNamespace(key, namespace)].set(key, value, exSeconds);
  }

  del(key: string, namespace?: StoreNamespace): number {
    return this.partitions[this.resolveNamespace(key, namespace)].del(key);
  }

  exists(key: string, namespace?: StoreNamespace): number {
    return this.partitions[this.resolveNamespace(key, namespace)].exists(key);
  }

  incr(key: string, namespace?: StoreNamespace): number {
    return this.partitions[this.resolveNamespace(key, namespace)].incr(key);
  }

  expire(key: string, seconds: number, namespace?: StoreNamespace): number {
    return this.partitions[this.resolveNamespace(key, namespace)].expire(key, seconds);
  }

  keys(pattern?: string, namespace?: StoreNamespace): string[] {
    const regex = pattern
      ? new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`)
      : null;
    if (namespace) {
      return this.partitions[namespace].keys(regex);
    }
    return [
      ...this.partitions.auth.keys(regex),
      ...this.partitions.cache.keys(regex),
    ];
  }

  cleanExpired(): void {
    this.partitions.auth.cleanExpired();
    this.partitions.cache.cleanExpired();
  }

  flush(namespace?: StoreNamespace): void {
    if (namespace) {
      this.partitions[namespace].flush();
      return;
    }
    this.partitions.auth.flush();
    this.partitions.cache.flush();
  }

  getStats() {
    return {
      auth: this.partitions.auth.stats(),
      cache: this.partitions.cache.stats(),
    };
  }
}

export const inMemoryStore = new InMemoryStore();

// Active sweep every 30 seconds in background
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    inMemoryStore.cleanExpired();
  }, 30 * 1000).unref();
}

const reconnectStrategy = (retries: number): number =>
  Math.min(500 * Math.pow(2, Math.min(retries, 6)), 30_000) + Math.floor(Math.random() * 500);

const baseSocketConfig = {
  connectTimeout: 3000,
  keepAlive: true,
  keepAliveInitialDelay: 15000,
  socketTimeout: 210_000,
  reconnectStrategy,
};

export const redisClient = createClient({
  url: redisUrl,
  disableOfflineQueue: true,
  commandsQueueMaxLength: 500,
  pingInterval: 180_000,
  commandOptions: {
    timeout: 1500,
  },
  socket: isTls
    ? {
        ...baseSocketConfig,
        tls: true,
        rejectUnauthorized: false,
      }
    : baseSocketConfig,
});

let isRedisConnected = false;
let lastRedisErrorLogAt = 0;

redisClient.on("error", (e) => {
  const msg = e instanceof Error ? e.message : String(e);
  const now = Date.now();
  if (isRedisConnected || now - lastRedisErrorLogAt >= 60_000) {
    lastRedisErrorLogAt = now;
    console.error("REDIS: Connection error:", msg);
  }
});

redisClient.on("connect", () => {
  isRedisConnected = true;
});

redisClient.on("ready", () => {
  isRedisConnected = true;
  lastRedisErrorLogAt = 0;
});

redisClient.on("end", () => {
  isRedisConnected = false;
});

export async function connectRedis(_maxRetries = 1, _delayMs = 1000): Promise<boolean> {
  if (redisClient.isReady) {
    console.log("REDIS: Already connected.");
    return true;
  }

  const targetUrl = getSanitizedRedisUrl();
  const startupTimeoutMs = 3000;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const readyPromise = new Promise<boolean>((resolve) => {
      const onReady = () => {
        cleanupListeners();
        resolve(true);
      };
      const cleanupListeners = () => {
        redisClient.off("ready", onReady);
      };

      redisClient.on("ready", onReady);

      if (!redisClient.isOpen) {
        redisClient.connect().catch(() => {
          // Background reconnectStrategy continues retrying silently
        });
      }

      if (redisClient.isReady) {
        cleanupListeners();
        resolve(true);
      }
    });

    const timeoutPromise = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), startupTimeoutMs);
      timer.unref?.();
    });

    const connected = await Promise.race([readyPromise, timeoutPromise]);
    if (connected && redisClient.isReady) {
      isRedisConnected = true;
      console.log(`REDIS: Connected successfully to ${targetUrl}`);
      return true;
    }

    console.warn(`REDIS: Could not connect to '${targetUrl}' within ${startupTimeoutMs}ms.`);
    console.warn("REDIS: [WARN] In-memory fallback mode activated while Redis reconnects in background.");
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`REDIS: Connection setup warning for '${targetUrl}': ${msg}`);
    console.warn("REDIS: [WARN] In-memory fallback mode activated.");
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function invalidateJWT(target: Jwt.JwtInvalidateInfo): Promise<void> {
  const id = target.jti;
  const ex = target.ex;
  const key = redisKey(`blacklist:${id}`);

  if (redisClient.isReady) {
    try {
      await withRedisTimeout(redisClient.set(key, "1", { EX: ex }));
      return;
    } catch (err) {
      console.warn("REDIS: Invalidate JWT fallback to memory:", err);
    }
  }
  inMemoryStore.set(key, "1", ex, "auth");
}

export async function verifyJTI(jti: string): Promise<number> {
  const normalized = jti.startsWith("blacklist:") ? jti : `blacklist:${jti}`;
  const key = redisKey(normalized);

  if (redisClient.isReady) {
    try {
      return await withRedisTimeout(redisClient.exists(key));
    } catch (err) {
      console.warn("REDIS: Verify JTI fallback to memory:", err);
    }
  }
  return inMemoryStore.exists(key, "auth");
}

export async function setRefreshToken(
  refreshInfo: RefreshToken.RefreshInfo | RefreshToken.RefreshRecharge,
): Promise<void> {
  const id = String(refreshInfo.id);
  const token = refreshInfo.refreshToken;
  const ex = refreshInfo.ex;
  const newKey = redisKey(`refresh:${token}`);

  if (redisClient.isReady) {
    try {
      if ("oldRefreshToken" in refreshInfo) {
        const oldKey = redisKey(`refresh:${refreshInfo.oldRefreshToken}`);
        const multi = redisClient.multi();
        multi.set(newKey, id, { EX: ex });
        multi.del(oldKey);
        await withRedisTimeout(multi.exec());
      } else {
        await withRedisTimeout(redisClient.set(newKey, id, { EX: ex }));
      }
      return;
    } catch (err) {
      console.warn("REDIS: Set refresh token fallback to memory:", err);
    }
  }

  if ("oldRefreshToken" in refreshInfo) {
    inMemoryStore.del(redisKey(`refresh:${refreshInfo.oldRefreshToken}`), "auth");
  }
  inMemoryStore.set(newKey, id, ex, "auth");
}

export async function getUserIdByRefreshToken(refreshToken: string): Promise<string | null> {
  const key = redisKey(`refresh:${refreshToken}`);
  if (redisClient.isReady) {
    try {
      return await withRedisTimeout(redisClient.get(key));
    } catch (err) {
      console.warn("REDIS: Get refresh token fallback to memory:", err);
    }
  }
  return inMemoryStore.get(key, "auth");
}
