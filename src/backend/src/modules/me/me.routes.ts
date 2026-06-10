import { Router } from "express";
import * as controller from './me.controller';

const r = Router();

r.get('/', controller.getMySession);
r.put('/', controller.updateMySession);
r.delete('/', controller.deleteMySession);

export default r;
