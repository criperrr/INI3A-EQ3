import { db } from "../../shared/database/database";
// !REFACTOR

/**
 * 200-300 (OK)
 * {succes:true, data: { ... }, textCode: CONSTANT}
 *
 * 400+ (OK)
 * {success:false, error: { ... }, textCode: CONSTANT}
 *
 */
import express from "express";
import jwt, { type Jwt, type JwtPayload } from "jsonwebtoken";
import { hash, compare } from "../../shared/hash/bcrypt";
import crypto from "crypto";
import * as repository from "./auth.repository";
import {
  DatabaseInternalError,
  RedisInternalError,
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
} from "../../shared/redis/server";
import { DataManager } from "discord.js";

export async function authenticateSession(token: string) {
  const secret = process.env.JWT_SECRET;
  let payload: Jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret as string) as Jwt.JwtPayload;
  }
  catch (e) {
    throw new JTIrefused('JWT: invalid token signature');
  }
  
  const id = String(payload.jti);
  if (!verifyJTI(id)) //Pensar se tem como tornar essa operação mais segura
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
    throw new DatabaseInternalError(
      "DATABASE: conflict on user creation.",
      e as Error,
    );
  }

  if (!userReturned[0])
    throw new DatabaseInternalError("DATABASE: user was not created.");

  const refreshToken = crypto.randomBytes(32).toString("hex");

  
    const jwtToken = jwt.sign(userReturned[0], process.env.JWT_SECRET!, {
      expiresIn: 2 * 24 * 3600,
    });
  
  try {
      setRefreshToken({
        id: String(userReturned[0].id),
        refreshToken: refreshToken,
        ex: 30 * 24 * 3600,
    });
  }
  catch (e) {
    throw new RedisInternalError('REDIS: error on refresh_token definition');
  }

  return {
    userReturned: userReturned[0],
    refreshToken,
    jwt: jwtToken,
  };
};
