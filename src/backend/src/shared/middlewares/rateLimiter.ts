import type { Request, Response, NextFunction } from "express";
import { redisClient } from "@/shared/redis/server";
import { TooManyRequestsError } from "@/shared/errors/errors";

interface RateLimiterOptions {
  windowMs: number; // Duration in milliseconds
  maxRequests: number; // Max requests allowed per window
  keyPrefix: string; // Identifier prefix for the bucket
  message?: string;
}

// In-memory fallback bucket for when Redis is disconnected or during local tests
const memoryBuckets = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, keyPrefix, message } = options;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "127.0.0.1";

      const key = `ratelimit:${keyPrefix}:${ip}`;

      if (redisClient.isOpen) {
        try {
          // Atomic Redis increment
          const count = await redisClient.incr(key);
          if (count === 1) {
            await redisClient.expire(key, windowSeconds);
          }

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
          // On transient Redis network error, fall through to in-memory bucket
        }
      }

      // In-memory fallback
      const now = Date.now();
      const bucket = memoryBuckets.get(key);

      if (!bucket || now > bucket.resetTime) {
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

// 10 requests per minute for sensitive authentication actions (login, register, password change)
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
