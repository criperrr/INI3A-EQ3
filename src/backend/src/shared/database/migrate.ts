import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator"; // Ajuste o import se usar 'postgres-js'
import { pool, db } from "./database";
import  path  from 'path';

const migrateFolder = path.resolve(process.cwd(), 'src/shared/database/drizzle');

async function runMigrate() {
  try {
    await migrate(db, {
      migrationsFolder: migrateFolder,
    });

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