import jwt from "jsonwebtoken";
import { hash } from "@/shared/util/bcrypt";
import crypto from "crypto";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import {
  DatabaseInternalError,
  RedisInternalError,
  parseDatabaseError,
  Unauthorized,
  ApiError,
  NotFound,
} from "@/shared/errors/errors";

import type { CreateUserRequest } from "../../shared/types/apiResponse";
import { AuthRepository } from "@/shared/database/repositories/auth.repository";
import * as schema from "@/shared/database/schema";

const User = schema.user;

export const register = async function register(user: CreateUserRequest) {
  const { email, name } = user;

  let userReturned = await UserRepository.createUser(
    { ...user, passHash: await hash(user.password) },
    { id: User.id },
  );

  if (!userReturned) throw new DatabaseInternalError("user was not created");

  const refreshToken = crypto.randomBytes(32).toString("hex");

  const jwtToken = jwt.sign(userReturned, process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await AuthRepository.setRefreshToken({
      id: String(userReturned.id),
      refreshToken: refreshToken,
      ex: 30 * 24 * 3600,
    });
  } catch (e) {
    throw new RedisInternalError("error on refresh_token definition");
  }

  return {
    userReturned: userReturned,
    refreshToken,
    jwt: jwtToken,
  };
};

export async function rechargeJWT(refreshToken: string) {
  let id: string | null;
  let user;
  try {
    id = await AuthRepository.getUserIdByRefreshToken(refreshToken);
    if (!id) throw new Unauthorized("invalid refresh_token");
    user = await UserRepository.getUser(id);
    if (!user) throw new Unauthorized("no user found");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new RedisInternalError(
      "REDIS: an error ocurred getting the refresh_token id",
    );
  }

  let {
    passHash,
    birthdate,
    points,
    dangerFlag,
    location,
    roleId,
    ...userReturned
  } = user;

  const refreshTokenRecharge = crypto.randomBytes(32).toString("hex");

  const jwtToken = jwt.sign(userReturned, process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await AuthRepository.setRefreshToken({
      id: String(userReturned.id),
      refreshToken: refreshTokenRecharge,
      ex: 30 * 24 * 3600,
      oldRefreshToken: refreshToken,
    });
  } catch (e) {
    throw new RedisInternalError("Error while refreshing token");
  }

  return {
    userReturned: userReturned,
    refreshToken: refreshTokenRecharge,
    jwt: jwtToken,
  };
}
