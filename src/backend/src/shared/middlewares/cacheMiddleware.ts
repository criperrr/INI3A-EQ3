import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { redisClient, inMemoryStore, redisKey, withRedisTimeout } from "@/shared/redis/server";

interface CacheOptions {
  ttlSeconds?: number;          // Cache duration in Redis / Memory (default: 120s)
  clientMaxAge?: number;        // Client-side Cache-Control max-age (default: 60s)
  staleWhileRevalidate?: number; // SWR window (default: 120s)
  allowedQueryParams?: string[];
}

const MAX_CACHE_ENTRY_BYTES = 65536; // 64 KiB cap per cached HTTP payload
const DEFAULT_ALLOWED_QUERY_PARAMS = new Set([
  "search",
  "category",
  "marketId",
  "marketName",
  "page",
  "limit",
  "sortBy",
  "sortOrder",
  "latitude",
  "longitude",
  "radius",
  "onlyPromotions",
  "period",
]);

function isHttpCacheEnabled(): boolean {
  return process.env.ENABLE_HTTP_CACHE !== "false";
}

function getNamespace(req: Request): string {
  const raw = (req.baseUrl || "root").replace(/^\/+|\/+$/g, "").replace(/\//g, ":");
  return raw || "root";
}

function normalizePatternNamespace(pattern: string): string {
  const clean = pattern.replace(/^:+|:+$/g, "").replace(/\//g, ":");
  return clean || "root";
}

async function getNamespaceVersion(namespace: string): Promise<string> {
  const verKey = redisKey(`cache:ver:${namespace}`);
  if (redisClient.isReady) {
    try {
      const v = await withRedisTimeout(redisClient.get(verKey), 1500);
      if (v) return v;
    } catch {
      // Fallback to in-memory version counter
    }
  }
  return inMemoryStore.get(verKey, "auth") || "0";
}

function computeKey(
  req: Request,
  namespace: string,
  version: string,
  allowedParams: Set<string>,
): string {
  const pathPart = `${req.baseUrl || ""}${req.path || "/"}`;
  const queryEntries: string[] = [];
  const queryObj = req.query || {};

  for (const key of Object.keys(queryObj).sort()) {
    if (!allowedParams.has(key)) continue;
    const rawVal = queryObj[key];
    if (rawVal === undefined || rawVal === null) continue;
    const valStr = Array.isArray(rawVal) ? rawVal.join(",") : String(rawVal);
    queryEntries.push(`${key}=${valStr}`);
  }

  const canonical = queryEntries.length > 0 ? `${pathPart}?${queryEntries.join("&")}` : pathPart;
  const hash = createHash("md5").update(canonical).digest("hex");
  return redisKey(`cache:http:${namespace}:v${version}:${hash}`);
}

export function cacheResponse(options: CacheOptions = {}) {
  const {
    ttlSeconds = 120,
    clientMaxAge = 60,
    staleWhileRevalidate = 120,
    allowedQueryParams,
  } = options;
  const allowedSet = allowedQueryParams
    ? new Set(allowedQueryParams)
    : DEFAULT_ALLOWED_QUERY_PARAMS;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isHttpCacheEnabled() || (req.method !== "GET" && req.method !== "HEAD")) {
      return next();
    }

    const namespace = getNamespace(req);
    const version = await getNamespaceVersion(namespace);
    const key = computeKey(req, namespace, version, allowedSet);

    try {
      const cached = redisClient.isReady
        ? await withRedisTimeout(redisClient.get(key), 1500)
        : inMemoryStore.get(key, "cache");

      if (cached) {
        const payload = JSON.parse(cached) as { body: string; etag: string; contentType: string };

        // Conditional HTTP Validation (ETag / 304 Not Modified)
        if (req.headers["if-none-match"] === payload.etag) {
          return res.status(304).end();
        }

        res.setHeader("X-Cache", "HIT");
        res.setHeader("ETag", payload.etag);
        res.setHeader(
          "Cache-Control",
          `public, max-age=${clientMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        );
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
        res.setHeader(
          "Cache-Control",
          `public, max-age=${clientMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        );

        const payload = JSON.stringify({
          body: bodyStr,
          etag,
          contentType: res.getHeader("Content-Type") || "application/json; charset=utf-8",
        });

        if (Buffer.byteLength(payload, "utf8") <= MAX_CACHE_ENTRY_BYTES) {
          (async () => {
            try {
              if (redisClient.isReady) {
                await withRedisTimeout(redisClient.set(key, payload, { EX: ttlSeconds }), 1500);
              } else {
                inMemoryStore.set(key, payload, ttlSeconds, "cache");
              }
            } catch (writeErr) {
              console.warn(`[Cache Middleware] Write error for ${key}:`, writeErr);
            }
          })();
        }
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * O(1) namespace invalidation via version counter (avoids blocking Redis KEYS * scans).
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const namespace = normalizePatternNamespace(pattern);
    const verKey = redisKey(`cache:ver:${namespace}`);
    inMemoryStore.incr(verKey, "auth");

    if (redisClient.isReady) {
      await withRedisTimeout(redisClient.incr(verKey), 1500);
    }
  } catch (err) {
    console.warn(`[Cache Invalidation] Error invalidating ${pattern}:`, err);
  }
}
