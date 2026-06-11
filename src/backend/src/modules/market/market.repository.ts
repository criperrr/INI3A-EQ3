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
      location: sql`ST_AsGeoJson(${Market.location})`,
    });
}

export async function updateMarket(id: number | string,
  market: UpdateMarketDTO
) {
  return db
    .update(Market)
    .set(market)
    .returning({
      id: Market.id,
      name: Market.name,
      location: sql`ST_AsGeoJSON(${Market.location})`,
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
      location: sql`ST_AsGeoJSON(${Market.location})`,
    })
    .from(Market)
    .where(eq(Market.id, Number(id)));
}

export async function getAllMarkets() {
  return db
    .select({
      id: Market.id,
      name: Market.name,
      location: sql`ST_AsGeoJSON(${Market.location})`,
    })
    .from(Market);
}

export async function getMarketsByRadius(coord: Point, radius: number) {
  const wktPoint = `POINT(${coord.lng} ${coord.lat})`;

  return db
    .select({
      id: Market.id,
      name: Market.name,
      location: sql`ST_AsGeoJson(${Market.location})`,
    })
    .from(Market).where(sql`
      ST_DWithin(
      ${Market.location},
      ST_GeographyFromText(${wktPoint}),
      ${radius}
      )
      `);
}
