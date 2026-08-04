import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (e) => {
  console.error("REDIS: Connection error.", e);
});

async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("REDIS: Connected successfully.");
  } else {
    console.log("REDIS: Already connected.");
  }
}

export { redisClient, connectRedis };
