import { RequestHandler } from "express";
import {
  UpdateUserRequest,
  CreateUserRequest,
} from "@/shared/types/apiRequest";

declare global {
  namespace Express {
    interface Request {
      user: Jwt.JwtPayload;
    }
  }

  //namespace de handlers do express
  namespace Handlers {
    export type CreateUser = RequestHandler<{}, any, CreateUserRequest>;
    export type UpdateUser = RequestHandler<{}, any, AtLeastOne<UpdateUserRequest>>;
    export type RechargeSession = RequestHandler<
      {},
      any,
      RefreshToken.Handlers.RefreshInfo
    >;
  }
}
