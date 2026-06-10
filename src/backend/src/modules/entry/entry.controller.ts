import type express from "express";

import { BadRequest, Unauthorized } from "@/shared/errors/errors";
import * as service from "./entry.service";
import { dispatchJSON } from "@/shared/util/response.helper";
import { SuccessCodes } from "@/shared/util/response.helper";

export const register: Handlers.CreateUser = async function (
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