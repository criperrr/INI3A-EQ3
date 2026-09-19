import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { redisClient, inMemoryStore } from "@/shared/redis/server";

export class ImageOptimizerController {
  async optimize(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, w, q = 80, fmt = "webp" } = req.query;

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Image URL parameter 'url' is required." });
      }

      // Security check: validate URL scheme (prevent local file access / SSRF)
      try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return res.status(400).json({ error: "Only http and https protocols are supported." });
        }
        // Block loopback and internal hostname patterns
        const hostname = parsedUrl.hostname.toLowerCase();
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
          return res.status(403).json({ error: "Access to private network addresses is restricted." });
        }
      } catch {
        return res.status(400).json({ error: "Invalid image URL format." });
      }

      const parsedWidth = w ? parseInt(String(w), 10) : undefined;
      const width = parsedWidth && !isNaN(parsedWidth) ? Math.min(1920, Math.max(16, parsedWidth)) : undefined;
      const quality = Math.min(100, Math.max(10, parseInt(String(q), 10) || 80));
      const format = String(fmt).toLowerCase();

      const cacheKey = `cache:img:${createHash("md5").update(`${url}_${width}_${quality}_${format}`).digest("hex")}`;

      // 1. Check cached binary buffer
      const cached = redisClient.isOpen 
        ? await redisClient.get(cacheKey) 
        : inMemoryStore.get(cacheKey);

      if (cached) {
        const imageBuffer = Buffer.from(cached, "base64");
        const etag = `"${createHash("md5").update(imageBuffer).digest("hex")}"`;

        if (req.headers["if-none-match"] === etag) {
          return res.status(304).end();
        }

        res.setHeader("Content-Type", `image/${format}`);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", etag);
        res.setHeader("X-Cache", "HIT");
        return res.status(200).send(imageBuffer);
      }

      // 2. Fetch origin media
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to retrieve source image." });
      }

      const inputBuffer = Buffer.from(await response.arrayBuffer());

      // 3. Sharp dynamic processing
      const sharp = (await import("sharp")).default;
      let pipeline = sharp(inputBuffer);

      if (width && width > 0) {
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      }

      if (format === "webp") {
        pipeline = pipeline.webp({ quality, effort: 4 });
      } else if (format === "avif") {
        pipeline = pipeline.avif({ quality, effort: 4 });
      } else {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      }

      const outputBuffer = await pipeline.toBuffer();
      const etag = `"${createHash("md5").update(outputBuffer).digest("hex")}"`;

      // 4. Save to cache (7 days TTL)
      const base64Data = outputBuffer.toString("base64");
      const ttl = 60 * 60 * 24 * 7;

      if (redisClient.isOpen) {
        await redisClient.set(cacheKey, base64Data, { EX: ttl });
      } else {
        inMemoryStore.set(cacheKey, base64Data, ttl);
      }

      res.setHeader("Content-Type", `image/${format}`);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("ETag", etag);
      res.setHeader("X-Cache", "MISS");
      return res.status(200).send(outputBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const imageOptimizerController = new ImageOptimizerController();
