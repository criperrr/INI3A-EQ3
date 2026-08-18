import type { NextFunction, Request, Response } from "express";
import { marketService } from "./market.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";

class MarketControllerClass {
  async getAllMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radius } = req.query;
      const lat = latitude ? Number(latitude) : undefined;
      const lng = longitude ? Number(longitude) : undefined;
      const rad = radius ? Number(radius) : undefined;

      const markets = await marketService.getAllMarkets({
        latitude: lat && !isNaN(lat) ? lat : undefined,
        longitude: lng && !isNaN(lng) ? lng : undefined,
        radius: rad && !isNaN(rad) ? rad : undefined,
      });
      return res.status(200).json(success(markets));
    } catch (e) {
      next(e);
    }
  }

  async getMarketById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);

      if (!id || isNaN(numId) || numId <= 0) {
        throw new ValidationError([{ field: "id", message: "ID do mercado inválido." }]);
      }

      const market = await marketService.getMarketById(numId);
      return res.status(200).json(success(market));
    } catch (e) {
      next(e);
    }
  }

  async createMarket(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { name, latitude, longitude } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new ValidationError([{ field: "name", message: "O nome do mercado é obrigatório." }]);
      }

      const market = await marketService.createMarket({
        name,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });

      return res.status(201).json(success(market));
    } catch (e) {
      next(e);
    }
  }
}

export const marketController = new MarketControllerClass();
