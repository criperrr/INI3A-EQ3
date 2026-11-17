import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const MAX_UPSTREAM_BYTES = 8 * 1024 * 1024; // 8 MiB
const MAX_CONCURRENT_PIPELINES = 2;
const MAX_DISK_CACHE_BYTES = 100 * 1024 * 1024; // 100 MiB
const SWEEP_TARGET_BYTES = 80 * 1024 * 1024; // 80 MiB low-watermark
const MAX_REDIRECT_HOPS = 3;

let activePipelines = 0;
let sharpConfigured = false;
let isSweepingCache = false;

function getImageCacheDir(): string {
  const configured = process.env.IMAGE_CACHE_DIR?.trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), ".cache/images");
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a >= 224) return true; // multicast & reserved
  return false;
}

function isBlockedIpv6(rawIp: string): boolean {
  const zoneIdx = rawIp.indexOf("%");
  const ip = (zoneIdx >= 0 ? rawIp.slice(0, zoneIdx) : rawIp).toLowerCase();

  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    if (net.isIPv4(mapped)) {
      return isBlockedIpv4(mapped);
    }
    const hexParts = mapped.split(":");
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0] || "", 16);
      const lo = parseInt(hexParts[1] || "", 16);
      if (!isNaN(hi) && !isNaN(lo)) {
        const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isBlockedIpv4(ipv4);
      }
    }
    return true;
  }

  const firstSeg = ip.split(":")[0] || "";
  if (firstSeg) {
    const val = parseInt(firstSeg, 16);
    if (!isNaN(val)) {
      // fc00::/7 Unique Local Addresses (fc.. / fd..)
      if ((val & 0xfe00) === 0xfc00) return true;
      // fe80::/10 Link-Local
      if ((val & 0xffc0) === 0xfe80) return true;
      // ff00::/8 Multicast
      if ((val & 0xff00) === 0xff00) return true;
    }
  }

  return false;
}

function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error("Invalid image URL format."), { statusCode: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw Object.assign(new Error("Only http and https protocols are supported."), { statusCode: 400 });
  }

  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("Credentials in image URL are not permitted."), { statusCode: 400 });
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw Object.assign(new Error("Access to private network addresses is restricted."), { statusCode: 403 });
  }

  if (net.isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      throw Object.assign(new Error("Access to private network addresses is restricted."), { statusCode: 403 });
    }
    return parsed;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw Object.assign(new Error("Could not resolve source image host."), { statusCode: 400 });
  }

  if (!addresses || addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    throw Object.assign(new Error("Access to private network addresses is restricted."), { statusCode: 403 });
  }

  return parsed;
}

async function fetchSafeUpstream(initialUrl: string, attempt = 0): Promise<globalThis.Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    await assertSafePublicUrl(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    timeoutId.unref?.();

    let response: globalThis.Response;
    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "PrescoApp/1.6 (+https://github.com/criperrr/INI3A-EQ3)",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
    } catch (err) {
      if (attempt < 1) {
        return fetchSafeUpstream(currentUrl, attempt + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location) {
        throw Object.assign(new Error("Redirect response missing Location header."), { statusCode: 502 });
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw Object.assign(new Error("Too many redirects from source image URL."), { statusCode: 502 });
}

async function readResponseWithCap(response: globalThis.Response, maxBytes: number): Promise<Buffer> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (!isNaN(declared) && declared > maxBytes) {
      await response.body?.cancel().catch(() => {});
      throw Object.assign(new Error("Source image exceeds 8 MiB limit."), { statusCode: 413 });
    }
  }

  if (!response.body) {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) {
      throw Object.assign(new Error("Source image exceeds 8 MiB limit."), { statusCode: 413 });
    }
    return Buffer.from(ab);
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw Object.assign(new Error("Source image exceeds 8 MiB limit."), { statusCode: 413 });
        }
        chunks.push(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

async function sweepDiskCacheIfNeeded(cacheDir: string): Promise<void> {
  if (isSweepingCache) return;
  isSweepingCache = true;
  try {
    const entries = await fsp.readdir(cacheDir, { withFileTypes: true });
    const fileStats: Array<{ filePath: string; size: number; mtimeMs: number }> = [];
    let totalSize = 0;
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(cacheDir, entry.name);
      try {
        const st = await fsp.stat(filePath);
        if (entry.name.startsWith(".tmp.")) {
          if (now - st.mtimeMs > 5 * 60 * 1000) {
            await fsp.unlink(filePath).catch(() => {});
          }
          continue;
        }
        totalSize += st.size;
        fileStats.push({ filePath, size: st.size, mtimeMs: st.mtimeMs });
      } catch {
        // Ignore vanished entries
      }
    }

    if (totalSize <= MAX_DISK_CACHE_BYTES) return;

    // LRU eviction: oldest mtime first until down to low-watermark
    fileStats.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const item of fileStats) {
      if (totalSize <= SWEEP_TARGET_BYTES) break;
      await fsp.unlink(item.filePath).catch(() => {});
      totalSize -= item.size;
    }
  } catch {
    // Ignore sweep errors
  } finally {
    isSweepingCache = false;
  }
}

