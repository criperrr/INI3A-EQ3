import { Router } from "express";
import { cartController } from "./cart.controller";
import { requireAuth, optionalAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.get("/", requireAuth as any, cartController.getCart);
r.post("/items", requireAuth as any, cartController.addItem);
r.put("/items/:productId", requireAuth as any, cartController.updateQuantity);
r.delete("/items/:productId", requireAuth as any, cartController.removeItem);
r.delete("/", requireAuth as any, cartController.clearCart);

// Optimization endpoint: supports authenticated user's cart or transient client items
r.post("/optimize", optionalAuth as any, cartController.optimizeCart);

export default r;
