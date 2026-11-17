import { Router } from "express";
import { marketController } from "./market.controller";
import { requireAuth, requireAdmin } from "@/shared/middlewares/authMiddleware";
import {
  heavyComputeRateLimiter,
  searchRateLimiter,
  writeRateLimiter,
} from "@/shared/middlewares/rateLimiter";

const r = Router();

r.get("/", searchRateLimiter, marketController.getAllMarkets);
r.get("/:id", searchRateLimiter, marketController.getMarketById);
r.post("/", writeRateLimiter, requireAuth as any, marketController.createMarket);
r.put("/:id", writeRateLimiter, requireAuth as any, requireAdmin as any, marketController.updateMarket);
r.delete("/:id", writeRateLimiter, requireAuth as any, requireAdmin as any, marketController.deleteMarket);
r.post("/reallocate", heavyComputeRateLimiter, requireAuth as any, requireAdmin as any, marketController.reallocateMarkets);

export default r;
