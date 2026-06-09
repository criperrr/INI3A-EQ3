import { Router } from "express";
import * as controller from './auth.controller';

const r = Router();

r.post('/register', controller.register);
r.post('/refresh', controller.refreshSession);
r.use(controller.authenticateSession);

export default r;
