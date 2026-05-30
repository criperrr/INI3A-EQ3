interface LoginCredentials {
    name: string,
    password: string
}

export interface InvalidField {
    field: string,
    message: string,
    code: string, // not http code, a custom internal one
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

export class MultipleApiError extends Error {
    fields: InvalidField[]; 
    
    constructor(fields: InvalidField[], httpCode: number = 400){
        super("Multiple empty or invalid fields");
        this.fields = fields;
    }
}

export class BadRequestError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_REQUEST') {
        super(400, textCode, message);
    }
}

export class BadAuthorizationError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_AUTHORIZATION') {
        super(401, textCode, message);
    }
}