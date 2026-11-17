import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { redisClient, redisKey, withRedisTimeout } from "@/shared/redis/server";
import { TooManyRequestsError } from "@/shared/errors/errors";

interface RateLimiterOptions {
  windowMs: number; // Duration in milliseconds
  maxRequests: number; // Max requests allowed per window
  keyPrefix: string; // Identifier prefix for the bucket
  message?: string;
}

const MAX_MEMORY_BUCKETS = 5000;
const RATE_LIMIT_LUA =
  "local c = redis.call('INCR', KEYS[1]); if c == 1 or redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end; return c";

// In-memory fallback bucket for when Redis is disconnected or during local tests
const memoryBuckets = new Map<string, { count: number; resetTime: number }>();

function sweepExpiredMemoryBuckets(now: number): void {
  for (const [k, b] of memoryBuckets.entries()) {
    if (now > b.resetTime) {
      memoryBuckets.delete(k);
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    sweepExpiredMemoryBuckets(Date.now());
  }, 60 * 1000).unref();
}

export function isAuthorizedTestBypass(req: Request): boolean {
  if (process.env.NODE_ENV !== "test") {
    return false;
  }
  const expectedSecret = (process.env.K6_TEST_SECRET || "").trim();
  if (!expectedSecret) {
    return false;
  }
  const rawHeader = req.headers?.["x-k6-test-secret"];
  const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!provided || typeof provided !== "string") {
    return false;
  }
  const expectedBuf = Buffer.from(expectedSecret, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, keyPrefix, message } = options;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      if (isAuthorizedTestBypass(req)) {
        return next();
      }

      const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";
      const key = redisKey(`ratelimit:${keyPrefix}:${ip}`);

      if (redisClient.isReady) {
        try {
          const rawCount = await withRedisTimeout(
            redisClient.eval(RATE_LIMIT_LUA, {
              keys: [key],
              arguments: [String(windowSeconds)],
            }),
            1500,
          );
          const count = Number(rawCount);

          if (count > maxRequests) {
            throw new TooManyRequestsError(
              message || "Muitas requisições. Por favor, aguarde antes de tentar novamente.",
            );
          }
          return next();
        } catch (err) {
          if (err instanceof TooManyRequestsError) {
            throw err;
          }
          // On transient Redis network/timeout error, fall through to bounded in-memory bucket
        }
      }

      // Bounded in-memory fallback
      const now = Date.now();
      const bucket = memoryBuckets.get(key);

      if (!bucket || now > bucket.resetTime) {
        if (bucket) {
          memoryBuckets.delete(key);
        }
        if (memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
          sweepExpiredMemoryBuckets(now);
          while (memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
            const oldestKey = memoryBuckets.keys().next().value;
            if (!oldestKey) break;
            memoryBuckets.delete(oldestKey);
          }
        }
        memoryBuckets.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        bucket.count += 1;
        if (bucket.count > maxRequests) {
          throw new TooManyRequestsError(
            message || "Muitas requisições. Por favor, aguarde antes de tentar novamente.",
          );
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// 120 requests per minute global protection per IP
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  keyPrefix: "global",
  message: "Muitas requisições detectadas. Aguarde um momento antes de continuar.",
});

// 10 requests per minute for sensitive authentication actions (login, register, refresh, password change)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: "auth",
  message: "Muitas tentativas de autenticação. Tente novamente em 1 minuto.",
});

// 60 requests per minute for public barcode / catalog search
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "search",
  message: "Limite de consultas excedido. Aguarde alguns instantes.",
});

// 20 requests per minute for CPU/network-heavy compute routes (image optimization, route solver)
export const heavyComputeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: "compute",
  message: "Limite de processamento intensivo excedido. Aguarde alguns instantes.",
});

// 30 requests per minute for write/mutation routes
export const writeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "write",
  message: "Limite de envios excedido. Aguarde alguns instantes.",
});
