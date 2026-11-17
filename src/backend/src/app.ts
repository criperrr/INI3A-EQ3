import crypto from "node:crypto";
import e from "express";
import cors from "cors";
import compression from "compression";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import { globalRateLimiter } from "@/shared/middlewares/rateLimiter";
import authRouter from "@/modules/auth/auth.routes";
import productRouter from "@/modules/product/product.routes";
import ocurrencyRouter from "@/modules/ocurrency/ocurrency.routes";
import marketRouter from "@/modules/market/market.routes";
import customizationRouter from "@/modules/customization/customization.routes";
import cartRouter from "@/modules/cart/cart.routes";
import imageRouter from "@/modules/image/image.routes";
import { checkDatabaseHealth } from "@/shared/database/database";
import { redisClient, withRedisTimeout } from "@/shared/redis/server";

const app = e();

app.set("trust proxy", "loopback");
app.disable("x-powered-by");

// Request correlation & selective JSON access logging (errors or slow >500ms; skips fast /health)
app.use((req, res, next) => {
  const rawHeader = req.headers["x-request-id"];
  const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const requestId =
    typeof candidate === "string" && /^[a-zA-Z0-9._-]{1,64}$/.test(candidate.trim())
      ? candidate.trim()
      : crypto.randomUUID();

  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startNs = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const urlPath = req.originalUrl || req.url;
    const isHealthProbe = urlPath === "/health" || urlPath === "/ping";
    if (isHealthProbe && res.statusCode < 400 && durationMs <= 500) {
      return;
    }
    if (res.statusCode >= 400 || durationMs > 500) {
      console.log(
        JSON.stringify({
          level: res.statusCode >= 500 ? "error" : "warn",
          type: "http_access",
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          path: urlPath,
          status: res.statusCode,
          durationMs: Math.round(durationMs),
          ip: req.ip,
        }),
      );
    }
  });

  next();
});

// Defensive security headers
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, server-to-server requests with no origin
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production" || !allowedOrigins || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS: Origem não permitida pela política de segurança."));
    },
    credentials: true,
  }),
);

// Layer 2: HTTP Payload Compression (Brotli / Gzip)
app.use(
  compression({
    level: 6,           // Balanced CPU usage to compression ratio
    threshold: 1024,    // Skip compression for responses smaller than 1KB
    filter: (req: any, res: any) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(e.json({ limit: "1mb" }));
app.use(e.urlencoded({ extended: true, limit: "1mb" }));

app.get(["/health", "/ping", "/products/barcode/ping"], async (_, res) => {
  const isDbHealthy = await checkDatabaseHealth();
  const isRedisHealthy =
    redisClient.isReady &&
    (await withRedisTimeout(redisClient.ping(), 1500)
      .then(() => true)
      .catch(() => false));
  const redisMode = isRedisHealthy ? "connected" : "in-memory-fallback";
  const isHealthy = isDbHealthy;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? (isRedisHealthy ? "ok" : "healthy (in-memory redis)") : "degraded",
    database: isDbHealthy ? "connected" : "disconnected",
    redis: redisMode,
    timestamp: new Date().toISOString(),
  });
});

app.get(["/", "/index.html", "/index.php"], (_, res) => {
  return res.status(200).json({
    name: "Presco API",
    description: "API de Monitoramento de Preços, Scanner EAN-13 e Otimizador de Rotas",
    status: "online",
    version: "1.6.0",
    health: "/health",
    docs: "/api/v1",
    timestamp: new Date().toISOString(),
  });
});

app.use(globalRateLimiter);

app.use("/api/v1", (_, res) => {
  return res.status(200).json({ message: "API is running!" });
});

app.use("/auth", authRouter);
app.use("/products", productRouter);
app.use("/ocurrency", ocurrencyRouter);
app.use("/markets", marketRouter);
app.use("/customizations", customizationRouter);
app.use("/images", imageRouter);
app.use("/cart", cartRouter);

app.use(errorHandler);

export default app;
