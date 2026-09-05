import type { NextFunction, Request, Response } from "express";
import { ocurrencyService } from "./ocurrency.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";

class OcurrencyControllerClass {
  async create(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { productId, marketId, value, icon, createdAt, isPromotion } = req.body;
      const errors: Array<{ field: string; message: string }> = [];

      if (!productId || isNaN(Number(productId))) {
        errors.push({ field: "productId", message: "ID do produto é obrigatório." });
      }
      if (!marketId || isNaN(Number(marketId))) {
        errors.push({ field: "marketId", message: "ID do mercado é obrigatório." });
      }
      if (value === undefined || value === null || value === "") {
        errors.push({ field: "value", message: "O valor informado é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const result = await ocurrencyService.create({
        userId: req.user.id,
        productId: Number(productId),
        marketId: Number(marketId),
        value,
        icon,
        isPromotion: Boolean(isPromotion),
        createdAt,
      });

      return res.status(201).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async getByProduct(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const numProductId = Number(productId);

      if (!productId || isNaN(numProductId) || numProductId <= 0) {
        throw new ValidationError([{ field: "productId", message: "ID do produto inválido." }]);
      }

      const { latitude, longitude, radius } = req.query as {
        latitude?: string;
        longitude?: string;
        radius?: string;
      };
      const lat = latitude ? parseFloat(latitude) : undefined;
      const lng = longitude ? parseFloat(longitude) : undefined;
      const rad = radius ? parseFloat(radius) : undefined;

      const occurrences = await ocurrencyService.getByProduct(
        numProductId,
        req.user?.id,
        lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
          ? { lat, lng, radius: rad && !isNaN(rad) ? rad : 25000 }
          : undefined
      );
      return res.status(200).json(success(occurrences));
    } catch (e) {
      next(e);
    }
  }

  async vote(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { verdict } = req.body;
      const numId = Number(id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(numId) || numId <= 0) {
        errors.push({ field: "id", message: "ID da ocorrência inválido." });
      }
      if (typeof verdict !== "boolean") {
        errors.push({ field: "verdict", message: "O veredito (true/false) é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const result = await ocurrencyService.vote(req.user.id, numId, verdict);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async update(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { value, marketId } = req.body;
      const numId = Number(id);

      if (!id || isNaN(numId) || numId <= 0) {
        throw new ValidationError([{ field: "id", message: "ID da ocorrência inválido." }]);
      }

      const updated = await ocurrencyService.update(req.user.id, req.user.roleId, numId, {
        value,
        marketId: marketId ? Number(marketId) : undefined,
      });

      return res.status(200).json(success(updated));
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);

      if (!id || isNaN(numId) || numId <= 0) {
        throw new ValidationError([{ field: "id", message: "ID da ocorrência inválido." }]);
      }

      const result = await ocurrencyService.delete(req.user.id, req.user.roleId, numId);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }
}

export const ocurrencyController = new OcurrencyControllerClass();
