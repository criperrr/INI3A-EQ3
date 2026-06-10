import jwt from "jsonwebtoken";
import {
  JTIrefused,
} from "../../shared/errors/errors";
import {
  verifyJTI,
} from "../../shared/redis/server";

export async function authenticateSession(token: string) {
  const secret = process.env.JWT_SECRET;
  let payload: Jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret as string) as Jwt.JwtPayload;
  } catch (e) {
    throw new JTIrefused("JWT: invalid token signature");
  }

  const id = String(payload.jti);
  if (!verifyJTI(id))
    throw new JTIrefused(id, "JWT: your jwt id (JTI) was refused");
  return payload;
}

