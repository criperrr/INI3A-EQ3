import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "@/shared/util/jwt";
import { AuthRepository } from "@/shared/database/repositories/auth.repository";
import { UnauthorizedError, ForbiddenError } from "@/shared/errors/errors";

export async function requireAuth(
  req: Api.Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Você precisa estar autenticado para realizar esta ação.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Você precisa estar autenticado para realizar esta ação.");
    }

    const decoded = verifyAccessToken(token);

    if (!decoded.jti) {
      throw new UnauthorizedError("Token de acesso inválido.");
    }

    const isBlacklisted = await AuthRepository.isAccessTokenBlacklisted(
      decoded.jti,
    );

    if (isBlacklisted) {
      throw new UnauthorizedError("Sessão revogada. Faça login novamente.");
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
    next(new UnauthorizedError("Sessão expirada ou token inválido. Faça login novamente."));
  }
}

export async function optionalAuth(
  req: Api.Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      if (token) {
        const decoded = verifyAccessToken(token);

        if (decoded?.jti) {
          const isBlacklisted = await AuthRepository.isAccessTokenBlacklisted(
            decoded.jti,
          );

          if (!isBlacklisted) {
            req.user = {
              id: decoded.id,
              email: decoded.email,
              name: decoded.name,
              roleId: decoded.roleId,
              jti: decoded.jti,
              exp: decoded.exp!,
            };
          }
        }
      }
    }
  } catch {
    // Proceed without req.user if token is invalid, expired, or missing
  }
  next();
}

export async function requireAdmin(
  req: Api.Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user || req.user.roleId !== 5) {
      return next(
        new ForbiddenError("Acesso restrito para administradores."),
      );
    }
    next();
  });
}

export function requireMinAuthority(minAuthority: number) {
  return async (req: Api.Request, res: Response, next: NextFunction) => {
    return requireAuth(req, res, async (err) => {
      if (err) return next(err);
      if (!req.user) {
        return next(new UnauthorizedError());
      }
      // Role 5 is super-admin
      if (req.user.roleId === 5) return next();

      // Authority mapping: 1 -> 0, 2 -> 1, 3 -> 2, 4 -> 3, 5 -> 10
      const authorityMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 10 };
      const currentAuthority = authorityMap[req.user.roleId] ?? 0;

      if (currentAuthority < minAuthority) {
        return next(
          new ForbiddenError(`Permissão insuficiente. Nível de autoridade requerido: ${minAuthority}`),
        );
      }
      next();
    });
  };
}


