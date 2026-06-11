import jwt from "jsonwebtoken";
import { JTIrefused, Unauthorized } from "@/shared/errors/errors";
import { verifyJTI } from "@/shared/redis/server";

export async function authenticateSession(token: string) {
  const secret = process.env.JWT_SECRET;

  let payload: Jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret as string) as Jwt.JwtPayload;
  } catch {
    throw new Unauthorized("Invalid or expired token.", "INVALID_TOKEN");
  }

  const jti = String(payload.jti);
  const isValid = await verifyJTI(jti);
  if (!isValid) throw new JTIrefused(jti);

  return payload;
}
