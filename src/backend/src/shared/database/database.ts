import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../config/env";

const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

if (!databaseUrl)
  throw new Error("INTERNAL: DATABASE_URL NOT DEFINED");

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("DATABASE: Unexpected error on idle PostgreSQL client (handled):", err.message);
});

export const db = drizzle(pool, { schema });

export async function testDatabaseConnection(maxRetries = 5, delayMs = 1500): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("DATABASE: PostgreSQL connected successfully.");
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`DATABASE: Connection attempt ${attempt}/${maxRetries} failed: ${msg}`);
      if (attempt === maxRetries) {
        throw new Error(`DATABASE: Could not connect after ${maxRetries} attempts: ${msg}`);
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  return false;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
