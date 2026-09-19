import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { redisClient, inMemoryStore } from "@/shared/redis/server";

interface CacheOptions {
  ttlSeconds?: number;          // Cache duration in Redis / Memory (default: 120s)
  clientMaxAge?: number;        // Client-side Cache-Control max-age (default: 60s)
  staleWhileRevalidate?: number; // SWR window (default: 120s)
}

function computeKey(req: Request): string {
  const url = req.originalUrl || req.url;
  const hash = createHash("md5").update(url).digest("hex");
  const prefix = req.baseUrl ? req.baseUrl.replace(/\//g, ":") : "root";
  return `cache:http:${prefix}:${hash}`;
}

export function cacheResponse(options: CacheOptions = {}) {
  const { ttlSeconds = 120, clientMaxAge = 60, staleWhileRevalidate = 120 } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const key = computeKey(req);

    try {
      const cached = redisClient.isOpen 
        ? await redisClient.get(key) 
        : inMemoryStore.get(key);

      if (cached) {
        const payload = JSON.parse(cached) as { body: string; etag: string; contentType: string };

        // Conditional HTTP Validation (ETag / 304 Not Modified)
        if (req.headers["if-none-match"] === payload.etag) {
          return res.status(304).end();
        }

        res.setHeader("X-Cache", "HIT");
        res.setHeader("ETag", payload.etag);
        res.setHeader("Cache-Control", `public, max-age=${clientMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader("Content-Type", payload.contentType || "application/json; charset=utf-8");
        return res.status(200).send(payload.body);
      }
    } catch (err) {
      console.warn(`[Cache Middleware] Read error for ${key}:`, err);
    }

    res.setHeader("X-Cache", "MISS");

    // Intercept response body on 200 OK
    const originalSend = res.send.bind(res);
    res.send = (body: any): Response => {
      if (res.statusCode === 200 && body) {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        const etag = `"${createHash("sha1").update(bodyStr).digest("hex")}"`;

        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", `public, max-age=${clientMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`);

        const payload = JSON.stringify({
          body: bodyStr,
          etag,
          contentType: res.getHeader("Content-Type") || "application/json; charset=utf-8",
        });

        // Fire-and-forget cache write
        (async () => {
          try {
            if (redisClient.isOpen) {
              await redisClient.set(key, payload, { EX: ttlSeconds });
            } else {
              inMemoryStore.set(key, payload, ttlSeconds);
            }
          } catch (writeErr) {
            console.warn(`[Cache Middleware] Write error for ${key}:`, writeErr);
          }
        })();
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Invalidate cached HTTP routes by namespace pattern.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    if (redisClient.isOpen) {
      const keys = await redisClient.keys(`cache:http:*${pattern}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      const keys = inMemoryStore.keys(`cache:http:*${pattern}*`);
      for (const k of keys) {
        inMemoryStore.del(k);
      }
    }
  } catch (err) {
    console.warn(`[Cache Invalidation] Error invalidating ${pattern}:`, err);
  }
}
