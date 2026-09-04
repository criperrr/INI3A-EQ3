import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import app from "@/app";
import { connectRedis, redisClient } from "@/shared/redis/server";
import { db, pool, testDatabaseConnection } from "@/shared/database/database";
import { seedDatabase } from "@/shared/database/seed";

const PORT = process.env.SERVER_PORT || 3333;
const HOST = process.env.SERVER_HOST || "0.0.0.0";

async function bootstrap() {
  await connectRedis();
  await testDatabaseConnection();

  const migrationsFolder = path.resolve(__dirname, "shared/database/drizzle");
  try {
    await migrate(db, { migrationsFolder });
    console.log("DATABASE: Migrations applied.");
  } catch (err: any) {
    console.warn(`DATABASE: Migrations notice: ${err?.message || err}`);
  }

  await seedDatabase().catch((e) => console.error("SEED WARNING:", e));


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