import jwt from "jsonwebtoken";
import { hash, compare } from "../../shared/hash/bcrypt";
import crypto from "crypto";
import * as repository from "./auth.repository";
import {
  DatabaseInternalError,
  RedisInternalError,
  NotFound,
  ApiError,
  parseDatabaseError,
} from "../../shared/errors/errors";
import { dispatchJSON } from "../../shared/util/response.helper";

import {
  Unauthorized,
  BadRequest,
  JTIrefused,
} from "../../shared/errors/errors";
import {
  invalidateJWT,
  verifyJTI,
  setRefreshToken,
  getUserIdByRefreshToken,
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

export const register = async function register(
  bruteUser: HandlerCreateUserDTO,
) {
  const { email, name } = bruteUser;
  const user = {
    email,
    name,
    passHash: await hash(bruteUser.password),
  };

  let userReturned: Jwt.JwtPayload[]; //aqui ja funciona já
  try {
    userReturned = await repository.createUser(user);
  } catch (e) {
    parseDatabaseError(e, "DATABASE: conflict on user creation.");
  }

  if (!userReturned[0])
    throw new DatabaseInternalError("DATABASE: user was not created");

  const refreshToken = crypto.randomBytes(32).toString("hex");

  const jwtToken = jwt.sign(userReturned[0], process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await setRefreshToken({
      id: String(userReturned[0].id),
      refreshToken: refreshToken,
      ex: 30 * 24 * 3600,
    });
  } catch (e) {
    throw new RedisInternalError("REDIS: error on refresh_token definition");
  }

  return {
    userReturned: userReturned[0],
    refreshToken,
    jwt: jwtToken,
  };
};

export async function rechargeJWT(refreshToken: string) {
  let id: string | null;
  try {
    id = await getUserIdByRefreshToken(refreshToken);
    if (!id) throw new Unauthorized("API: invalid refresh_token");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new RedisInternalError(
      "REDIS: an error ocurred getting the refresh_token id",
    );
  }

  let userReturned: Jwt.JwtPayload[];
  try {
    userReturned = await repository.getUser(id);
  } catch (e) {
    parseDatabaseError(e, "DATABASE: conflict on getting user");
  }

  if (!userReturned[0]) throw new NotFound("DATABASE: user was not created");

  const refreshTokenRecharge = crypto.randomBytes(32).toString("hex");

  const jwtToken = jwt.sign(userReturned[0], process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await setRefreshToken({
      id: String(userReturned[0].id),
      refreshToken: refreshTokenRecharge,
      ex: 30 * 24 * 3600,
      oldRefreshToken: refreshToken
    });
  } catch (e) {
    throw new RedisInternalError("REDIS: error on refresh_token redefinition");
  }

  return {
    userReturned: userReturned[0],
    refreshToken: refreshTokenRecharge,
    jwt: jwtToken,
  };
}
