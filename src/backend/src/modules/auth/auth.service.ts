// !REFACTOR

/**
 * 200-300 (OK)
 * {succes:true, data: { ... }, textCode: CONSTANT}
 * 
 * 400+ (OK)
 * {success:false, error: { ... }, textCode: CONSTANT}
 * 
 */

import { Response, Request } from 'express';

interface LoginCredentials {
    name: string,
    password: string
}

abstract class ApiError extends Error {
    httpCode: number;
    textCode: string;

    constructor(httpCode: number, textCode: string, message: string) {
        super(message);
        this.httpCode = httpCode;
        this.textCode = textCode;
    }
}

class BadRequestError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_REQUEST') {
        super(404, textCode, message);
    }
}

class BadAuthorizationError extends ApiError {

    constructor(message: string, textCode: string = 'BAD_AUTHORIZATION') {
        super(404, textCode, message);
    }
}

async function normalizeLogin(req: Request, res: Response, next: Function) {
    const keys: Array<string> = ['name', 'password'];
    let obj: LoginCredentials = {} as LoginCredentials;
    keys.forEach(el => {
        const reqValue = req.body[el]
        if (!reqValue) throw new BadRequestError(`expected: ${el} in json body.`);
        obj[el as keyof LoginCredentials] = reqValue;
    });
    req.body = obj;

    return next();
}

async function login(req: Request, res: Response, next: Function) {
    if (!req.headers.authorization) throw new BadAuthorizationError('expected authorization field.');
    const bruteToken = req.headers.authorization.split(' ');
    let token: string;
    if (bruteToken.length > 1) {
        token = bruteToken[1];
    }
    else if (bruteToken.length === 1) token = bruteToken[0];
    else throw new BadRequestError('expected valid bearer structure.');

}