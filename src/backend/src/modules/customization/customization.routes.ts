import { Router } from "express";
import { customizationController } from "./customization.controller";
import { requireAuth } from "@/shared/middlewares/authMiddleware";

const customizationRouter = Router();

customizationRouter.get("/shop", requireAuth, (req, res, next) => {
  return customizationController.getCatalog(req as any, res, next);
});

customizationRouter.post("/buy/:itemId", requireAuth, (req, res, next) => {
  return customizationController.buyItem(req as any, res, next);
});

customizationRouter.post("/equip/:itemId", requireAuth, (req, res, next) => {
  return customizationController.equipItem(req as any, res, next);
});

customizationRouter.post("/unequip/:category", requireAuth, (req, res, next) => {
  return customizationController.unequipItem(req as any, res, next);
});

export default customizationRouter;
