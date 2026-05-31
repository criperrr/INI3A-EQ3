import { db } from '../../shared/database/database';

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
import { Unauthorized, BadRequest } from '../../shared/errors/errors';
import type { Response, Request } from 'express';

async function login(req: Request, res: Response, next: Function) {
    if (!req.headers.authorization) throw new Unauthorized('expected authorization field.');
    const bruteToken = req.headers.authorization.split(' ');
    let token: string = '';
    if (bruteToken.length > 1) {
        if(bruteToken[1])
        token = bruteToken[1];
    }
    else if (bruteToken.length === 1) if(bruteToken[0]) token = bruteToken[0];
    else throw new BadRequest('expected valid bearer structure.');

    // !NEED Regis
}