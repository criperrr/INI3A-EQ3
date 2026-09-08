import { Router } from "express";
import { ocurrencyController } from "./ocurrency.controller";
import { requireAuth, requireAdmin, optionalAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

// Admin moderation routes (must precede /:id)
r.get("/admin/pending", requireAuth as any, requireAdmin as any, ocurrencyController.getPending as any);
r.post("/:id/approve", requireAuth as any, requireAdmin as any, ocurrencyController.approve as any);
r.post("/:id/reject", requireAuth as any, requireAdmin as any, ocurrencyController.reject as any);

// Standard occurrence routes
r.get("/product/:productId", optionalAuth as any, ocurrencyController.getByProduct as any);
r.post("/", requireAuth as any, ocurrencyController.create as any);
r.post("/:id/vote", requireAuth as any, ocurrencyController.vote as any);
r.put("/:id", requireAuth as any, ocurrencyController.update as any);
r.delete("/:id", requireAuth as any, ocurrencyController.delete as any);

export default r;

