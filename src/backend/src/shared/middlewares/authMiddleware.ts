import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "@/shared/util/jwt";
import { AuthRepository } from "@/shared/database/repositories/auth.repository";
import { UnauthorizedError } from "@/shared/errors/errors";

export async function requireAuth(
  req: Api.Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token não fornecido.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Token não fornecido.");
    }

    const decoded = verifyAccessToken(token);

    if (!decoded.jti) {
      throw new UnauthorizedError("Token inválido.");
    }

    const isBlacklisted = await AuthRepository.isAccessTokenBlacklisted(
      decoded.jti,
    );

    if (isBlacklisted) {
      throw new UnauthorizedError("Token revogado.");
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      roleId: decoded.roleId,
      jti: decoded.jti,
      exp: decoded.exp!,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError("Token inválido ou expirado."));
  }
}
