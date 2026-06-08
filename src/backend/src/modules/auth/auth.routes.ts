import { Router } from "express";
import * as controller from './auth.controller';

const r = Router();

r.post('/register', controller.register);



export default r;
