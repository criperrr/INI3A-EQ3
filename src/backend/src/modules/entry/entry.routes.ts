import { Router } from "express";
import * as controller from './entry.controller';

const r = Router();

r.get('/me', controller.getMySession);
r.put('/me', controller.updateMySession);
r.delete('/me', controller.deleteMySession);

export default r;
