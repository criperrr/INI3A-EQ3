import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({
  url: redisUrl,
  ...(redisUrl.startsWith("rediss://") ? { socket: { tls: true } } : {}),
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

async function invalidateJWT(target: Jwt.JwtInvalidateInfo): Promise<void> {
  const id = target.jti;
  const ex = target.ex;

  await redisClient.set(`blacklist:${id}`, "1", { EX: ex });
}

async function verifyJTI(jti: string): Promise<number> {
  return redisClient.exists(`blacklist:${jti}`);
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
