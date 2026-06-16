import { db } from "@/shared/database/database";
import * as schema from "@/shared/database/schema";
import { eq, sql } from "drizzle-orm";

const Product = schema.product;

export interface ProductDetails {
  id: number;
  name: string;
  ean: string | null;
  description: string | null;
  icon: string | null;
  tags: string | null;
  createdAt: string;
}

export interface OfferInfo {
  ocurrency_id: number;
  price: string;
  market_id: number;
  market_name: string;
  distance_m: number | null;
  created_at: string;
}

/**
 * Creates a new product in the database.
 */
export async function createProduct(product: {
  name: string;
  ean?: string;
  ncm?: string;
  description?: string;
  icon?: string;
  tags?: string;
}) {
  const results = await db.insert(Product).values(product).returning();
  return results[0];
}

/**
 * Finds a product by its exact EAN barcode.
 */
export async function getProductByEan(ean: string) {
  const results = await db.select().from(Product).where(eq(Product.ean, ean));
  return results[0] || null;
}

/**
 * Finds a product by its ID.
 */
export async function getProductById(id: number): Promise<ProductDetails | null> {
  const results = await db.select().from(Product).where(eq(Product.id, id));
  return results[0] || null;
}

/**
 * Retrieves all valid price occurrences for a product, showing market details and optional distances.
 */
export async function getProductOffers(
  productId: number,
  lat?: number,
  lng?: number,
): Promise<OfferInfo[]> {
  const hasCoords = lat !== undefined && lng !== undefined;

  if (hasCoords) {
    const wktPoint = `POINT(${lng} ${lat})`;
    const results = await db.execute(sql`
      SELECT 
        o.id AS ocurrency_id,
        o.value AS price,
        m.id AS market_id,
        m.name AS market_name,
        ST_Distance(m.location, ST_GeographyFromText(${wktPoint})) AS distance_m,
        o.created_at AS created_at
      FROM ocurrency o
      JOIN market m ON o.market_id = m.id
      WHERE o.product_id = ${productId}
        AND o.is_suspended = false
        AND o.trust_flag = true
      ORDER BY o.value ASC, o.created_at DESC
    `);
    return results.rows as unknown as OfferInfo[];
  } else {
    const results = await db.execute(sql`
      SELECT 
        o.id AS ocurrency_id,
        o.value AS price,
        m.id AS market_id,
        m.name AS market_name,
        CAST(NULL AS double precision) AS distance_m,
        o.created_at AS created_at
      FROM ocurrency o
      JOIN market m ON o.market_id = m.id
      WHERE o.product_id = ${productId}
        AND o.is_suspended = false
        AND o.trust_flag = true
      ORDER BY o.value ASC, o.created_at DESC
    `);
    return results.rows as unknown as OfferInfo[];
  }
}

/**
 * Searches the product catalog using fuzzy search (pg_trgm) or exact EAN match,
 * including best local price and market name within a geographical radius if coordinates are provided.
 */
