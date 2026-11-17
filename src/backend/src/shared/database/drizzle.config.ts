import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL)
  throw new Error("INTERNAL: DATABASE_URL not defined.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/database/schema.ts",
  out: "./src/shared/database/drizzle",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
