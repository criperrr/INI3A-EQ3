import { Router } from "express";
import { ocurrencyController } from "./ocurrency.controller";
import { requireAuth, requireAdmin, optionalAuth, requireTwoFactor } from "@/shared/middlewares/authMiddleware";
import { searchRateLimiter, writeRateLimiter } from "@/shared/middlewares/rateLimiter";

const r = Router();

// Admin moderation routes (must precede /:id)
r.get("/admin/pending", searchRateLimiter, requireAuth as any, requireAdmin as any, ocurrencyController.getPending as any);
r.post("/:id/approve", writeRateLimiter, requireAuth as any, requireAdmin as any, ocurrencyController.approve as any);
r.post("/:id/reject", writeRateLimiter, requireAuth as any, requireAdmin as any, ocurrencyController.reject as any);

// Standard occurrence routes
r.get("/product/:productId", searchRateLimiter, optionalAuth as any, ocurrencyController.getByProduct as any);
r.post("/", writeRateLimiter, requireTwoFactor as any, ocurrencyController.create as any);
r.post("/:id/vote", writeRateLimiter, requireTwoFactor as any, ocurrencyController.vote as any);
r.put("/:id", writeRateLimiter, requireTwoFactor as any, ocurrencyController.update as any);
r.delete("/:id", writeRateLimiter, requireTwoFactor as any, ocurrencyController.delete as any);

export default r;
