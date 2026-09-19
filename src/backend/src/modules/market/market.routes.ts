import { Router } from "express";
import { marketController } from "./market.controller";
import { requireAuth, requireAdmin } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.get("/", marketController.getAllMarkets);
r.get("/:id", marketController.getMarketById);
r.post("/", requireAuth as any, marketController.createMarket);
r.put("/:id", requireAuth as any, requireAdmin as any, marketController.updateMarket);
r.delete("/:id", requireAuth as any, requireAdmin as any, marketController.deleteMarket);
r.post("/reallocate", requireAuth as any, requireAdmin as any, marketController.reallocateMarkets);

export default r;
