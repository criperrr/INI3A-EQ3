import { createClient } from "redis";
import { LibSQLSession } from "drizzle-orm/libsql";
import type { Jwt } from "jsonwebtoken";
import { JTIrefused } from "../errors/errors";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    tls: true,
  },
});

redisClient.on("error", (e) => {
  console.log("REDIS: Error on redis connection.", e);
  process.exit(1);
});

async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("REDIS: Succesful connected.");
  } else console.log("REDIS: Already connected.");
}


export {
  redisClient,
  connectRedis
};