export class ImageOptimizerController {
  async optimize(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, w, q = 80, fmt = "webp" } = req.query;

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Image URL parameter 'url' is required." });
      }

      try {
        await assertSafePublicUrl(url);
      } catch (err: any) {
        const status = err?.statusCode || 400;
        return res.status(status).json({ error: err?.message || "Invalid image URL." });
      }

      const parsedWidth = w ? parseInt(String(w), 10) : undefined;
      const width = parsedWidth && !isNaN(parsedWidth) ? Math.min(1920, Math.max(16, parsedWidth)) : undefined;
      const quality = Math.min(100, Math.max(10, parseInt(String(q), 10) || 80));
      const rawFmt = String(fmt).toLowerCase();
      const safeFormat = rawFmt === "webp" ? "webp" : rawFmt === "avif" ? "avif" : "jpeg";

      const cacheDir = getImageCacheDir();
      const cacheHash = createHash("sha256")
        .update(`${url}_${width ?? "orig"}_${quality}_${safeFormat}`)
        .digest("hex");
      const cacheFilePath = path.join(cacheDir, `${cacheHash}.${safeFormat}`);

      // 1. Check bounded disk cache (HIT)
      if (fs.existsSync(cacheFilePath)) {
        try {
          const imageBuffer = await fsp.readFile(cacheFilePath);
          const now = new Date();
          fsp.utimes(cacheFilePath, now, now).catch(() => {});

          const etag = `"${createHash("md5").update(imageBuffer).digest("hex")}"`;
          if (req.headers["if-none-match"] === etag) {
            return res.status(304).end();
          }

          res.setHeader("Content-Type", `image/${safeFormat}`);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("ETag", etag);
          res.setHeader("X-Cache", "HIT");
          return res.status(200).send(imageBuffer);
        } catch {
          // Fall through on transient read error
        }
      }

      // 2. Enforce max concurrent Sharp pipelines
      if (activePipelines >= MAX_CONCURRENT_PIPELINES) {
        return res.status(503).json({ error: "Image optimizer busy. Try again shortly." });
      }

      activePipelines += 1;
      try {
        let response: globalThis.Response;
        try {
          response = await fetchSafeUpstream(url);
          if (response.status === 404 && url.includes("openfoodfacts.org") && url.includes(".400.jpg")) {
            await response.body?.cancel().catch(() => {});
            response = await fetchSafeUpstream(url.replace(".400.jpg", ".full.jpg"));
          }
        } catch (err: any) {
          const status = err?.statusCode || 502;
          return res.status(status).json({ error: err?.message || "Failed to fetch source image." });
        }

        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          return res.status(response.status).json({ error: "Failed to retrieve source image." });
        }

        let inputBuffer: Buffer;
        try {
          inputBuffer = await readResponseWithCap(response, MAX_UPSTREAM_BYTES);
        } catch (err: any) {
          const status = err?.statusCode || 413;
          return res.status(status).json({ error: err?.message || "Source image too large." });
        }

        // 3. Sharp dynamic processing with strict memory/pixel limits and raw fallback
        let outputBuffer: Buffer;
        let outputContentType = `image/${safeFormat}`;
        let optimized = false;

        try {
          const sharp = (await import("sharp")).default;
          if (!sharpConfigured) {
            sharp.cache(false);
            sharp.concurrency(1);
            sharpConfigured = true;
          }

          let pipeline = sharp(inputBuffer, { limitInputPixels: 25_000_000 });

          if (width && width > 0) {
            pipeline = pipeline.resize({ width, withoutEnlargement: true });
          }

          if (safeFormat === "webp") {
            pipeline = pipeline.webp({ quality, effort: 4 });
          } else if (safeFormat === "avif") {
            pipeline = pipeline.avif({ quality, effort: 4 });
          } else {
            pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          }

          outputBuffer = await pipeline.toBuffer();
          optimized = true;
        } catch {
          outputBuffer = inputBuffer;
          const originContentType = response.headers.get("content-type")?.split(";")[0]?.trim();
          outputContentType =
            originContentType && originContentType.startsWith("image/")
              ? originContentType
              : "image/jpeg";
        }

        const etag = `"${createHash("md5").update(outputBuffer).digest("hex")}"`;

        // 4. Persist optimized image atomically to bounded disk cache (never Redis/RAM)
        if (optimized) {
          try {
            await fsp.mkdir(cacheDir, { recursive: true });
            const tmpPath = path.join(cacheDir, `.tmp.${cacheHash}.${process.pid}.${Date.now()}`);
            await fsp.writeFile(tmpPath, outputBuffer);
            await fsp.rename(tmpPath, cacheFilePath);
            void sweepDiskCacheIfNeeded(cacheDir);
          } catch (cacheErr) {
            console.warn("[ImageOptimizer] Disk cache write warning:", cacheErr);
          }
        }

        res.setHeader("Content-Type", outputContentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", etag);
        res.setHeader("X-Cache", optimized ? "MISS" : "BYPASS");
        return res.status(200).send(outputBuffer);
      } finally {
        activePipelines = Math.max(0, activePipelines - 1);
      }
    } catch (error) {
      next(error);
    }
  }
}

export const imageOptimizerController = new ImageOptimizerController();
