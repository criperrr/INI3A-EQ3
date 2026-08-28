import { createClient } from "redis";
import { env } from "../config/env";

const rawRedisUrl = process.env.REDIS_URL || env.REDIS_URL || "redis://localhost:6379";
const redisUrl = rawRedisUrl.trim().replace(/^['"]|['"]$/g, "");
const isTls = redisUrl.startsWith("rediss://");

// Helper to sanitize Redis connection URL for logs
export function getSanitizedRedisUrl(url: string = redisUrl): string {
  try {
    return url.replace(/:[^:@]+@/, ":***@");
  } catch {
    return "redis://localhost:6379";
  }
}

// In-memory fallback cache when Redis is unavailable
export class InMemoryStore {
  private store = new Map<string, { value: string; expiresAt?: number | undefined }>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, exSeconds?: number): void {
    const expiresAt = exSeconds && exSeconds > 0 ? Date.now() + exSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): number {
    return this.store.delete(key) ? 1 : 0;
  }

  exists(key: string): number {
    return this.get(key) !== null ? 1 : 0;
  }

  incr(key: string): number {
    const current = this.get(key);
    const num = (current ? parseInt(current, 10) : 0) + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: String(num), expiresAt: entry?.expiresAt });
    return num;
  }

  expire(key: string, seconds: number): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  flush(): void {
    this.store.clear();
  }
}

export const inMemoryStore = new InMemoryStore();

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    ...(isTls ? { tls: true, rejectUnauthorized: false } : {}),
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        return false; // Stop retrying silently without unhandled exception spam
      }
      return Math.min(retries * 200, 2000);
    },
  },
});

let isRedisConnected = false;

redisClient.on("error", (e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (isRedisConnected) {
    console.error("REDIS: Connection error:", msg);
  }
});

redisClient.on("connect", () => {
  isRedisConnected = true;
});

redisClient.on("end", () => {
  isRedisConnected = false;
});

export async function connectRedis(maxRetries = 2, delayMs = 1000): Promise<boolean> {
  if (redisClient.isOpen) {
    console.log("REDIS: Already connected.");
    return true;
  }

  const targetUrl = getSanitizedRedisUrl();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await redisClient.connect();
      isRedisConnected = true;
      console.log(`REDIS: Connected successfully to ${targetUrl}`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt === maxRetries) {
        console.warn(`REDIS: Could not connect to '${targetUrl}' (${msg || "connection refused - server offline"}).`);
        console.warn(`REDIS: ⚠️ In-memory fallback mode activated. Sessions and tokens will be cached safely in-memory.`);
        return false;
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  return false;
}

export async function invalidateJWT(target: Jwt.JwtInvalidateInfo): Promise<void> {
  const id = target.jti;
  const ex = target.ex;

  if (redisClient.isOpen) {
    try {
      await redisClient.set(`blacklist:${id}`, "1", { EX: ex });
      return;
    } catch (err) {
      console.warn("REDIS: Invalidate JWT fallback to memory:", err);
    }
  }
  inMemoryStore.set(`blacklist:${id}`, "1", ex);
}

export async function verifyJTI(jti: string): Promise<number> {
  if (redisClient.isOpen) {
    try {
      return await redisClient.exists(jti);
    } catch (err) {
      console.warn("REDIS: Verify JTI fallback to memory:", err);
    }
  }
  return inMemoryStore.exists(jti);
}

export async function setRefreshToken(
  refreshInfo: RefreshToken.RefreshInfo | RefreshToken.RefreshRecharge,
): Promise<void> {
  const id = refreshInfo.id;
  const token = refreshInfo.refreshToken;
  const ex = refreshInfo.ex;

  if (redisClient.isOpen) {
    try {
      if ("oldRefreshToken" in refreshInfo) {
        const oldRefreshToken = refreshInfo.oldRefreshToken;
        const multi = redisClient.multi();
        multi.set(`refresh:${token}`, id, { EX: ex });
        multi.del(`refresh:${oldRefreshToken}`);
        await multi.exec();
      } else {
        await redisClient.set(`refresh:${token}`, id, { EX: ex });
      }
      return;
    } catch (err) {
      console.warn("REDIS: Set refresh token fallback to memory:", err);
    }
  }

  if ("oldRefreshToken" in refreshInfo) {
    inMemoryStore.del(`refresh:${refreshInfo.oldRefreshToken}`);
  }
  inMemoryStore.set(`refresh:${token}`, String(id), ex);
}

export async function getUserIdByRefreshToken(refreshToken: string): Promise<string | null> {
  if (redisClient.isOpen) {
    try {
      return await redisClient.get(`refresh:${refreshToken}`);
    } catch (err) {
      console.warn("REDIS: Get refresh token fallback to memory:", err);
    }
  }
  return inMemoryStore.get(`refresh:${refreshToken}`);
}
