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

      const errors: Array<{ field: string; message: string }> = [];
      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) {
        errors.push({ field: "latitude", message: "Latitude deve estar entre -90 e 90 graus." });
      }
      if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) {
        errors.push({ field: "longitude", message: "Longitude deve estar entre -180 e 180 graus." });
      }
      if (rad !== undefined && (isNaN(rad) || rad <= 0 || rad > 1000000)) {
        errors.push({ field: "radius", message: "Raio deve ser um valor positivo em metros (máximo 1000km)." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const markets = await marketService.getAllMarkets({
        latitude: lat,
        longitude: lng,
        radius: rad,
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
      const errors: Array<{ field: string; message: string }> = [];

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        errors.push({ field: "name", message: "O nome do mercado é obrigatório." });
      }

      const lat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : undefined;
      const lng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : undefined;

      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) {
        errors.push({ field: "latitude", message: "Latitude deve estar entre -90 e 90 graus." });
      }
      if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) {
        errors.push({ field: "longitude", message: "Longitude deve estar entre -180 e 180 graus." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const market = await marketService.createMarket({
        name: name.trim(),
        latitude: lat,
        longitude: lng,
      });

      return res.status(201).json(success(market));
    } catch (e) {
      next(e);
    }
  }
}

export const marketController = new MarketControllerClass();
