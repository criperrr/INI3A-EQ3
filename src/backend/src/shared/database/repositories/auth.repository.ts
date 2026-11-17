import { redisClient, inMemoryStore, redisKey, withRedisTimeout } from "../../redis/server";

class AuthRepositoryClass {
  async storeRefreshToken(
    userId: number | string,
    refreshToken: string,
    expirySeconds: number,
  ): Promise<void> {
    const key = redisKey(`refresh:${refreshToken}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(
          redisClient.set(key, String(userId), {
            EX: expirySeconds,
          }),
        );
        return;
      } catch (err) {
        console.warn("REDIS: Failed to store refresh token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(key, String(userId), expirySeconds, "auth");
  }

  async getUserIdByRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    const key = redisKey(`refresh:${refreshToken}`);
    if (redisClient.isReady) {
      try {
        return await withRedisTimeout(redisClient.get(key));
      } catch (err) {
        console.warn("REDIS: Failed to get refresh token from Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.get(key, "auth");
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const key = redisKey(`refresh:${refreshToken}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(redisClient.del(key));
        return;
      } catch (err) {
        console.warn("REDIS: Failed to delete refresh token from Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.del(key, "auth");
  }

  async rotateRefreshToken(
    oldToken: string,
    newToken: string,
    userId: number | string,
    expirySeconds: number,
  ): Promise<void> {
    const newKey = redisKey(`refresh:${newToken}`);
    const oldKey = redisKey(`refresh:${oldToken}`);
    if (redisClient.isReady) {
      try {
        const multi = redisClient.multi();
        multi.set(newKey, String(userId), { EX: expirySeconds });
        multi.del(oldKey);
        await withRedisTimeout(multi.exec());
        return;
      } catch (err) {
        console.warn("REDIS: Failed to rotate refresh token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.del(oldKey, "auth");
    inMemoryStore.set(newKey, String(userId), expirySeconds, "auth");
  }

  async blacklistAccessToken(
    jti: string,
    expirySeconds: number,
  ): Promise<void> {
    if (expirySeconds <= 0) return;
    const key = redisKey(`blacklist:${jti}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(redisClient.set(key, "1", { EX: expirySeconds }));
        return;
      } catch (err) {
        console.warn("REDIS: Failed to blacklist token in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(key, "1", expirySeconds, "auth");
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const key = redisKey(`blacklist:${jti}`);
    if (redisClient.isReady) {
      try {
        const result = await withRedisTimeout(redisClient.exists(key));
        return result === 1;
      } catch (err) {
        console.warn("REDIS: Failed to check blacklist in Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.exists(key, "auth") === 1;
  }

  async storeTwoFactorCode(
    userId: number | string,
    code: string,
    expirySeconds = 600,
  ): Promise<void> {
    const key = redisKey(`2fa:code:${userId}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(redisClient.set(key, code, { EX: expirySeconds }));
        return;
      } catch (err) {
        console.warn("REDIS: Failed to store 2FA code in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(key, code, expirySeconds, "auth");
  }

  async getTwoFactorCode(userId: number | string): Promise<string | null> {
    const key = redisKey(`2fa:code:${userId}`);
    if (redisClient.isReady) {
      try {
        return await withRedisTimeout(redisClient.get(key));
      } catch (err) {
        console.warn("REDIS: Failed to get 2FA code from Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.get(key, "auth");
  }

  async deleteTwoFactorCode(userId: number | string): Promise<void> {
    const key = redisKey(`2fa:code:${userId}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(redisClient.del(key));
        return;
      } catch (err) {
        console.warn("REDIS: Failed to delete 2FA code from Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.del(key, "auth");
  }

  async setTwoFactorCooldown(
    userId: number | string,
    expirySeconds = 60,
  ): Promise<void> {
    const key = redisKey(`2fa:cooldown:${userId}`);
    if (redisClient.isReady) {
      try {
        await withRedisTimeout(redisClient.set(key, "1", { EX: expirySeconds }));
        return;
      } catch (err) {
        console.warn("REDIS: Failed to set 2FA cooldown in Redis, falling back to memory store:", err);
      }
    }
    inMemoryStore.set(key, "1", expirySeconds, "auth");
  }

  async isTwoFactorCooldown(userId: number | string): Promise<boolean> {
    const key = redisKey(`2fa:cooldown:${userId}`);
    if (redisClient.isReady) {
      try {
        const result = await withRedisTimeout(redisClient.exists(key));
        return result === 1;
      } catch (err) {
        console.warn("REDIS: Failed to check 2FA cooldown in Redis, falling back to memory store:", err);
      }
    }
    return inMemoryStore.exists(key, "auth") === 1;
  }
}

export const AuthRepository = new AuthRepositoryClass();
