import e from "express";
import cors from "cors";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import authRouter from "@/modules/auth/auth.routes";
import productRouter from "@/modules/product/product.routes";
import ocurrencyRouter from "@/modules/ocurrency/ocurrency.routes";
import marketRouter from "@/modules/market/market.routes";
import customizationRouter from "@/modules/customization/customization.routes";

import { checkDatabaseHealth } from "@/shared/database/database";
import { redisClient } from "@/shared/redis/server";

import compression from "compression";
import imageRouter from "@/modules/image/image.routes";

const app = e();

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
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(e.json({ limit: "1mb" }));
app.use(e.urlencoded({ extended: true, limit: "1mb" }));

app.get(["/health", "/ping", "/products/barcode/ping"], async (_, res) => {
  const isDbHealthy = await checkDatabaseHealth();
  const isRedisHealthy = redisClient.isOpen && (await redisClient.ping().then(() => true).catch(() => false));
  const redisMode = isRedisHealthy ? "connected" : "in-memory-fallback";
  const isHealthy = isDbHealthy;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? (isRedisHealthy ? "ok" : "healthy (in-memory redis)") : "degraded",
    database: isDbHealthy ? "connected" : "disconnected",
    redis: redisMode,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", (_, res) => {
  return res.status(200).json({ message: "API is running!" });
});

app.use("/auth", authRouter);
app.use("/products", productRouter);
app.use("/ocurrency", ocurrencyRouter);
app.use("/markets", marketRouter);
app.use("/customizations", customizationRouter);
app.use("/images", imageRouter);

app.use(errorHandler);

export default app;

