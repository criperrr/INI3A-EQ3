import { ApiError, MultipleApiError } from "../errors/errors";
import type { Response, Request } from "express";
import { singleError, multipleErrors } from "../util/response.helper";

export async function globalErrorHandling(
  err: Error,
  _: Request,
  res: Response,
) {
  if (err instanceof ApiError) {
    return res
      .status(err.httpCode)
      .json(singleError(err.message, err.textCode, err.field));
  }

  if (err instanceof MultipleApiError)
    return res.status(err.httpCode).json(multipleErrors(err.fields));

  return res
    .status(500)
    .json(singleError("Internal server error", "API_SERVER_ERROR"));
}
