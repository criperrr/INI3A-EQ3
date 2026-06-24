import {
  ApiError,
  MultipleApiError,
  InternalSystemError,
} from "@/shared/errors/errors";
import type { ErrorRequestHandler } from "express";
import { multipleErrors, failure } from "@/shared/util/response.helper";

export const globalErrorHandling: ErrorRequestHandler = function (
  err,
  _,
  res,
  __,
) {
  if (err instanceof MultipleApiError) {
    return res
      .status(err.httpCode)
      .json(multipleErrors(err.fields, err.httpCode));
  }

  if (err instanceof ApiError) {
    if ("internalError" in err) console.log(err["internalError"]); // tem que melhorar o logging dps, pra ficar safado
    return res
      .status(err.httpCode)
      .json(failure(err.message, err.textCode, err.field, err.httpCode));
  }

  if (err instanceof InternalSystemError) {
    console.log(err);
    return res
      .status(500)
      .json(failure("Internal Api Error", "INTERNAL_SERVER_ERROR"));
  }

  return res
    .status(500)
    .json(
      failure(err?.message ?? "Unexpected error", "INTERNAL", undefined, 500),
    );
};
