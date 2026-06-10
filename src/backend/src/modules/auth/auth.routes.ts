import { Router } from "express";
import * as controller from './auth.controller';

const r = Router();

r.use(controller.authenticateSession);

export default r;
