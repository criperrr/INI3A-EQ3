import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator"; // Ajuste o import se usar 'postgres-js'
import { pool, db } from "./database";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrateFolder = path.resolve(__dirname, 'drizzle');

async function runMigrate() {
  try {
    try {
      await pool.query("CREATE EXTENSION IF NOT EXISTS postgis;");
      await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    } catch (extErr: any) {
      console.warn("DATABASE: Extension check notice (extensions already active or managed):", extErr?.message || extErr);
    }
    await migrate(db, {
      migrationsFolder: migrateFolder,
    });

    await pool.query(
      'ALTER TABLE "product" ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;',
    );
    await pool.query(
      'ALTER TABLE "product" ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL;',
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "product_submission" (
        "product_id" INTEGER NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("product_id", "user_id")
      );
    `);

    console.log('DATABASE: migration was done');
  }
  catch (e) {
    console.error('DATABASE: migration fail', e);
    process.exit(1);
  }
  finally {
    await pool.end();
  }
}

runMigrate();