import * as Services from "@/shared/types/services";
import jwt from "jsonwebtoken"
const secret = process.env.JWT_SECRET;
const jwt_expires_in = "1h";

if (!secret) {
  throw new Error("NO SECRET PROVIDED IN .env")
}

export function generateJwt(id: number, user: Services.CreateUser) {
  const payload = {
    sub: "" + id,
    email: user.email,
    name: user.name,
  }

  return jwt.sign(payload, secret as jwt.Secret, {expiresIn: jwt_expires_in});
}
