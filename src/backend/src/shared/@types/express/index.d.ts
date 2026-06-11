import { RequestHandler } from "express";
import {
  UpdateUserRequest,
  CreateUserRequest,
} from "@/shared/types/apiRequest";
import type { CreateMarketDTO } from "@/shared/types/database";

declare global {
  namespace Express {
    interface Request {
      user: Jwt.JwtPayload;
    }
  }

  //namespace de handlers do express
  namespace Handlers {
    //USER-AUTH
    export type CreateUser = RequestHandler<{}, any, CreateUserRequest>;
    export type UpdateUser = RequestHandler<
      {},
      any,
      AtLeastOne<UpdateUserRequest>
    >;
    export type RechargeSession = RequestHandler<
      {},
      any,
      RefreshToken.Handlers.RefreshInfo
      >;
    
    //MARKET
    export type CreateMarket = RequestHandler<{}, any, CreateMarketDTO>
    export type UpdateMarketDTO = RequestHandler<{}, any, UpdateMarketDTO>
  }
}
