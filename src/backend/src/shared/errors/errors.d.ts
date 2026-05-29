interface LoginCredentials {
    name: string,
    password: string
}

export abstract class ApiError extends Error {
    httpCode: number;
    textCode: string;

    constructor(httpCode: number, textCode: string, message: string) {
        super(message);
        this.httpCode = httpCode;
        this.textCode = textCode;
    }
}

export class BadRequestError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_REQUEST') {
        super(404, textCode, message);
    }
}

export class BadAuthorizationError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_AUTHORIZATION') {
        super(404, textCode, message);
    }
}