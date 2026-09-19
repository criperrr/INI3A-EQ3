import type { Response, NextFunction } from "express";
import { customizationService } from "./customization.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";

class CustomizationControllerClass {
  async getCatalog(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const catalog = await customizationService.getShopCatalog(userId);
      return res.status(200).json(success(catalog));
    } catch (e) {
      return next(e);
    }
  }

  async buyItem(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const itemId = Number(req.params.itemId);

      if (isNaN(itemId) || itemId <= 0) {
        throw new ValidationError([
          { field: "itemId", message: "ID do item inválido." },
        ]);
      }

      const result = await customizationService.buyItem(userId, itemId);
      return res.status(200).json(success(result));
    } catch (e) {
      return next(e);
    }
  }

  async equipItem(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const itemId = Number(req.params.itemId);

      if (isNaN(itemId) || itemId <= 0) {
        throw new ValidationError([
          { field: "itemId", message: "ID do item inválido." },
        ]);
      }

      const result = await customizationService.equipItem(userId, itemId);
      return res.status(200).json(success(result));
    } catch (e) {
      return next(e);
    }
  }

  async unequipItem(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const category = req.params.category as string;

      if (!category || !["banner", "avatar_frame", "level_frame"].includes(category)) {
        throw new ValidationError([
          { field: "category", message: "Categoria inválida. Use 'banner', 'avatar_frame' ou 'level_frame'." },
        ]);
      }

      const result = await customizationService.unequipItem(userId, category);
      return res.status(200).json(success(result));
    } catch (e) {
      return next(e);
    }
  }
}

export const customizationController = new CustomizationControllerClass();
