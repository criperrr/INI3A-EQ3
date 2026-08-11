import { UserRepository } from "@/shared/database/repositories/user.repository";
import { AuthRepository } from "@/shared/database/repositories/auth.repository";
import { hash, compare } from "bcrypt";
import {
  signAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from "@/shared/util/jwt";
import {
  UnauthorizedError,
  ConflictError,
} from "@/shared/errors/errors";
import type * as Services from "@/shared/types/services";
import type * as Repositories from "@/shared/types/repositories";

class AuthServiceClass {
  async register(data: Services.CreateUser) {

    const existing = await UserRepository.getUserByEmail(data.email);
    if (existing) {
      throw new ConflictError("Este e-mail já está cadastrado.");
    }

    const passHash = await hash(data.password, 10);

    const [result] = await UserRepository.createUser({
      name: data.name,
      email: data.email,
      passHash,
    });

    if (!result) {
      throw new Error("Falha ao criar o usuário.");
    }

    const accessToken = signAccessToken({
      id: result.id,
      email: result.email,
      name: result.name,
      roleId: result.roleId,
    });

    const refreshToken = generateRefreshToken();

    await AuthRepository.storeRefreshToken(
      result.id,
      refreshToken,
      REFRESH_TOKEN_EXPIRY_SECONDS,
    );

    return {
      user: result,
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await UserRepository.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedError("E-mail ou senha incorretos.");
    }

    const isPasswordValid = await compare(password, user.passHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError("E-mail ou senha incorretos.");
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    });

    const refreshToken = generateRefreshToken();

    await AuthRepository.storeRefreshToken(
      user.id,
      refreshToken,
      REFRESH_TOKEN_EXPIRY_SECONDS,
    );

    const { passHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(oldRefreshToken: string) {
    const userId = await AuthRepository.getUserIdByRefreshToken(oldRefreshToken);

    if (!userId) {
      throw new UnauthorizedError("Refresh token inválido ou expirado.");
    }

    const user = await UserRepository.getUserById(Number(userId));

    if (!user) {
      await AuthRepository.revokeRefreshToken(oldRefreshToken);
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    });

    const newRefreshToken = generateRefreshToken();

    await AuthRepository.rotateRefreshToken(
      oldRefreshToken,
      newRefreshToken,
      user.id,
      REFRESH_TOKEN_EXPIRY_SECONDS,
    );

    const { passHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }


  async logout(jti: string, jtiRemainingSeconds: number, refreshToken?: string) {
    await AuthRepository.blacklistAccessToken(jti, jtiRemainingSeconds);

    if (refreshToken) {
      await AuthRepository.revokeRefreshToken(refreshToken);
    }
  }

  async updateUser(id: number | string, user: Services.UpdateUser) {
    const { password, ...remainder } = user;

    if (Object.keys(remainder).length === 0 && password === undefined) {
      throw new Error("Nada para atualizar.");
    }

    const userQuery: Partial<Repositories.UpdateUser> = { ...remainder };

    if (password !== undefined) {
      userQuery.passHash = await hash(password, 10);
    }

    if (Object.keys(userQuery).length == 0) {
      throw new Error("Nada para atualizar.");
    }

    const result = await UserRepository.updateUser(
      id,
      userQuery as Repositories.UpdateUser,
    );

    if (!result[0]) {
      throw new Error("Falha ao atualizar o usuário.");
    }

    return result[0];
  }

  async deleteUser(id: number | string) {
    const rowCount = await UserRepository.deleteUser(id);

    if (rowCount == 0) {
      throw new Error("Usuário não encontrado.");
    }

    return rowCount;
  }

  async getUserById(id: number | string) {
    const result = await UserRepository.getUserById(id);
    if (!result) {
      throw new Error("Usuário não encontrado.");
    }
    return result;
  }
}

export const authService = new AuthServiceClass();
