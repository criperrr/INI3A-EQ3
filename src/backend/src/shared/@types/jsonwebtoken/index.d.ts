import * as jwt from "jsonwebtoken";
import type { Request } from "express";



declare global {
  namespace RefreshToken {
    interface RefreshInfo {
      id: string;
      refreshToken: string;
      ex: number;
    }

    type RefreshRecharge = RefreshInfo & {
      oldRefreshToken: string;
    };
  }

  namespace Jwt {
    interface JwtPayload extends jwt.JwtPayload {
      id: number;
      name: string;
      email: string;
      roleId: number;
    }

    interface JwtInvalidateInfo {
      jti: string;
      ex: number;
    }
  }

 namespace Api {
    export type Request<
        Body = any,
        Params = {},
        ResBody = any,
        Query = {},
        Locals extends Record<string, any> = {}
    > = Express.Request<
        Params,
        ResBody,
        Body,
        Query,
        Locals
    > & {
        user: number;
    }
}
}
