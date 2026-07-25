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