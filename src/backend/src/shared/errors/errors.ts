enum InternalErrorCodes {
  jtiConflict,
  internalDatabaseConflict,
  internalRedisConflict,
  unknown,
}

enum ErrorCodes {}

export interface ErrorItem {
  message: string; 
  code: string;
  field?: string;
}

// BASIC ERROR CLASSES ---------------
export abstract class ApiError extends Error {
  httpCode: number;
  textCode: string;
  field?: string;

  constructor(
    httpCode: number,
    textCode: string,
    message: string,
    field?: string,
  ) {
    super(message);
    this.httpCode = httpCode;
    this.textCode = textCode;
    if (field) this.field = field;
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
  constructor(
    message: string,
    textCode: string = "BAD_REQUEST",
    scope?: string,
  ) {
    scope = scope?.toUpperCase();
    super(400, textCode, `${scope ? `${scope}: ${message}` : message}`);
  }
}

export class Unauthorized extends ApiError {
  constructor(message: string, textCode: string = "UNAUTHORIZED") {
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

export class HttpInternalServerError extends ApiError {
  constructor(
    message: string = "An unexpected error occurred on the server.",
    textCode: string = "INTERNAL_SERVER_ERROR",
  ) {
    super(500, textCode, message);
    this.name = "HttpInternalServerError";
    throw new InternalSystemError(
      this,
      InternalErrorCodes.unknown,
      "no message; generic error.",
    );
  }
}

// -------------------------------------

// INTERNAL SERVER ERRORS --------------
export class InternalSystemError extends Error {
  readonly internalMessage: string;
  readonly internalCode: InternalErrorCodes;
  readonly cause: Error;
  readonly timestamp: Date;

  constructor(
    cause: Error,
    internalCode: InternalErrorCodes,
    internalMessage: string,
  ) {
    super(internalMessage, { cause });
    this.name = new.target.name;
    this.internalMessage = internalMessage;
    this.internalCode = internalCode;
    this.cause = cause;
    this.timestamp = new Date();
  }
}

export class JTIrefused extends Unauthorized {
  readonly jti: string;
  constructor(
    jti: string,
    message: string = "Token identity (JTI) has been revoked.",
  ) {
    super(`${message} [jti=${jti}]`, "JTI_REFUSED");
    this.jti = jti;
  }
}

export class DatabaseInternalError extends InternalSystemError {
  constructor(message: string, e: Error = new Error()) {
    super(e, InternalErrorCodes.internalDatabaseConflict, message);
  }
}

export class RedisInternalError extends InternalSystemError {
  constructor(message: string, e: Error = new Error()) {
    super(e, InternalErrorCodes.internalRedisConflict, message);
  }
}
// -------------------------------------

// FORMAT - HELPERS --------------------

export function parseDatabaseError(e: any, message: string): never {
  const dbError = e && typeof e === "object" && "cause" in e ? (e.cause ?? e) : e;
  if (dbError && typeof dbError === "object" && "code" in dbError) {
    switch (dbError.code) {
      case "23505": {
        if (dbError.detail?.includes("email")) {
          throw new Conflict("This email address is already registered.");
        }
        throw new Conflict(
          "A record with these unique details already exists.",
        );
      }

      case "23503": {
        if (dbError.detail?.includes("role_id")) {
          throw new BadRequest(
            "The provided role ID does not exist.",
            "role-id",
          );
        }
        throw new BadRequest("Provided relational reference is invalid.");
      }
      case "23502": {
        const missingColumn = dbError.column ? ` [${dbError.column}]` : "";
        throw new BadRequest(
          `Required field is missing or empty.`,
          missingColumn,
        );
      }
      case "22001": {
        throw new BadRequest(
          "String length exceeds the maximum allowed limit for this field.",
        );
      }
      case "22P02": {
        throw new BadRequest(
          "Invalid data format provided for the requested operation.",
        );
      }
      default: {
        throw new DatabaseInternalError(message, e);
      }
    }
  } else throw new DatabaseInternalError(message, e);
}

// -------------------------------------
