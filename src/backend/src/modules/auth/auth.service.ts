

// !REFACTOR

/**
 * 200-300 (OK)
 * {succes:true, data: { ... }, textCode: CONSTANT}
 * 
 * 400+ (OK)
 * {success:false, error: { ... }, textCode: CONSTANT}
 * 
 */

import type { LoginCredentials } from '../../shared/errors/errors';
import { BadAuthorizationError, BadRequestError } from '../../shared/errors/errors';
import type { Response, Request } from 'express';

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
    let token: string = '';
    if (bruteToken.length > 1) {
        if(bruteToken[1])
        token = bruteToken[1];
    }
    else if (bruteToken.length === 1) if(bruteToken[0]) token = bruteToken[0];
    else throw new BadRequestError('expected valid bearer structure.');
}