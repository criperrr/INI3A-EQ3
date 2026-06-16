import type express from "express";

import { BadRequest, Unauthorized } from "@/shared/errors/errors";
import * as service from "./entry.service";
import { dispatchSuccess } from "../../shared/util/response.helper";
import { SuccessCodes } from "../../shared/util/response.helper";

export const register: Handlers.CreateUser = async function (req, res, _next) {
  const { email, name, password } = req.body;
  const user = {
    email,
    name,
    password,
  };

  const { userReturned, jwt, refreshToken } = await service.register(user);

  const responseBody = {
    user: userReturned,
    userReturned,
    jwt,
    refreshToken,
  };

  return dispatchSuccess(SuccessCodes.created, res, responseBody);
};

export const login = async function (
  req: express.Request,
  res: express.Response,
  _next: Function,
) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequest("email and password are required", "MISSING_FIELDS");
  }

  const { userReturned, jwt, refreshToken } = await service.login(email, password);

  return dispatchSuccess(SuccessCodes.ok, res, {
    user: userReturned,
    userReturned,
    jwt,
    refreshToken,
  });
};

export const refreshSession: Handlers.RechargeSession = async function (
  req,
  res,
  next,
) {
  const { refreshToken } = req.body;
  const payload = await service.rechargeJWT(refreshToken);

  return dispatchSuccess(SuccessCodes.ok, res, payload);
};

export const createEntry = async function (
  req: any,
  res: any,
  next: any,
) {
  try {
    const { marketId, productId, value } = req.body;
    const userId = req.user?.id;

    if (!marketId || !productId || !value) {
      throw new BadRequest("marketId, productId and value are required.", "MISSING_FIELDS");
    }

    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      throw new BadRequest("Value must be a valid number greater than 0.", "INVALID_VALUE");
    }

    const newEntry = await service.createEntry({
      userId,
      marketId,
      productId,
      value: numericValue,
    });

    return dispatchSuccess(SuccessCodes.created, res, newEntry);
  } catch (error) {
    return next(error);
  }
};
