import { redisClient } from "../../redis/server";

class AuthRepositoryClass {
  async storeRefreshToken(
    userId: number | string,
    refreshToken: string,
    expirySeconds: number,
  ): Promise<void> {
    await redisClient.set(`refresh:${refreshToken}`, String(userId), {
      EX: expirySeconds,
    });
  }

  async getUserIdByRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    return redisClient.get(`refresh:${refreshToken}`);
  }


  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await redisClient.del(`refresh:${refreshToken}`);
  }

  // mata token veio e cria outro
  async rotateRefreshToken(
    oldToken: string,
    newToken: string,
    userId: number | string,
    expirySeconds: number,
  ): Promise<void> {
    const multi = redisClient.multi();
    multi.set(`refresh:${newToken}`, String(userId), { EX: expirySeconds });
    multi.del(`refresh:${oldToken}`);
    await multi.exec();
  }

  // bota um access token no blakc list pra nao deixar mais usar ele 
  async blacklistAccessToken(
    jti: string,
    expirySeconds: number,
  ): Promise<void> {
    if (expirySeconds <= 0) return;
    await redisClient.set(`blacklist:${jti}`, "1", { EX: expirySeconds });
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await redisClient.exists(`blacklist:${jti}`);
    return result === 1;
  }
}

export const AuthRepository = new AuthRepositoryClass();
