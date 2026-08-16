import { Router } from "express";
import { marketController } from "./market.controller";
import { requireAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.get("/", marketController.getAllMarkets);
r.get("/:id", marketController.getMarketById);
r.post("/", requireAuth as any, marketController.createMarket);

export default r;
