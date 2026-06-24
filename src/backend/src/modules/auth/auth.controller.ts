import type express from "express";

import { Unauthorized } from "@/shared/errors/errors";
import * as service from "./auth.service";
import { dispatchSuccess, SuccessCodes } from "@/shared/util/response.helper";
import { UserRepository } from "@/shared/database/repositories/repositories.index";

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

  const payload = await service.AuthService.authenticateSession(token);
  req.user = payload;
  return next();
}

/**
 * ADICIONAR VALIDAÇÃO DE BODY, A MAIORIA DOS ERROS DE BAD REQUEST CAEM DE FORMA GENERICA,
 * JA BAIXEI O ZOD, QUANDO TIVERMOS TEMPO É SÓ CRIAR UM ARQUIVO .type-secure.ts (é um exemplo de nome só)
 */

export async function deleteMySession(
  req: express.Request,
  res: express.Response,
  _next: Function,
) {
  const userId = req.user.id;

  if (typeof userId !== "number") await service.deleteSession(userId);
  return dispatchSuccess(SuccessCodes.noContent, res);
}

export const updateMySession: Handlers.UpdateUser = async function (
  req,
  res,
  next,
) {
  const id = req.user.id;
  const { email, password, name, birthdate, location } = req.body;
  const userReturned = await service.updateSession(id, {
    email,
    password,
    name,
    birthdate,
    location,
  });
  return dispatchSuccess(SuccessCodes.ok, res, userReturned);
};


export async function getMySession(
  req: express.Request,
  res: express.Response,
  _next: Function,
) {
  const id = req.user.id;
  const userReturned = await UserRepository.getUser(id);

  return dispatchSuccess(SuccessCodes.ok, res, userReturned);
}
