enum ErrorCodes {
  jtiConflict,
  internalDatabaseConflict,
  internalRedisConflict,
}
// BASIC ERROR CLASSES ---------------

import { type ErrorItem } from "../util/response.helper";

export abstract class ApiError extends Error {
  httpCode: number;
  textCode: string;
  field: string;

  constructor(
    httpCode: number,
    textCode: string,
    message: string,
    field: string = "NONE",
  ) {
    super(message);
    this.httpCode = httpCode;
    this.textCode = textCode;
    this.field = field;
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

export class NotFound extends ApiError {
  constructor(message: string, textCode: string = "NOT_FOUND") {
    super(404, textCode, message);
  }
}

export class Conflict extends ApiError {
  constructor(message: string, textCode: string = "CONFLICT") {
    super(409, textCode, message);
  }
}
// -------------------------------------

// INTERNAL SERVER ERRORS --------------
export class InternalError extends ApiError {
  internalCode: ErrorCodes;

  constructor(e: Error, internalCode: ErrorCodes, message: string) {
    super(500, "INTERNAL_ERROR", message);
    this.internalCode = internalCode;
  }
}

export class JTIrefused extends InternalError {
  constructor(jti: number | string, message: string = "", e?: Error) {
    if (!e) e = new Error(message);
    message = `JWT: ${jti} key refused`;
    super(e, ErrorCodes.jtiConflict, message);
  }
}

export class DatabaseInternalError extends InternalError {
  constructor(message: string, e: Error = new Error()) {
    super(e, ErrorCodes.internalDatabaseConflict, message);
  }
}

export class RedisInternalError extends InternalError {
  constructor(message: string, e: Error = new Error()) {
    super(e, ErrorCodes.internalRedisConflict, message);
  }
}
// -------------------------------------

// FORMAT - HELPERS --------------------

export function parseDatabaseError(e: any, message: string): never{
  if (e && typeof e === "object" && "code" in e) {
    switch (e.code) {
      case "23505": {
        if (e.detail?.includes("email")) {
          throw new Conflict(
            "DATABASE: This email address is already registered.",
          );
        }
        throw new Conflict(
          "DATABASE: A record with these unique details already exists.",
        );
      }

      case "23503": {
        if (e.detail?.includes("role_id")) {
          throw new BadRequest(
            "DATABASE: The provided role ID does not exist.",
          );
        }
        throw new BadRequest(
          "DATABASE: Provided relational reference is invalid.",
        );
      }
      case "23502": {
        const missingColumn = e.column ? ` [${e.column}]` : "";
        throw new BadRequest(
          `DATABASE: Required field is missing or empty${missingColumn}.`,
        );
      }
      case "22001": {
        throw new BadRequest(
          "DATABASE: String length exceeds the maximum allowed limit for this field.",
        );
      }
      case "22P02": {
        throw new BadRequest(
          "DATABASE: Invalid data format provided for the requested operation.",
        );
      }
      default: {
        throw new DatabaseInternalError(message);
        }
    }
  }
  else throw new DatabaseInternalError(message);

}

// -------------------------------------
