import type { NextFunction, Request, Response } from "express";
import { AppError, MultipleApiError, ValidationError } from "../errors/errors";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  __: NextFunction,
) {
  const headerReqId = req.headers?.["x-request-id"];
  const requestId =
    (req as any).requestId ||
    (Array.isArray(headerReqId) ? headerReqId[0] : headerReqId) ||
    undefined;

  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.httpCode || 400 : 500;
  const internalCode = isAppError ? error.internalCode : "INTERNAL_SERVER_ERROR";
  const logMessage = isAppError
    ? error.customMessage || error.message || internalCode
    : error.message || "An unexpected error occurred.";

  const logEntry: Record<string, unknown> = {
    level: statusCode >= 500 ? "error" : "warn",
    type: "http_error",
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    method: req.method,
    path: req.originalUrl || req.url,
    status: statusCode,
    code: internalCode,
    message: logMessage,
  };

  if (statusCode >= 500 && error?.stack) {
    logEntry.stack = error.stack;
  }

  console.error(JSON.stringify(logEntry));

  if (isAppError) {
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
      : error.message || "An unexpected error occurred.",
  });
}
