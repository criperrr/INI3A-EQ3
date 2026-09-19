import { UserRepository } from "@/shared/database/repositories/user.repository";
import { AuthRepository } from "@/shared/database/repositories/auth.repository";
import { OcurrencyRepository } from "@/shared/database/repositories/ocurrency.repository";
import { CustomizationRepository } from "@/shared/database/repositories/customization.repository";
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
      roleId: 1,
      points: 0,
      equippedBannerId: 1,
      equippedAvatarFrameId: 10,
      equippedLevelFrameId: 20,
      equippedTitleId: 30,
    });

    if (!result) {
      throw new Error("Falha ao criar o usuário.");
    }

    // Award default starter milestone badge #1 (Pioneiro)
    await UserRepository.awardBadge(result.id, 1).catch(() => {});

    // Grant default starting customization items in user inventory (Presco Selva, Clássico, Distintivo Âmbar, Iniciante)
    for (const itemId of [1, 10, 20, 30]) {
      await CustomizationRepository.addCustomizationToUser(result.id, itemId).catch(() => {});
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

  async changePassword(
    userId: number | string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await UserRepository.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const isPasswordValid = await compare(currentPassword, user.passHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Senha atual incorreta.");
    }

    const passHash = await hash(newPassword, 10);
    await UserRepository.updateUser(userId, { passHash });

    return { message: "Senha atualizada com sucesso." };
  }

  async getUserById(id: number | string) {
    const result = await UserRepository.getUserById(id);
    if (!result) {
      throw new Error("Usuário não encontrado.");
    }
    return result;
  }

  async getProfile(userId: number | string) {
    const user = await UserRepository.getUserWithRole(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const points = user.points || 0;
    const isSuperAdmin = user.roleId === 5 || (user.authority !== null && user.authority >= 10);

    let level = 1;
    let currentXp = points;
    let maxXp = 100;
    let levelTitle = "Iniciante";

    if (isSuperAdmin) {
      level = 99;
      currentXp = points;
      maxXp = 10000;
      levelTitle = "Administrador Master";
    } else if (points >= 1000) {
      level = 5 + Math.floor((points - 1000) / 500);
      currentXp = (points - 1000) % 500;
      maxXp = 500;
      levelTitle = "Guardião de Preços";
    } else if (points >= 500) {
      level = 4;
      currentXp = points - 500;
      maxXp = 500;
      levelTitle = "Curador Sênior";
    } else if (points >= 250) {
      level = 3;
      currentXp = points - 250;
      maxXp = 250;
      levelTitle = "Verificador Ativo";
    } else if (points >= 100) {
      level = 2;
      currentXp = points - 100;
      maxXp = 150;
      levelTitle = "Contribuidor";
    }

    const userBadges = await UserRepository.getUserBadges(userId);
    const allBadges = await UserRepository.getAllBadges();
    const rankPosition = await UserRepository.getUserRank(userId);
    const totalOccurrences = await OcurrencyRepository.countByUser(Number(userId));
    const contributionGrid = await OcurrencyRepository.getUserContributionGrid(Number(userId));
    const recentContributions = await OcurrencyRepository.findByUser(Number(userId), 5);

    const badgesWithStatus = allBadges.map((b) => {
      const awarded = userBadges.find((ub) => ub.id === b.id);
      return {
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description || null,
        minPoints: b.minPoints,
        isUnlocked: !!awarded || isSuperAdmin || points >= b.minPoints,
        awardedAt: awarded?.awardedAt || null,
      };
    });

    const equippedCustomizations = await CustomizationRepository.getUserEquippedCustomizations(Number(userId));
    const activeLevelTitle = equippedCustomizations?.title?.name || levelTitle;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName || "default",
      authority: user.authority ?? 0,
      isAdmin: isSuperAdmin,
      points,
      level,
      currentXp,
      maxXp,
      levelTitle: activeLevelTitle,
      equippedCustomizations,
      stats: {
        rank: rankPosition,
        reportedPrices: totalOccurrences,
        points: points,
        badgesCount: badgesWithStatus.filter((b) => b.isUnlocked).length,
      },
      badges: badgesWithStatus,
      contributionsGrid: contributionGrid,
      recentContributions,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthServiceClass();

