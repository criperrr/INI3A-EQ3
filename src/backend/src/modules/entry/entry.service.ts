import jwt from "jsonwebtoken";
import { hash, compare } from "@/shared/util/bcrypt";
import crypto from "crypto";
import * as repository from "./entry.repository";
import {
  DatabaseInternalError,
  RedisInternalError,
  parseDatabaseError,
  Unauthorized,
  ApiError,
  NotFound,
} from "@/shared/errors/errors";

import {
  setRefreshToken,
  getUserIdByRefreshToken,
} from "@/shared/redis/server";
import type { CreateUserRequest } from "../../shared/types/apiResponse";

export const register = async function register(bruteUser: CreateUserRequest) {
  const { email, name } = bruteUser;
  const user = {
    email,
    name,
    passHash: await hash(bruteUser.password),
  };

  let userReturned: Jwt.JwtPayload[];

  try {
    userReturned = await repository.createUser(user);
  } catch (e) {
    parseDatabaseError(e, "Database conflict or error when creating user");
  }

  if (!userReturned[0])
    throw new DatabaseInternalError("user was not created");

  const refreshToken = crypto.randomBytes(32).toString("hex");
  const jti = crypto.randomUUID();

  // Strip passHash so it is never included in the JWT payload
  const { passHash: _, ...publicUser } = userReturned[0] as any;

  const jwtToken = jwt.sign({ ...publicUser, jti }, process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await setRefreshToken({
      id: String(userReturned[0].id),
      refreshToken: refreshToken,
      ex: 30 * 24 * 3600,
    });
  } catch (e) {
    throw new RedisInternalError("error on refresh_token definition");
  }

  return {
    userReturned: publicUser,
    refreshToken,
    jwt: jwtToken,
  };
};

export async function login(email: string, password: string) {
  let users: any[];
  try {
    users = await repository.getUserByEmail(email);
  } catch (e) {
    parseDatabaseError(e, "Database error when getting user by email");
  }

  if (!users[0])
    throw new Unauthorized("Invalid credentials.", "INVALID_CREDENTIALS");

  const user = users[0];
  const passwordMatch = await compare(password, user.passHash);

  if (!passwordMatch)
    throw new Unauthorized("Invalid credentials.", "INVALID_CREDENTIALS");

  const refreshToken = crypto.randomBytes(32).toString("hex");
  const jti = crypto.randomUUID();

  // Remove passHash from JWT payload
  const { passHash, ...publicUser } = user;
  const jwtToken = jwt.sign({ ...publicUser, jti }, process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await setRefreshToken({
      id: String(user.id),
      refreshToken,
      ex: 30 * 24 * 3600,
    });
  } catch (e) {
    throw new RedisInternalError("error on refresh_token definition");
  }

  return {
    userReturned: publicUser,
    refreshToken,
    jwt: jwtToken,
  };
}

export async function rechargeJWT(refreshToken: string) {
  let id: string | null;
  try {
    id = await getUserIdByRefreshToken(refreshToken);
    if (!id) throw new Unauthorized("invalid refresh_token");
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
    parseDatabaseError(e, "conflict on getting user");
  }

  if (!userReturned![0]) throw new NotFound("user was not found");

  const refreshTokenRecharge = crypto.randomBytes(32).toString("hex");
  const jti = crypto.randomUUID();

  const jwtToken = jwt.sign({ ...userReturned![0], jti }, process.env.JWT_SECRET!, {
    expiresIn: 2 * 24 * 3600,
  });

  try {
    await setRefreshToken({
      id: String(userReturned![0].id),
      refreshToken: refreshTokenRecharge,
      ex: 30 * 24 * 3600,
      oldRefreshToken: refreshToken,
    });
  } catch (e) {
    throw new RedisInternalError("error on refresh_token redefinition");
  }

  return {
    userReturned: userReturned![0],
    refreshToken: refreshTokenRecharge,
    jwt: jwtToken,
  };
}
