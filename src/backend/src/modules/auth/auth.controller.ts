import type express from "express";

import { BadRequest, Unauthorized } from "../../shared/errors/errors";
import * as service from "./auth.service";
import { dispatchJSON } from "../../shared/util/response.helper";
import { SuccessCodes } from "../../shared/util/response.helper";

function temp() {}

export async function authenticateSession(
  req: express.Request,
  _res: express.Response,
  next: Function,
) {
  if (!req.headers.authorization)
    throw new Unauthorized("REQUEST: expected authorization field");
  const bruteToken = req.headers.authorization.split(" ");
  let token: string = "";
  if (bruteToken.length > 1) {
    if (bruteToken[1]) token = bruteToken[1];
  } else if (bruteToken.length === 1)
    if (bruteToken[0]) token = bruteToken[0];
    else throw new Unauthorized("REQUEST: expected valid bearer structure");

  const payload = await service.authenticateSession(token);
  req.user = payload;
  return next();
}

export const register: Handlers.CreateUser = async function(
  req,
  res,
  _next,
) {
  const { email, name, password } = req.body;
  const user = {
    email,
    name,
    password,
  };

  const { userReturned, jwt, refreshToken } = await service.register(user);

  const responseBody = {
    user: userReturned,
    jwt,
    refreshToken,
  };

  return dispatchJSON(responseBody, SuccessCodes.created, res);
};

export const refreshSession: Handlers.RechargeSession = async function (req, res, next) {
  const { refreshToken } = req.body;
  const payload = await service.rechargeJWT(refreshToken);

  dispatchJSON(payload, SuccessCodes.found, res);
}

