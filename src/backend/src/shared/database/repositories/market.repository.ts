import { db } from "../database";
import * as schema from "../schema";
import type {
  CreateMarketDTO,
  Point,
  UpdateMarketDTO,
} from "../../types/database";
import { eq, sql } from "drizzle-orm";

const Market = schema.market;

class MarketRepositoryClass {
  async createMarket(market: CreateMarketDTO) {
    return db
      .insert(Market)
      .values(market)
      .returning({
        id: Market.id,
        name: Market.name,
        location: sql`ST_AsGeoJson(${Market.location})`,
      });
  }

  async updateMarket(id: number | string, market: UpdateMarketDTO) {
    return db
      .update(Market)
      .set(market)
      .returning({
        id: Market.id,
        name: Market.name,
        location: sql`ST_AsGeoJson(${Market.location})`,
      })
      .where(eq(Market.id, Number(id)));
  }

  async deleteMarket(id: string | number) {
    return (await db.delete(Market).where(eq(Market.id, Number(id)))).rowCount;
  }

  async getMarket(id: string | number) {
    return db
      .select({
        id: Market.id,
        name: Market.name,
        location: sql`ST_AsGeoJson(${Market.location})`,
      })
      .from(Market)
      .where(eq(Market.id, Number(id)));
  }

  async getAllMarkets(coord?: Point) {
    if (coord && coord.lat !== undefined && coord.lng !== undefined) {
      const wktPoint = `POINT(${coord.lng} ${coord.lat})`;
      return db
        .select({
          id: Market.id,
          name: Market.name,
          location: sql`ST_AsGeoJson(${Market.location})`,
          distance: sql<number>`ST_Distance(${Market.location}, ST_GeographyFromText(${wktPoint}))`,
        })
        .from(Market)
        .orderBy(sql`ST_Distance(${Market.location}, ST_GeographyFromText(${wktPoint})) ASC`);
    }

    return db
      .select({
        id: Market.id,
        name: Market.name,
        location: sql`ST_AsGeoJson(${Market.location})`,
      })
      .from(Market);
  }

  async getMarketsByRadius(coord: Point, radius: number) {
    const wktPoint = `POINT(${coord.lng} ${coord.lat})`;

    const within = await db
      .select({
        id: Market.id,
        name: Market.name,
        location: sql`ST_AsGeoJson(${Market.location})`,
        distance: sql<number>`ST_Distance(${Market.location}, ST_GeographyFromText(${wktPoint}))`,
      })
      .from(Market)
      .where(sql`
        ST_DWithin(
          ${Market.location},
          ST_GeographyFromText(${wktPoint}),
          ${radius}
        )
      `)
      .orderBy(sql`ST_Distance(${Market.location}, ST_GeographyFromText(${wktPoint})) ASC`);

    if (within.length > 0) {
      return within;
    }

    return this.getAllMarkets(coord);
  }
}

export const MarketRepository = new MarketRepositoryClass();
