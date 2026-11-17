import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../config/env";

const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

if (!databaseUrl)
  throw new Error("INTERNAL: DATABASE_URL NOT DEFINED");

const rawDbSchema = (process.env.DB_SCHEMA || "").trim();
if (rawDbSchema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawDbSchema)) {
  throw new Error("INTERNAL: INVALID DB_SCHEMA");
}

export const dbSchema = rawDbSchema && rawDbSchema !== "public" ? rawDbSchema : undefined;
export const effectiveSchema = dbSchema || "public";
export const migrationsSchema = dbSchema ? `drizzle_${dbSchema}` : undefined;

const EXPECTED_APP_TABLES = [
  "role",
  "user",
  "market",
  "product",
  "ocurrency",
  "cart",
  "cart_product",
  "product_submission",
  "customization_item",
];

export function findMigrationsFolder(candidates: string[]): string {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "meta", "_journal.json"))) {
      return candidate;
    }
  }
  throw new Error(
    `DATABASE: Could not locate drizzle/meta/_journal.json in any candidate path: ${candidates.join(", ")}`,
  );
}

export function resolveMigrationsFolder(baseFolder: string): {
  folder: string;
  cleanup: () => void;
} {
  if (!dbSchema) {
    return { folder: baseFolder, cleanup: () => {} };
  }

  const tmpRoot = path.join(os.homedir(), ".presco-tmp");
  fs.mkdirSync(tmpRoot, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(tmpRoot, 0o700);
  } catch {
    // Best-effort permission hardening
  }

  const targetDir = fs.mkdtempSync(path.join(tmpRoot, `migrations-${dbSchema}-`));
  fs.cpSync(baseFolder, targetDir, { recursive: true });
  for (const entry of fs.readdirSync(targetDir)) {
    if (!entry.endsWith(".sql")) continue;
    const filePath = path.join(targetDir, entry);
    const sqlText = fs.readFileSync(filePath, "utf8");
    // Rewrite ONLY quoted "public". schema identifiers; leave unquoted public.ST_* and public.geography intact
    fs.writeFileSync(filePath, sqlText.replaceAll('"public".', `"${dbSchema}".`), "utf8");
  }

  return {
    folder: targetDir,
    cleanup: () => {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failures
      }
    },
  };
}

const runtimePoolMax =
  Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === "production" ? 8 : 4);

const poolOptions = `-c search_path=${effectiveSchema} -c idle_in_transaction_session_timeout=30000`;

export const pool = new Pool({
  connectionString: databaseUrl,
  options: poolOptions,
  max: runtimePoolMax,
  min: 0,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
  lock_timeout: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("DATABASE: Unexpected error on idle PostgreSQL client (handled):", err.message);
});

export function createCliPool(): Pool {
  const cliPool = new Pool({
    connectionString: databaseUrl,
    options: poolOptions,
    max: 2,
    min: 0,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 120000,
    lock_timeout: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  cliPool.on("error", (err) => {
    console.error("DATABASE: Unexpected error on idle CLI PostgreSQL client (handled):", err.message);
  });

  return cliPool;
}

export const db = drizzle(pool, { schema });

async function withTimeoutProbe<T>(
  targetPool: Pool,
  fn: (client: import("pg").PoolClient) => Promise<T>,
  timeoutMs = 3000,
): Promise<T> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connectPromise = targetPool.connect().then((client) => {
    if (timedOut) {
      client.release(true);
      throw new Error("Database probe timed out before connect completed");
    }
    return client;
  });

  const client = await Promise.race([
    connectPromise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Database probe connect timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
    }),
  ]);

  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }

  let probeErr: Error | undefined;
  try {
    return await Promise.race([
      fn(client),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Database probe query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } catch (err) {
    probeErr = err instanceof Error ? err : new Error(String(err));
    throw probeErr;
  } finally {
    if (timer) clearTimeout(timer);
    client.release(probeErr || timedOut);
  }
}

export async function assertSchemaReady(targetPool: Pool = pool): Promise<void> {
  await withTimeoutProbe(
    targetPool,
    async (client) => {
      const schemaRes = await client.query<{ current_schema: string | null }>(
        "SELECT current_schema() AS current_schema",
      );
      const current = schemaRes.rows[0]?.current_schema ?? null;
      if (current !== effectiveSchema) {
        throw new Error(
          `DATABASE: Expected current_schema()="${effectiveSchema}", got "${String(current)}".`,
        );
      }

      const tablesRes = await client.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()",
      );
      const present = new Set(tablesRes.rows.map((r) => r.tablename));
      const missing = EXPECTED_APP_TABLES.filter((t) => !present.has(t));
      if (missing.length > 0) {
        throw new Error(
          `DATABASE: Schema "${effectiveSchema}" missing required tables: ${missing.join(", ")}. Run migrations first.`,
        );
      }
    },
    3000,
  );
}

export async function testDatabaseConnection(maxRetries = 5, delayMs = 1500): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await withTimeoutProbe(
        pool,
        async (client) => {
          await client.query("SELECT 1");
        },
        3000,
      );
      console.log(`DATABASE: PostgreSQL connected successfully (schema: ${effectiveSchema}).`);
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
    await withTimeoutProbe(
      pool,
      async (client) => {
        await client.query("SELECT 1");
      },
      3000,
    );
    return true;
  } catch {
    return false;
  }
}
