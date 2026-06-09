import { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      user: Jwt.JwtPayload;
    }
  }

  //namespace de handlers do express
  namespace Handlers {
    export type CreateUser = RequestHandler<{}, any, HandlerCreateUserDTO>;
    export type UpdateUser = RequestHandler<{}, any, HandlerUpdateUserDTO>;
    export type RechargeSession = RequestHandler<{}, any, RefreshToken.Handlers.RefreshInfo>;
  }

}
