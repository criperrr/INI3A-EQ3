import type express from "express";

import { BadRequest, Unauthorized } from "../../shared/errors/errors";
import * as service from "./entry.service";
import { dispatchJSON } from "../../shared/util/response.helper";
import { SuccessCodes } from "../../shared/util/response.helper";


export async function deleteMySession(
  req: express.Request,
  res: express.Response,
  _next: Function,
) {
  const userId = req.user.id;
  await service.deleteSession(userId);
  return dispatchJSON({}, SuccessCodes.noResponse, res);
}

export const updateMySession: Handlers.UpdateUser = async function (req, res, next) {
  const id = req.user.id;
  const { email, password, name, birthdate, location } = req.body;
  const userReturned = await service.updateSession(id, {
    email,
    password,
    name,
    birthdate,
    location,
  });
  return dispatchJSON(userReturned, SuccessCodes.ok, res);
};

export async function getMySession(
  req: express.Request,
  res: express.Response,
  _next: Function,
) {
  const id = req.user.id;
  const userReturned = await service.getMe(id);

  return dispatchJSON(userReturned, SuccessCodes.found, res);
};
