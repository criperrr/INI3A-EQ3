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

  async trackAndCheckProductViewQuota(
    userId: number,
    productId: number,
    limit = 10,
  ): Promise<{ allowed: boolean; count: number; limit: number }> {
    const key = redisKey(`2fa:quota:products:${userId}`);
    const ttlSeconds = 2592000;

    if (redisClient.isReady) {
      try {
        const member = String(productId);
        const [isMember, count] = await withRedisTimeout(
          Promise.all([
            redisClient.sIsMember(key, member),
            redisClient.sCard(key),
          ]),
        );

        if (isMember) {
          return { allowed: true, count, limit };
        }

        if (count < limit) {
          await withRedisTimeout(redisClient.sAdd(key, member));
          await withRedisTimeout(redisClient.expire(key, ttlSeconds));
          return { allowed: true, count: count + 1, limit };
        }

        return { allowed: false, count, limit };
      } catch (err) {
        console.warn("REDIS: Failed to track product view quota in Redis, falling back to memory store:", err);
      }
    }

    const raw = inMemoryStore.get(key, "auth");
    let existing: number[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }

    const set = new Set<number>(existing);
    const count = set.size;

    if (set.has(productId)) {
      return { allowed: true, count, limit };
    }

    if (count < limit) {
      set.add(productId);
      inMemoryStore.set(key, JSON.stringify([...set]), ttlSeconds, "auth");
      return { allowed: true, count: count + 1, limit };
    }

    return { allowed: false, count, limit };
  }

  async trackAndCheckPriceViewsQuota(
    userId: number,
    priceIds: number[],
    limit = 20,
  ): Promise<{
    allowedIds: number[];
    quotaExceeded: boolean;
    count: number;
    limit: number;
  }> {
    const key = redisKey(`2fa:quota:prices:${userId}`);
    const ttlSeconds = 2592000;

    if (redisClient.isReady) {
      try {
        const members = await withRedisTimeout(redisClient.sMembers(key));
        const set = new Set<number>(members.map((m) => Number(m)));
        const allowedIds: number[] = [];
        const toAdd: string[] = [];
        let quotaExceeded = false;

        for (const priceId of priceIds) {
          if (set.has(priceId)) {
            allowedIds.push(priceId);
          } else if (set.size < limit) {
            set.add(priceId);
            toAdd.push(String(priceId));
            allowedIds.push(priceId);
          } else {
            quotaExceeded = true;
          }
        }

        if (toAdd.length > 0) {
          await withRedisTimeout(redisClient.sAdd(key, toAdd));
          await withRedisTimeout(redisClient.expire(key, ttlSeconds));
        }

        return { allowedIds, quotaExceeded, count: set.size, limit };
      } catch (err) {
        console.warn("REDIS: Failed to track price views quota in Redis, falling back to memory store:", err);
      }
    }

    const raw = inMemoryStore.get(key, "auth");
    let existing: number[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }

    const set = new Set<number>(existing);
    const allowedIds: number[] = [];
    let quotaExceeded = false;
    let modified = false;

    for (const priceId of priceIds) {
      if (set.has(priceId)) {
        allowedIds.push(priceId);
      } else if (set.size < limit) {
        set.add(priceId);
        modified = true;
        allowedIds.push(priceId);
      } else {
        quotaExceeded = true;
      }
    }

    if (modified) {
      inMemoryStore.set(key, JSON.stringify([...set]), ttlSeconds, "auth");
    }

    return { allowedIds, quotaExceeded, count: set.size, limit };
  }
}

export const AuthRepository = new AuthRepositoryClass();
