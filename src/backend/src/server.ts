import "@/shared/config/env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { initCrashLogger, logFatalError } from "@/shared/util/crashLogger";

initCrashLogger();

import { env } from "@/shared/config/env";
import app from "@/app";
import { connectRedis, redisClient } from "@/shared/redis/server";
import {
  db,
  pool,
  testDatabaseConnection,
  assertSchemaReady,
  migrationsSchema,
  findMigrationsFolder,
  resolveMigrationsFolder,
} from "@/shared/database/database";
import { seedDatabase } from "@/shared/database/seed";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = env.SERVER_PORT;
const HOST = env.SERVER_HOST;

async function bootstrap() {
  await connectRedis();
  await testDatabaseConnection();

  if (process.env.RUN_STARTUP_MIGRATIONS === "1") {
    const baseMigrationsFolder = findMigrationsFolder([
      path.resolve(__dirname, "shared/database/drizzle"),
      path.resolve(__dirname, "../shared/database/drizzle"),
      path.resolve(process.cwd(), "dist/shared/database/drizzle"),
      path.resolve(process.cwd(), "src/shared/database/drizzle"),
      path.resolve(process.cwd(), "src/backend/src/shared/database/drizzle"),
    ]);
    const resolved = resolveMigrationsFolder(baseMigrationsFolder);
    try {
      await migrate(db, {
        migrationsFolder: resolved.folder,
        ...(migrationsSchema ? { migrationsSchema } : {}),
      });
      console.log("DATABASE: Startup migrations applied.");
    } catch (err: any) {
      console.warn(`DATABASE: Migrations notice: ${err?.message || err}`);
    } finally {
      resolved.cleanup();
    }

    await seedDatabase().catch((e) => console.error("SEED WARNING:", e));
  }

  await assertSchemaReady();

  const listenCallback = () => {
    console.log(`SERVER: Running on http://${HOST}:${PORT}`);
    if (typeof process.send === "function") {
      process.send("ready");
    }
  };

  const server =
    HOST === "0.0.0.0" || HOST === "::"
      ? app.listen(Number(PORT), listenCallback)
      : app.listen(Number(PORT), HOST, listenCallback);

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`SERVER: Received ${signal}, closing gracefully...`);

    const forceExitTimer = setTimeout(() => {
      console.error("SERVER: Forced exit after 4500ms shutdown timeout.");
      process.exit(1);
    }, 4500);
    forceExitTimer.unref();

    server.close(async () => {
      try {
        await pool.end();
        if (redisClient.isReady) {
          await Promise.race([
            redisClient.quit(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Redis quit timeout")), 2000),
            ),
          ]).catch(() => {
            try {
              if (redisClient.isOpen) {
                redisClient.destroy?.();
              }
            } catch {
              // Ignore destroy errors
            }
          });
        } else if (redisClient.isOpen) {
          try {
            redisClient.destroy?.();
          } catch {
            // Ignore destroy errors
          }
        }
      } catch (err) {
        console.error("SERVER: Error during shutdown:", err);
      } finally {
        clearTimeout(forceExitTimer);
        process.exit(0);
      }
    });

    server.closeIdleConnections?.();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  logFatalError("bootstrapCatch", err);
  process.exit(1);
});
