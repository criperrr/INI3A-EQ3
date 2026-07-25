import type { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";
import { success } from "@/shared/helpers/response.helper";

class AuthControllerClass{
  
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body
      const user = await authService.createUser({ name, email, password });
      return res.json(success(user)).status(201);
    } catch (e) {
      next(e);
    }
  }

  async deleteAccount(req: Api.Request, res: Response, next: NextFunction) {
    const { id } = req.user;
  }
}

export const authController = new AuthControllerClass();