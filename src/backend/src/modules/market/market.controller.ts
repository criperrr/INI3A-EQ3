import type { NextFunction, Request, Response } from "express";
import { marketService } from "./market.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";
import { RoutingService } from "@/shared/services/routing.service";

const SE_CATHEDRAL_COORDS = { lat: -23.55052, lng: -46.633308 };
const MARCO_ZERO_RADIUS_METERS = 50;
const BRAZIL_BOUNDS = {
  minLat: -34.0,
  maxLat: 5.5,
  minLng: -74.0,
  maxLng: -34.5,
};

class MarketControllerClass {
  async getAllMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radius, includeAll } = req.query;
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
        includeAll: includeAll === "true",
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

      const isLatProvided =
        latitude !== undefined &&
        latitude !== null &&
        latitude !== "" &&
        typeof latitude !== "boolean";
      const isLngProvided =
        longitude !== undefined &&
        longitude !== null &&
        longitude !== "" &&
        typeof longitude !== "boolean";

      const lat = isLatProvided ? Number(latitude) : undefined;
      const lng = isLngProvided ? Number(longitude) : undefined;

      if (!isLatProvided || lat === undefined || isNaN(lat)) {
        errors.push({ field: "latitude", message: "Latitude é obrigatória e deve ser um número válido." });
      } else if (lat < BRAZIL_BOUNDS.minLat || lat > BRAZIL_BOUNDS.maxLat) {
        errors.push({
          field: "latitude",
          message: `Latitude deve estar dentro do território brasileiro (entre ${BRAZIL_BOUNDS.minLat} e +${BRAZIL_BOUNDS.maxLat}).`,
        });
      }

      if (!isLngProvided || lng === undefined || isNaN(lng)) {
        errors.push({ field: "longitude", message: "Longitude é obrigatória e deve ser um número válido." });
      } else if (lng < BRAZIL_BOUNDS.minLng || lng > BRAZIL_BOUNDS.maxLng) {
        errors.push({
          field: "longitude",
          message: `Longitude deve estar dentro do território brasileiro (entre ${BRAZIL_BOUNDS.minLng} e ${BRAZIL_BOUNDS.maxLng}).`,
        });
      }

      if (errors.length === 0 && lat !== undefined && lng !== undefined) {
        const distanceToMarcoZero = RoutingService.calculateHaversineDistance(
          { lat, lng },
          SE_CATHEDRAL_COORDS
        );

        if (distanceToMarcoZero <= MARCO_ZERO_RADIUS_METERS) {
          errors.push({
            field: "location",
            message: "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé.",
          });
        }
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const market = await marketService.createMarket({
        name: name.trim(),
        latitude: lat!,
        longitude: lng!,
      });

      return res.status(201).json(success(market));
    } catch (e) {
      next(e);
    }
  }

  async updateMarket(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);
      if (!id || isNaN(numId) || numId <= 0) {
        throw new ValidationError([{ field: "id", message: "ID do mercado inválido." }]);
      }

      const { name, latitude, longitude } = req.body;
      const errors: Array<{ field: string; message: string }> = [];

      if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
        errors.push({ field: "name", message: "O nome do mercado não pode ser vazio." });
      }

      const isLatProvided =
        latitude !== undefined &&
        latitude !== null &&
        latitude !== "" &&
        typeof latitude !== "boolean";
      const isLngProvided =
        longitude !== undefined &&
        longitude !== null &&
        longitude !== "" &&
        typeof longitude !== "boolean";

      const lat = isLatProvided ? Number(latitude) : undefined;
      const lng = isLngProvided ? Number(longitude) : undefined;

      if ((isLatProvided && !isLngProvided) || (!isLatProvided && isLngProvided)) {
        errors.push({
          field: "location",
          message: "Latitude e longitude devem ser fornecidas juntas para atualizar a localização.",
        });
      }

      if (isLatProvided) {
        if (lat === undefined || isNaN(lat)) {
          errors.push({ field: "latitude", message: "Latitude deve ser um número válido." });
        } else if (lat < BRAZIL_BOUNDS.minLat || lat > BRAZIL_BOUNDS.maxLat) {
          errors.push({
            field: "latitude",
            message: `Latitude deve estar dentro do território brasileiro (entre ${BRAZIL_BOUNDS.minLat} e +${BRAZIL_BOUNDS.maxLat}).`,
          });
        }
      }

      if (isLngProvided) {
        if (lng === undefined || isNaN(lng)) {
          errors.push({ field: "longitude", message: "Longitude deve ser um número válido." });
        } else if (lng < BRAZIL_BOUNDS.minLng || lng > BRAZIL_BOUNDS.maxLng) {
          errors.push({
            field: "longitude",
            message: `Longitude deve estar dentro do território brasileiro (entre ${BRAZIL_BOUNDS.minLng} e ${BRAZIL_BOUNDS.maxLng}).`,
          });
        }
      }

      if (isLatProvided && isLngProvided && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        const distanceToZero = RoutingService.calculateHaversineDistance(
          { lat, lng },
          SE_CATHEDRAL_COORDS
        );
        if (distanceToZero <= MARCO_ZERO_RADIUS_METERS) {
          errors.push({
            field: "location",
            message: "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé.",
          });
        }
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const updated = await marketService.updateMarket(numId, {
        name,
        latitude: lat,
        longitude: lng,
      });

      return res.status(200).json(success(updated));
    } catch (e) {
      next(e);
    }
  }

  async deleteMarket(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);
      if (!id || isNaN(numId) || numId <= 0) {
        throw new ValidationError([{ field: "id", message: "ID do mercado inválido." }]);
      }

      const result = await marketService.deleteMarket(numId);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async reallocateMarkets(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const result = await marketService.reallocateMarkets();
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }
}

export const marketController = new MarketControllerClass();
