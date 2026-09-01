import { Router } from "express";
import { ocurrencyController } from "./ocurrency.controller";
import { requireAuth, optionalAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.get("/product/:productId", optionalAuth as any, ocurrencyController.getByProduct as any);
r.post("/", requireAuth as any, ocurrencyController.create as any);
r.post("/:id/vote", requireAuth as any, ocurrencyController.vote as any);
r.put("/:id", requireAuth as any, ocurrencyController.update as any);
r.delete("/:id", requireAuth as any, ocurrencyController.delete as any);

export default r;

