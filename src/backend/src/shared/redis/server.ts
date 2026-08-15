import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({
  url: redisUrl,
  socket: {
    ...(redisUrl.startsWith("rediss://") ? { tls: true } : {}),
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        console.error("REDIS: Max reconnection attempts reached.");
        return new Error("Max reconnection attempts reached.");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (e) => {
  console.error("REDIS: Connection error (handled):", e instanceof Error ? e.message : e);
});

async function connectRedis(maxRetries = 5, delayMs = 1000): Promise<void> {
  if (redisClient.isOpen) {
    console.log("REDIS: Already connected.");
    return;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await redisClient.connect();
      console.log("REDIS: Connected successfully.");
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`REDIS: Connection attempt ${attempt}/${maxRetries} failed: ${msg}`);
      if (attempt === maxRetries) {
        throw new Error(`REDIS: Could not connect after ${maxRetries} attempts: ${msg}`);
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function invalidateJWT(target: Jwt.JwtInvalidateInfo): Promise<void> {
  const id = target.jti;
  const ex = target.ex;

  await redisClient.set(`blacklist:${id}`, "1", { EX: ex });
}

async function verifyJTI(jti: string): Promise<number> {
  return redisClient.exists(jti);
}

async function setRefreshToken(
  refreshInfo: RefreshToken.RefreshInfo | RefreshToken.RefreshRecharge,
) {
  const id = refreshInfo.id;
  const token = refreshInfo.refreshToken;
  const ex = refreshInfo.ex;

  if ("oldRefreshToken" in refreshInfo) {
    const oldRefreshToken = refreshInfo.oldRefreshToken;
    const multi = redisClient.multi();
    multi.set(`refresh:${token}`, id, { EX: ex });
    multi.del(`refresh:${oldRefreshToken}`);
    await multi.exec();
  } else await redisClient.set(`refresh:${token}`, id, { EX: ex });
}

async function getUserIdByRefreshToken(refreshToken: string) {
  return redisClient.get(`refresh:${refreshToken}`);
}

export {
  redisClient,
  connectRedis,
  invalidateJWT,
  verifyJTI,
  setRefreshToken,
  getUserIdByRefreshToken,
};
