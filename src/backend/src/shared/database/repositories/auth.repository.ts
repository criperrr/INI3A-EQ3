import { JTIrefused } from "../../errors/errors";
import { redisClient } from "../../redis/server";
class AuthenticationRespositoryClass {
  // coloca o token numa blacklist em tempo de execucao
  async invalidateJWT(target: Jwt.JwtInvalidateInfo): Promise<void> {
    const id = target.jti;
    const ex = target.ex;

    await redisClient.set(`blacklist:${id}`, "1", { EX: ex });
  }

  // retorna se o jti existe e lança exceção se não
  async verifyJTI(jti: string): Promise<number> {
    const result = await redisClient.exists(jti);
    if (!result) throw new JTIrefused(jti);
    return redisClient.exists(jti);
  }

  async setRefreshToken(
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

  async destroyRefreshToken(refreshToken: string) {}

  async getUserIdByRefreshToken(refreshToken: string) {
    return redisClient.get(`refresh:${refreshToken}`);
  }
}

export const AuthRepository = new AuthenticationRespositoryClass();
