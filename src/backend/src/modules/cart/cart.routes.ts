import { Router } from "express";
import { cartController } from "./cart.controller";
import { requireAuth, optionalAuth } from "@/shared/middlewares/authMiddleware";
import {
  heavyComputeRateLimiter,
  searchRateLimiter,
  writeRateLimiter,
} from "@/shared/middlewares/rateLimiter";

const r = Router();

r.get("/", searchRateLimiter, requireAuth as any, cartController.getCart);
r.post("/items", writeRateLimiter, requireAuth as any, cartController.addItem);
r.put("/items/:productId", writeRateLimiter, requireAuth as any, cartController.updateQuantity);
r.delete("/items/:productId", writeRateLimiter, requireAuth as any, cartController.removeItem);
r.delete("/", writeRateLimiter, requireAuth as any, cartController.clearCart);

// Optimization endpoint: supports authenticated user's cart or transient client items
r.post("/optimize", heavyComputeRateLimiter, optionalAuth as any, cartController.optimizeCart);

export default r;
