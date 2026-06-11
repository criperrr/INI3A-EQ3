import { Router } from "express";
<<<<<<< HEAD
import type { Request, Response } from "express";
=======
import * as controller from "./auth.controller";

>>>>>>> tests
const r = Router();

r.use(controller.authenticateSession);

export default r;