import "../config/env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";
import {
  pool,
  createCliPool,
  dbSchema,
  effectiveSchema,
  migrationsSchema,
  findMigrationsFolder,
  resolveMigrationsFolder,
} from "./database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrate() {
  const cliPool = createCliPool();
  let cleanup = () => {};

  try {
    try {
      const extRes = await cliPool.query<{ extname: string }>(
        "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm');",
      );
      const installed = new Set(extRes.rows.map((r) => r.extname));
      if (!installed.has("postgis")) {
        await cliPool.query("CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;");
      }
      if (!installed.has("pg_trgm")) {
        await cliPool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;");
      }
    } catch (extErr: any) {
      console.warn(
        "DATABASE: Extension check notice (extensions already active or managed):",
        extErr?.message || extErr,
      );
    }

    if (dbSchema) {
      await cliPool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}";`);
    }

    const baseMigrateFolder = findMigrationsFolder([
      path.resolve(__dirname, "drizzle"),
      path.resolve(__dirname, "../shared/database/drizzle"),
      path.resolve(__dirname, "shared/database/drizzle"),
      path.resolve(process.cwd(), "dist/shared/database/drizzle"),
      path.resolve(process.cwd(), "src/shared/database/drizzle"),
      path.resolve(process.cwd(), "src/backend/src/shared/database/drizzle"),
    ]);

    const resolved = resolveMigrationsFolder(baseMigrateFolder);
    cleanup = resolved.cleanup;

    const cliDb = drizzle(cliPool, { schema });
    await migrate(cliDb, {
      migrationsFolder: resolved.folder,
      ...(migrationsSchema ? { migrationsSchema } : {}),
    });

    console.log(`DATABASE: migration was done (schema: ${effectiveSchema})`);
  } catch (e) {
    console.error("DATABASE: migration fail", e);
    process.exitCode = 1;
  } finally {
    cleanup();
    await Promise.allSettled([cliPool.end(), pool.end()]);
  }
}

runMigrate();
