import type { Request, Response, NextFunction } from "express";
import * as service from "./market.service";
import { dispatchSuccess, SuccessCodes } from "@/shared/util/response.helper";
import { BadRequest } from "@/shared/errors/errors";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      throw new BadRequest("Market name and location are required.");
    }
    const result = await service.createMarket({ name, location });
    return dispatchSuccess(SuccessCodes.created, res, result);
  } catch (error) {
    return next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const result = await service.updateMarket(id, { name, location });
    return dispatchSuccess(SuccessCodes.ok, res, result);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await service.deleteMarket(id);
    return dispatchSuccess(SuccessCodes.ok, res, { deletedCount: result });
  } catch (error) {
    return next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new BadRequest("Market ID must be a valid number.");
    }
    const result = await service.getMarket(id);
    return dispatchSuccess(SuccessCodes.ok, res, result);
  } catch (error) {
    return next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const radius = req.query.radius ? Number(req.query.radius) : 5000;

    if (lat !== undefined && lng !== undefined) {
      if (isNaN(lat) || isNaN(lng)) {
        throw new BadRequest("Latitude and Longitude must be valid numbers.");
      }
      const results = await service.getMarketsByRadius({ lat, lng }, radius);
      return dispatchSuccess(SuccessCodes.ok, res, results);
    } else {
      const results = await service.getAllMarkets();
      return dispatchSuccess(SuccessCodes.ok, res, results);
    }
  } catch (error) {
    return next(error);
  }
}