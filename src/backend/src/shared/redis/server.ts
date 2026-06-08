import { createClient } from 'redis';
import { LibSQLSession } from 'drizzle-orm/libsql';
import  type { Jwt } from 'jsonwebtoken';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (e) => {
  console.log('REDIS: Error on redis connection.', e);
  process.exit(1);
})


async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("REDIS: Succesful connected.");
  }
  else console.log("REDIS: Already connected.");
}

async function invalidateJWT(target: JwtInvalidateInfo): Promise<void> {
  const id = target.jti;
  const ex = target.ex;

  await redisClient.set(`blacklist:${id}`, '1', { EX: ex });
}

async function verifyJTI(jti: string): Promise<number> {
  return redisClient.exists(jti);
};

async function setRefreshToken(refreshInfo: RefreshInfo) {
  const id = refreshInfo.id;
  const token = refreshInfo.refreshToken;
  const ex = refreshInfo.ex;

  await redisClient.set(`refresh:${token}`, id, { EX: ex });
} 

export { redisClient, connectRedis, invalidateJWT, verifyJTI, setRefreshToken };


