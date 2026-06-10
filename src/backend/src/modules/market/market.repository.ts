import { db } from "@/shared/database/database";
import * as schema from "@/shared/database/schema";
import type {
  CreateMarketDTO,
  Point,
  UpdateMarketDTO,
} from "@/shared/types/database";
import { eq, sql } from "drizzle-orm";

const Market = schema.market;

export async function createMarket(market: CreateMarketDTO) {
  return db
    .insert(Market)
    .values(market)
    .returning({
      id: Market.id,
      name: Market.name,
      location: sql`${Market.location}`,
    });
}

export async function updateMarket(
  id: string | number,
  market: UpdateMarketDTO,
) {
  return db
    .update(Market)
    .set(market)
    .returning({
      name: Market.name,
      email: Market.id,
    })
    .where(eq(Market.id, Number(id)));
}

export async function deleteMarket(id: string | number) {
  return (await db.delete(Market).where(eq(Market.id, Number(id)))).rowCount;
}

export async function getMarket(id: string | number) {
  return db
    .select({
      id: Market.id,
      name: Market.name,
      location: sql`${Market.location}`,
    })
    .from(Market)
    .where(eq(Market.id, Number(id)));
}

export async function getAllMarkets() {
  return db
    .select({
      id: Market.id,
      name: Market.name,
      location: sql`${Market.location}`,
    })
    .from(Market);
}

export async function getRadiusLocationMarkets(coord: Point, radius: number) {
  return db
    .select({
      id: Market.id,
      name: Market.name,
      location: sql`${Market.location}`,
    })
    .from(Market).where(sql`
      ST_DWithin(
      ST_SetSRID(${coord}, 4326),
      ST_SetSRID(${Market.location}, 4326),
      ${radius}
      )
      `);
}
