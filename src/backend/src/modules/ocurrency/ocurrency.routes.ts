import { Router } from "express";
import { ocurrencyController } from "./ocurrency.controller";
import { requireAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.get("/product/:productId", ocurrencyController.getByProduct);
r.post("/", requireAuth as any, ocurrencyController.create);
r.post("/:id/vote", requireAuth as any, ocurrencyController.vote);
r.put("/:id", requireAuth as any, ocurrencyController.update);
r.delete("/:id", requireAuth as any, ocurrencyController.delete);

export default r;
