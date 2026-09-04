import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths to search for .env file across execution contexts
const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "src/backend/.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../../../.env"),
];

let loadedPath: string | null = null;
for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedPath = envPath;
    break;
  }
}

if (!loadedPath) {
  dotenv.config();
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/presco_db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6380",
  SERVER_PORT: Number(process.env.SERVER_PORT || 3333),
  SERVER_HOST: process.env.SERVER_HOST || "0.0.0.0",
  JWT_SECRET: process.env.JWT_SECRET || "4d281923e13a7357f829fe54fe4229e57aaf415989dc18f93f629bc8876e9f3f",
  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
};
