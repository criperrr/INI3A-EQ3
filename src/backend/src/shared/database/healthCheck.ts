import "dotenv/config";
import { pool } from "./database";
import { connectRedis, redisClient } from "../redis/server";

async function runHealthCheck() {
  console.log("Checking Database and Redis health...\n");
  let pgSuccess = false;
  let redisSuccess = false;

  // 1. Check PostgreSQL
  try {
    const start = Date.now();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    const duration = Date.now() - start;
    console.log(`[OK] PostgreSQL: Connected successfully (${duration}ms)`);
    pgSuccess = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[FAIL] PostgreSQL: Connection failed -> ${msg}`);
  }

  // 2. Check Redis
  try {
    const start = Date.now();
    const isConnected = await connectRedis(2, 500);
    if (isConnected && redisClient.isOpen) {
      const pingResponse = await redisClient.ping();
      const duration = Date.now() - start;
      console.log(`[OK] Redis: Connected successfully (${pingResponse}, ${duration}ms)`);
      redisSuccess = true;
    } else {
      console.log(`[INFO] Redis: Server offline -> In-Memory Fallback active (OK for local dev)`);
      redisSuccess = true;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[FAIL] Redis: Connection failed -> ${msg}`);
  }

  // Clean shutdown
  try {
    await pool.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch {
    // Ignore cleanup errors
  }

  if (pgSuccess && redisSuccess) {
    console.log("\n[OK] All services are healthy and responsive!");
    process.exit(0);
  } else {
    console.error("\n[WARN] One or more services are unavailable.");
    process.exit(1);
  }
}

runHealthCheck();
