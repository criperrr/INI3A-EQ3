import type { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";
import { getTokenRemainingSeconds } from "@/shared/util/jwt";

class AuthControllerClass {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.push({ field: "name", message: "O nome deve ter no mínimo 2 caracteres." });
      }
      if (!email || typeof email !== "string" || !email.includes("@")) {
        errors.push({ field: "email", message: "E-mail inválido." });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        errors.push({ field: "password", message: "A senha deve ter no mínimo 6 caracteres." });
      }

      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      const result = await authService.register({ name: name.trim(), email: email.trim(), password });
      return res.status(201).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!email || typeof email !== "string" || !email.includes("@")) {
        errors.push({ field: "email", message: "E-mail inválido." });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        errors.push({ field: "password", message: "A senha deve ter no mínimo 6 caracteres." });
      }

      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      const result = await authService.login(email.trim(), password);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== "string") {
        throw new ValidationError([
          { field: "refreshToken", message: "Refresh token é obrigatório." },
        ]);
      }

      const result = await authService.refreshTokens(refreshToken);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async logout(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { jti, exp } = req.user;
      const remainingSeconds = getTokenRemainingSeconds({ exp });
      const { refreshToken } = req.body as { refreshToken?: string };

      await authService.logout(jti, remainingSeconds, refreshToken);

      return res.status(200).json(success({ message: "Logout realizado com sucesso." }));
    } catch (e) {
      next(e);
    }
  }

  async changePassword(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.user;
      const { currentPassword, newPassword } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!currentPassword || typeof currentPassword !== "string") {
        errors.push({
          field: "currentPassword",
          message: "Senha atual é obrigatória.",
        });
      }
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        errors.push({
          field: "newPassword",
          message: "A nova senha deve ter no mínimo 6 caracteres.",
        });
      }

      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      const result = await authService.changePassword(
        id,
        currentPassword,
        newPassword,
      );
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async deleteAccount(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.user;
      await authService.deleteUser(id);
      return res.status(200).json(success({ message: "Conta excluída com sucesso." }));
    } catch (e) {
      next(e);
    }
  }

  async getMe(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.user;
      const profile = await authService.getProfile(id);
      return res.status(200).json(success(profile));
    } catch (e) {
      next(e);
    }
  }
}

export const authController = new AuthControllerClass();