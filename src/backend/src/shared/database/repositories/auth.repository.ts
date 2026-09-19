import { redisClient, inMemoryStore } from "../../redis/server";

class AuthRepositoryClass {
  async storeRefreshToken(
    userId: number | string,
    refreshToken: string,
    expirySeconds: number,
  ): Promise<void> {
    if (redisClient.isOpen) {
      try {
        await redisClient.set(`refresh:${refreshToken}`, String(userId), {
          EX: expirySeconds,
        });
        return;
      } catch (err) {
        console.warn("REDIS: Failed to store refresh token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(`refresh:${refreshToken}`, String(userId), expirySeconds);
  }

  async getUserIdByRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    if (redisClient.isOpen) {
      try {
        return await redisClient.get(`refresh:${refreshToken}`);
      } catch (err) {
        console.warn("REDIS: Failed to get refresh token from Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.get(`refresh:${refreshToken}`);
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    if (redisClient.isOpen) {
      try {
        await redisClient.del(`refresh:${refreshToken}`);
        return;
      } catch (err) {
        console.warn("REDIS: Failed to delete refresh token from Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.del(`refresh:${refreshToken}`);
  }

  async rotateRefreshToken(
    oldToken: string,
    newToken: string,
    userId: number | string,
    expirySeconds: number,
  ): Promise<void> {
    if (redisClient.isOpen) {
      try {
        const multi = redisClient.multi();
        multi.set(`refresh:${newToken}`, String(userId), { EX: expirySeconds });
        multi.del(`refresh:${oldToken}`);
        await multi.exec();
        return;
      } catch (err) {
        console.warn("REDIS: Failed to rotate refresh token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.del(`refresh:${oldToken}`);
    inMemoryStore.set(`refresh:${newToken}`, String(userId), expirySeconds);
  }

  async blacklistAccessToken(
    jti: string,
    expirySeconds: number,
  ): Promise<void> {
    if (expirySeconds <= 0) return;
    if (redisClient.isOpen) {
      try {
        await redisClient.set(`blacklist:${jti}`, "1", { EX: expirySeconds });
        return;
      } catch (err) {
        console.warn("REDIS: Failed to blacklist token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(`blacklist:${jti}`, "1", expirySeconds);
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    if (redisClient.isOpen) {
      try {
        const result = await redisClient.exists(`blacklist:${jti}`);
        return result === 1;
      } catch (err) {
        console.warn("REDIS: Failed to check blacklist in Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.exists(`blacklist:${jti}`) === 1;
  }
}

export const AuthRepository = new AuthRepositoryClass();
