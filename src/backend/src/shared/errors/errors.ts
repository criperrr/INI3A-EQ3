export class AppError extends Error {
  internalCode: string;
  customMessage: string;
  httpCode: number;
  constructor(internalCode: string, customMessage: string, httpCode: number) {
    super();
    this.internalCode = internalCode;
    this.customMessage = customMessage;
    this.httpCode = httpCode;
  }
}


export class InternalError extends AppError {
  constructor(internalCode: string, customMessage: string, httpCode: number) {
    super(internalCode, customMessage, httpCode);
  }
}

export class NotImplemented extends AppError {
  constructor(internalCode: string) {
    super(internalCode, "Function not implemented.", 501);
  }
}

export class JTIrefused extends AppError {
  constructor(jti?: string) {
    super("JTI_REFUSED", `JTI ${jti ? jti + " " : ""}was refused or invalid`, 401);
  }
}

export class MultipleApiError extends AppError {
  errors: any[];
  constructor(errors: any[], httpCode: number = 400) {
    super("MULTIPLE_ERRORS", "Multiple validation errors occurred", httpCode);
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Invalid credentials.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists.") {
    super("CONFLICT", message, 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found.") {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  errors: Array<{ field: string; message: string }>;
  constructor(errors: Array<{ field: string; message: string }>) {
    super("VALIDATION_ERROR", "Validation failed.", 422);
    this.errors = errors;
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acesso negado. Permissões insuficientes.") {
    super("FORBIDDEN", message, 403);
  }
}