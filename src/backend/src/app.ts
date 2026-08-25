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

const app = e();

// Defensive security headers
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(cors());
app.use(e.json({ limit: "1mb" }));
app.use(e.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", async (_, res) => {
  const isDbHealthy = await checkDatabaseHealth();
  const isRedisHealthy = redisClient.isOpen && (await redisClient.ping().then(() => true).catch(() => false));
  const isHealthy = isDbHealthy && isRedisHealthy;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    database: isDbHealthy ? "connected" : "disconnected",
    redis: isRedisHealthy ? "connected" : "disconnected",
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

app.use(errorHandler);

export default app;

