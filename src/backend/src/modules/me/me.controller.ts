import type express from "express";
import type { NextFunction } from "express";
import * as service from "./me.service";
import { dispatchSuccess, SuccessCodes } from "@/shared/util/response.helper";

/**
 * ADICIONAR VALIDAÇÃO DE BODY, A MAIORIA DOS ERROS DE BAD REQUEST CAEM DE FORMA GENERICA,
 * JA BAIXEI O ZOD, QUANDO TIVERMOS TEMPO É SÓ CRIAR UM ARQUIVO .type-secure.ts (é um exemplo de nome só)
 */

export async function deleteMySession(
  req: express.Request,
  res: express.Response,
  _next: NextFunction,
) {
  const userId = req.user.id;

  if (typeof userId === "number") await service.deleteSession(userId);
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
  _next: NextFunction,
) {
  const id = req.user.id;
  const userReturned = await service.getMe(id);

  return dispatchSuccess(SuccessCodes.ok, res, userReturned);
}
