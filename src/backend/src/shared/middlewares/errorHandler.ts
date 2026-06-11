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
    return res
      .status(err.httpCode)
      .json(failure(err.message, err.textCode, err.field, err.httpCode));
  }

  if (err instanceof InternalSystemError) {
    return res
      .status(500)
      .json(
        failure(err.internalMessage, "INTERNAL_SERVER_ERROR", undefined, 500),
      );
  }
  
  console.error(err);

  return res
    .status(500)
    .json(
      failure(
        "An unexpected error occurred on the server.",
        "INTERNAL_SERVER_ERROR",
        undefined,
        500,
      ),
    );
};
