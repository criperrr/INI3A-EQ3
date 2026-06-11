import * as repository from './market.repository';
import { NotFound, ApiError, parseDatabaseError, BadRequest, DatabaseInternalError } from "@/shared/errors/errors";
import type { CreateMarketRequest, UpdateMarketRequest } from '@/shared/types/apiRequest';
import type { UpdateUserRequest } from "@/shared/types/apiResponse";
import type { Point } from "@/shared/types/database";

export async function createMarket(market: CreateMarketRequest) {
  try {
    return (await repository.createMarket(market))[0];
  }
  catch (e) {
    if (!(e instanceof ApiError)) throw e;
    throw new DatabaseInternalError('market was not created');
  }
}

export async function updateMarket(id:number | string, market: UpdateMarketRequest) {
  return (await repository.updateMarket(id,market))[0];
}

export async function deleteMarket(id: number | string) {
  return repository.deleteMarket(id);
}

export async function getMarket(id: number | string) {
  return (await repository.getMarket(id))[0]
}

export async function getAllMarkets() {
  return repository.getAllMarkets();
}

export async function getMarketsByRadius(coord: Point, radius: number) {
  if (radius < 0) throw new BadRequest('Invalid radius: radius < 0');
  return repository.getMarketsByRadius(coord, radius);
}