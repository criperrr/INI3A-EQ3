
    enum ErrorCodes {
      jtiConflict,
      internalDatabaseConflict,
      internalRedisConflict
    }
// BASIC ERROR CLASSES ---------------

import { type ErrorItem } from "../util/response.helper";

export abstract class ApiError extends Error {
  httpCode: number;
  textCode: string;
  field: string

  constructor(
    httpCode: number,
    textCode: string,
    message: string,
    field: string = 'NONE'
  ) {
    super(message);
    this.httpCode = httpCode;
    this.textCode = textCode;
    this.field = field
  }
}

export class MultipleApiError extends Error {
  fields: ErrorItem[];
  httpCode: number;

  constructor(fields: ErrorItem[], httpCode: number = 400) {
    super("Multiple empty or invalid fields");
    this.fields = fields;
    this.httpCode = httpCode;
  }
}
// -----------------------------------

// API GENERIC ERRORS --------------
export class BadRequest extends ApiError {
  constructor(message: string, textCode: string = "BAD_REQUEST") {
    super(400, textCode, message);
  }
}

export class Unauthorized extends ApiError {
  constructor(message: string, textCode: string = "BAD_AUTHORIZATION") {
    super(401, textCode, message);
  }
}
// -------------------------------------

// INTERNAL SERVER ERRORS --------------
export class InternalError extends ApiError {
  message: string;
  internalCode: ErrorCodes;
  stack: string;

  constructor(e: Error, internalCode: ErrorCodes, message?: string) {
    super(500, "INTERNAL_ERROR", "Internal error");
    this.message = message ?? e.message;
    this.internalCode = internalCode;
    this.stack = e.stack ?? "No stack found in Error type";
  }
}

export class JTIrefused extends InternalError {
  constructor(jti: number | string, message: string = "", e?: Error) {
    if (!e) e = new Error(message);
    message = `JWT: ${jti} key refused`;
    super(e, ErrorCodes.jtiConflict, message);
  }
}

export class DatabaseInternalError extends InternalError{
  constructor(message: string, e: Error = new Error()) {
    super(e, ErrorCodes.internalDatabaseConflict, message);
  }
}

export class RedisInternalError extends InternalError {
  constructor(message: string, e: Error = new Error()) {
    super(e, ErrorCodes.internalRedisConflict, message);
  };
}
// -------------------------------------
