import type { NextFunction, Request, Response } from "express";
import { AppError, MultipleApiError, ValidationError } from "../errors/errors";

export function errorHandler(
  error: Error,
  _: Request,
  res: Response,
  __: NextFunction,
) {
  console.error("[ErrorHandler]", error);

  if (error instanceof AppError) {
    const statusCode = error.httpCode || 400;
    const responsePayload: Record<string, any> = {
      success: false,
      code: error.internalCode,
      message: error.customMessage || error.message,
    };

    if (error instanceof MultipleApiError && error.errors) {
      responsePayload.errors = error.errors;
    }

    if (error instanceof ValidationError && error.errors) {
      responsePayload.errors = error.errors;
    }

    return res.status(statusCode).json(responsePayload);
  }

  const isProduction = process.env.NODE_ENV === "production";
  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: isProduction
      ? "Ocorreu um erro interno no servidor."
      : (error.message || "An unexpected error occurred."),
  });
}
