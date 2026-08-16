import "dotenv/config";
import app from "@/app";
import { connectRedis, redisClient } from "@/shared/redis/server";
import { pool, testDatabaseConnection } from "@/shared/database/database";

const PORT = process.env.SERVER_PORT || 3333;
const HOST = process.env.SERVER_HOST || "0.0.0.0";

async function bootstrap() {
  await connectRedis();
  await testDatabaseConnection();

  const server = app.listen(Number(PORT), HOST, () => {
    console.log(`SERVER: Running on http://${HOST}:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`SERVER: Received ${signal}, closing gracefully...`);
    server.close(async () => {
      try {
        await pool.end();
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (err) {
        console.error("SERVER: Error during shutdown:", err);
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});