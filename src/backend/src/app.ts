import e from "express";
import cors from "cors";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import authRouter from "@/modules/auth/auth.routes";
import productRouter from "@/modules/product/product.routes";
import ocurrencyRouter from "@/modules/ocurrency/ocurrency.routes";
import marketRouter from "@/modules/market/market.routes";

import { checkDatabaseHealth } from "@/shared/database/database";
import { redisClient } from "@/shared/redis/server";

const app = e();

app.use(cors());
app.use(e.json());

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

app.use(errorHandler);

export default app;

