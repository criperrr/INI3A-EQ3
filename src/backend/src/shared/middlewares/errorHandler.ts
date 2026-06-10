import { ApiError, MultipleApiError, InternalError } from "../errors/errors";
import type express from "express";
import { multipleErrors, errorFormat } from "@/shared/util/response.helper";
import type { ErrorRequestHandler } from "express";

export const globalErrorHandling: ErrorRequestHandler = function (
  err,
  req,
  res,
  next,
) {
  if (err instanceof ApiError) {
    return res
      .status(err.httpCode)
      .json(errorFormat(err.message, err.textCode, err.field, err.httpCode));
  }

  if (err instanceof InternalError) {
    return res
      .status(err.httpCode)
      .json(errorFormat(err.message, err.textCode, err.field, err.httpCode));
  }

  if (err instanceof MultipleApiError)
    //Cria sua logica ai camaforte, fiz baseado  na minha própria classe

    return res.status(err.httpCode).json(multipleErrors(err.fields));

  return res
    .status(500)
    .json(errorFormat(err.message, "INTERNAL", "NONE", 500));
};
