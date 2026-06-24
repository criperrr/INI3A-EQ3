import { Router } from "express";
import * as controller from "./auth.controller";

const r = Router();

// /api/v1/
r.use(controller.authenticateSession);
r.get("/", controller.getMySession);
r.put("/", controller.updateMySession);
r.delete("/", controller.deleteMySession);

export default r;