export async function searchProducts(
  query: string,
  lat?: number,
  lng?: number,
  radius: number = 5000,
  limit: number = 20,
) {
  const hasCoords = lat !== undefined && lng !== undefined;

  if (hasCoords) {
    const wktPoint = `POINT(${lng} ${lat})`;
    const results = await db.execute(sql`
      WITH matched_products AS (
        SELECT 
          p.id,
          p.name,
          p.ean,
          p.icon,
          p.description,
          p.tags,
          (
            COALESCE(similarity(p.name, ${query}), 0) * 0.6 + 
            COALESCE(similarity(COALESCE(p.tags, ''), ${query}), 0) * 0.4
          ) AS relevance
        FROM product p
        WHERE similarity(p.name, ${query}) > 0.1
           OR similarity(COALESCE(p.tags, ''), ${query}) > 0.1
           OR p.ean = ${query}
           OR p.tags ILIKE ${'%' + query + '%'}
           OR p.name ILIKE ${'%' + query + '%'}
        ORDER BY relevance DESC
        LIMIT ${limit}
      )
      SELECT 
        mp.id,
        mp.name,
        mp.ean,
        mp.icon,
        mp.description,
        mp.tags,
        o_best.value AS best_price,
        o_best.market_name,
        o_best.distance_m,
        COALESCE(o_stats.occurrences_count, 0) AS occurrences_count,
        COALESCE(o_stats.total_upvotes, 0) AS total_upvotes,
        (
          mp.relevance * 100 + 
          COALESCE(o_stats.occurrences_count, 0) * 10 + 
          COALESCE(o_stats.total_upvotes, 0)
        ) AS final_rank
      FROM matched_products mp
      LEFT JOIN LATERAL (
        SELECT 
          o.value,
          m.name AS market_name,
          ST_Distance(m.location, ST_GeographyFromText(${wktPoint})) AS distance_m
        FROM ocurrency o
        JOIN market m ON o.market_id = m.id
        WHERE o.product_id = mp.id 
          AND o.is_suspended = false 
          AND o.trust_flag = true
          AND ST_DWithin(m.location, ST_GeographyFromText(${wktPoint}), ${radius})
        ORDER BY o.value ASC
        LIMIT 1
      ) o_best ON true
      LEFT JOIN (
        SELECT 
          product_id,
          CAST(COUNT(*) AS integer) AS occurrences_count,
          CAST(COALESCE(SUM(upvote_count), 0) AS integer) AS total_upvotes
        FROM ocurrency
        WHERE is_suspended = false
        GROUP BY product_id
      ) o_stats ON o_stats.product_id = mp.id
      ORDER BY final_rank DESC
    `);
    return results.rows as unknown as any[];
  } else {
    const results = await db.execute(sql`
      WITH matched_products AS (
        SELECT 
          p.id,
          p.name,
          p.ean,
          p.icon,
          p.description,
          p.tags,
          (
            COALESCE(similarity(p.name, ${query}), 0) * 0.6 + 
            COALESCE(similarity(COALESCE(p.tags, ''), ${query}), 0) * 0.4
          ) AS relevance
        FROM product p
        WHERE similarity(p.name, ${query}) > 0.1
           OR similarity(COALESCE(p.tags, ''), ${query}) > 0.1
           OR p.ean = ${query}
           OR p.tags ILIKE ${'%' + query + '%'}
           OR p.name ILIKE ${'%' + query + '%'}
        ORDER BY relevance DESC
        LIMIT ${limit}
      )
      SELECT 
        mp.id,
        mp.name,
        mp.ean,
        mp.icon,
        mp.description,
        mp.tags,
        o_best.value AS best_price,
        o_best.market_name,
        CAST(NULL AS double precision) AS distance_m,
        COALESCE(o_stats.occurrences_count, 0) AS occurrences_count,
        COALESCE(o_stats.total_upvotes, 0) AS total_upvotes,
        (
          mp.relevance * 100 + 
          COALESCE(o_stats.occurrences_count, 0) * 10 + 
          COALESCE(o_stats.total_upvotes, 0)
        ) AS final_rank
      FROM matched_products mp
      LEFT JOIN LATERAL (
        SELECT 
          o.value,
          m.name AS market_name
        FROM ocurrency o
        JOIN market m ON o.market_id = m.id
        WHERE o.product_id = mp.id 
          AND o.is_suspended = false 
          AND o.trust_flag = true
        ORDER BY o.value ASC
        LIMIT 1
      ) o_best ON true
      LEFT JOIN (
        SELECT 
          product_id,
          CAST(COUNT(*) AS integer) AS occurrences_count,
          CAST(COALESCE(SUM(upvote_count), 0) AS integer) AS total_upvotes
        FROM ocurrency
        WHERE is_suspended = false
        GROUP BY product_id
      ) o_stats ON o_stats.product_id = mp.id
      ORDER BY final_rank DESC
    `);
    return results.rows as unknown as any[];
  }
}
