import { Router } from "express";
import * as controller from "./product.controller";
import { authenticateSession } from "../auth/auth.controller";

const r = Router();

// Public routes
r.get("/search", controller.search);
r.get("/:id", controller.getById);

// Protected routes (require valid JWT session token)
r.get("/barcode/:ean", authenticateSession, controller.getByBarcode);
r.post("/", authenticateSession, controller.create);

export default r;
