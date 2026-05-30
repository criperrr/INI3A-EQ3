import { drizzle } from "drizzle-orm/postgres-js";

export default drizzle(process.env.DATABASE_URL)
