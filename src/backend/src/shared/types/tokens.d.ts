import * as jwt from 'jsonwebtoken'

declare global{
  interface JwtInvalidateInfo {
  jti: string;
  ex: number;
}

interface RefreshInfo {
  id: string;
  refreshToken: string;
  ex: number;
}
namespace Jwt{
interface JwtPayload extends jwt.JwtPayload{
  id: number;
  name: string;
  email: string;
  roleId: number;
}
}

}
