import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths to search for .env file across execution contexts (tsx, dist/server.mjs, dist/cli/*.mjs)
const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "src/backend/.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
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

export const DEV_JWT_SECRET_FALLBACK = "4d281923e13a7357f829fe54fe4229e57aaf415989dc18f93f629bc8876e9f3f";
const EXAMPLE_DEV_JWT_SECRET = "super_secret_jwt_presco_key_2026_dev_ini3a";

const nodeEnv = process.env.NODE_ENV || "development";
const prescoEnv = process.env.PRESCO_ENV || "";
const isProdOrStaging = nodeEnv === "production" || prescoEnv === "staging";
const rawJwtSecret = (process.env.JWT_SECRET || "").trim();

if (
  isProdOrStaging &&
  (!rawJwtSecret || rawJwtSecret === DEV_JWT_SECRET_FALLBACK || rawJwtSecret === EXAMPLE_DEV_JWT_SECRET)
) {
  throw new Error(
    "FATAL: JWT_SECRET is missing or set to an insecure development fallback in production/staging.",
  );
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/presco_db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6380",
  SERVER_PORT: Number(process.env.SERVER_PORT || 3333),
  SERVER_HOST: process.env.SERVER_HOST || (isProdOrStaging ? "127.0.0.1" : "0.0.0.0"),
  JWT_SECRET: rawJwtSecret || DEV_JWT_SECRET_FALLBACK,
  NODE_ENV: nodeEnv,
  PRESCO_ENV: prescoEnv,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  HERE_API_KEY: process.env.HERE_API_KEY || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM: process.env.RESEND_FROM || "Presco <onboarding@resend.dev>",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || process.env.RESEND_FROM || "Presco <noreply@presco.app>",
};
