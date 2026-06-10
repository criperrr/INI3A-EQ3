import * as jwt from "jsonwebtoken";

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

    namespace Handlers {
      interface RefreshInfo {
        refreshToken: string;
      }
    }
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
}
