import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

const JWT_SECRET = process.env.JWT_SECRET || env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not defined in .env");
}

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export function signAccessToken(payload: {
  id: number;
  email: string;
  name: string;
  roleId: number;
}): string {
  const jti = crypto.randomUUID();

  return jwt.sign(
    {
      sub: String(payload.id),
      id: payload.id,
      email: payload.email,
      name: payload.name,
      roleId: payload.roleId,
      jti,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function verifyAccessToken(token: string): Jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as Jwt.JwtPayload;
}

export function getTokenRemainingSeconds(decoded: jwt.JwtPayload): number {
  if (!decoded.exp) return 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(decoded.exp - now, 0);
}