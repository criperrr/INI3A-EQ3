import type { CreateProductDTO, OpenFoodFactsResponse, PriceHistoryItem, UpdateProductDTO } from "@/shared/types/product";
import { PREDEFINED_CATEGORY_NAMES, PREDEFINED_PRODUCT_CATEGORIES, findPredefinedCategory } from "@/shared/constants/productCategories";
import { db } from "../database";
import { market, ocurrency, product } from "../schema";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

class ProductRepositoryClass {
  private categoryCache: { data: string[]; expiry: number } | null = null;

  async getProductFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse | null> {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const digitsOnly = cleanBarcode.replace(/\D/g, "");
    const digitsWithoutZero = digitsOnly.replace(/^0+/, "");

    const codesToTry = Array.from(new Set([digitsOnly, digitsWithoutZero, cleanBarcode].filter(Boolean)));

    const urls: string[] = [];
    for (const code of codesToTry) {
      urls.push(
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://br.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openpetfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`
      );
    }

    const uniqueUrls = Array.from(new Set(urls));

    const fetchUrl = async (url: string): Promise<OpenFoodFactsResponse | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, {
          headers: {
            "User-Agent": "PrescoApp - Mobile/Backend - Version 1.0 (contato@presco.app)",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = (await response.json()) as OpenFoodFactsResponse;
        if (data && (data.status === 1 || (data as any).status_verbose === "product found") && data.product) {
          return data;
        }
        return null;
      } catch {
        return null;
      }
    };

    // Run parallel batches of 3 requests for fast response
    for (let i = 0; i < uniqueUrls.length; i += 3) {
      const batch = uniqueUrls.slice(i, i + 3);
      const results = await Promise.all(batch.map(fetchUrl));
      const found = results.find((r) => r !== null);
      if (found) return found;
    }

    return null;
  }

  async getProductByEan(ean: string) {
    if (!ean) return null;
    const cleanRaw = ean.trim();
    if (!cleanRaw) return null;

    const digitsOnly = cleanRaw.replace(/\D/g, "");
    const digitsWithoutZero = digitsOnly.replace(/^0+/, "");
    const pad12 = digitsWithoutZero ? digitsWithoutZero.padStart(12, "0") : "";
    const pad13 = digitsWithoutZero ? digitsWithoutZero.padStart(13, "0") : "";
    const pad14 = digitsWithoutZero ? digitsWithoutZero.padStart(14, "0") : "";

    const candidateValues = Array.from(
      new Set([cleanRaw, digitsOnly, digitsWithoutZero, pad12, pad13, pad14].filter(Boolean))
    );

    const conditions = candidateValues.map((val) => eq(product.ean, val));

    const result = await db
      .select()
      .from(product)
      .where(or(...conditions))
      .limit(1);

    return result[0] || null;
  }

  async getProductById(id: number) {
    const result = await db.select().from(product).where(eq(product.id, id)).limit(1);
    return result[0] || null;
  }

  async searchProducts(params: {
    search?: string | undefined;
    category?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    radius?: number | undefined;
    onlyPromotions?: boolean | undefined;
  }) {
    const {
      search,
      category,
      limit = 20,
      offset = 0,
      sortBy = "id",
      sortOrder = "desc",
      latitude,
      longitude,
      radius = 15000,
      onlyPromotions = false,
    } = params;

    // 1. Spatial Proximity Query when coordinates are provided
    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      const nearbyResults = await this.searchProductsNearby({
        latitude,
        longitude,
        radius,
        search,
        category,
        limit,
        offset,
        sortBy,
        sortOrder,
        onlyPromotions,
      });

      // If nearby items found, return them directly
      if (nearbyResults && nearbyResults.length > 0) {
        return nearbyResults;
      }
    }

    // 2. Standard Catalog Query Fallback (when no coordinates or no nearby occurrences found)
    const conditions = [];

    if (search && search.trim().length > 0) {
      const cleanSearch = search.trim();
      const term = `%${cleanSearch}%`;
      const digitsOnly = cleanSearch.replace(/\D/g, "");
      const digitsWithoutZero = digitsOnly.replace(/^0+/, "");
      const pad13 = digitsWithoutZero ? digitsWithoutZero.padStart(13, "0") : "";
      const pad14 = digitsWithoutZero ? digitsWithoutZero.padStart(14, "0") : "";

      const searchConditions = [
        ilike(product.name, term),
        ilike(product.ean, term),
        eq(product.ean, cleanSearch),
      ];

      if (digitsOnly) searchConditions.push(eq(product.ean, digitsOnly), ilike(product.ean, `%${digitsOnly}%`));
      if (digitsWithoutZero) searchConditions.push(eq(product.ean, digitsWithoutZero));
      if (pad13) searchConditions.push(eq(product.ean, pad13));
      if (pad14) searchConditions.push(eq(product.ean, pad14));

      conditions.push(or(...searchConditions));
    }

    if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchConditions = [
          ilike(product.description, `%${matched.name}%`),
          ilike(product.description, `%${matched.id}%`),
          ilike(product.description, `%${cleanCat}%`),
        ];
        if (matched.aliases) {
          for (const alias of matched.aliases) {
            matchConditions.push(ilike(product.description, `%${alias}%`));
          }
        }
        conditions.push(or(...matchConditions));
      } else {
        conditions.push(ilike(product.description, `%${cleanCat}%`));
      }
    }

    let query = db.select().from(product);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const sortCol = sortBy === "name" ? product.name : sortBy === "createdAt" ? product.createdAt : product.id;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const items = await query.orderBy(orderFn(sortCol)).limit(limit).offset(offset);
    return items;
  }

  async searchProductsNearby(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    search?: string | undefined;
    category?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    onlyPromotions?: boolean | undefined;
  }) {
    const {
      latitude,
      longitude,
      radius = 15000,
      search,
      category,
      limit = 20,
      offset = 0,
      sortBy = "id",
      sortOrder = "desc",
      onlyPromotions = false,
    } = params;

    const wktPoint = `POINT(${longitude} ${latitude})`;

    // Construct search & category SQL fragments safely
    const filterClauses: any[] = [sql`1=1`];

    if (search && search.trim().length > 0) {
      const cleanSearch = search.trim();
      const term = `%${cleanSearch}%`;
      filterClauses.push(sql`(p.name ILIKE ${term} OR p.ean ILIKE ${term} OR p.ean = ${cleanSearch})`);
    }

    if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchTerms = [matched.name, matched.id, cleanCat, ...(matched.aliases || [])];
        const subConditions = matchTerms.map(
          (t) => sql`p.description ILIKE ${`%${t}%`}`
        );
        filterClauses.push(sql`(${sql.join(subConditions, sql` OR `)})`);
      } else {
        filterClauses.push(sql`p.description ILIKE ${`%${cleanCat}%`}`);
      }
    }

    if (onlyPromotions) {
      filterClauses.push(sql`ps.is_promotion = TRUE`);
    }

    // Determine ordering clause
    let orderSql = sql`
      ps.is_promotion DESC,
      (ps.min_distance_meters IS NULL) ASC,
      ps.min_distance_meters ASC,
      p.id DESC
    `;

    if (sortBy === "distance") {
      orderSql = sortOrder === "asc"
        ? sql`(ps.min_distance_meters IS NULL) ASC, ps.min_distance_meters ASC, ps.min_price ASC`
        : sql`(ps.min_distance_meters IS NULL) ASC, ps.min_distance_meters DESC, ps.min_price ASC`;
    } else if (sortBy === "price") {
      orderSql = sortOrder === "asc"
        ? sql`(ps.min_price IS NULL) ASC, ps.min_price ASC, ps.min_distance_meters ASC`
        : sql`(ps.min_price IS NULL) ASC, ps.min_price DESC, ps.min_distance_meters ASC`;
    } else if (sortBy === "discount") {
      orderSql = sql`ps.discount_percentage DESC, ps.min_price ASC`;
    } else if (sortBy === "name") {
      orderSql = sortOrder === "asc" ? sql`p.name ASC` : sql`p.name DESC`;
    } else if (sortBy === "createdAt") {
      orderSql = sortOrder === "asc" ? sql`p.created_at ASC` : sql`p.created_at DESC`;
    }

    const query = sql`
      WITH product_stats AS (
        SELECT 
          p.id AS product_id,
          MIN(loc_occ.value::numeric) AS min_price,
          MAX(loc_occ.value::numeric) AS max_price,
          AVG(loc_occ.value::numeric) AS avg_price,
          COUNT(loc_occ.id)::int AS occurrences_count,
          MIN(ST_Distance(loc_occ.location, ST_GeographyFromText(${wktPoint}))) AS min_distance_meters,
          (
            SELECT m2.name 
            FROM ocurrency o2
            JOIN market m2 ON o2.market_id = m2.id
            WHERE o2.product_id = p.id 
              AND o2.is_suspended = false
              AND ST_DWithin(m2.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY ST_Distance(m2.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS nearest_market_name,
          (
            SELECT m3.name
            FROM ocurrency o3
            JOIN market m3 ON o3.market_id = m3.id
            WHERE o3.product_id = p.id
              AND o3.is_suspended = false
              AND ST_DWithin(m3.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY o3.value::numeric ASC, ST_Distance(m3.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS best_market_name,
          CASE 
            WHEN AVG(loc_occ.value::numeric) > MIN(loc_occ.value::numeric) * 1.04 THEN ROUND(((AVG(loc_occ.value::numeric) - MIN(loc_occ.value::numeric)) / AVG(loc_occ.value::numeric)) * 100)::int
            ELSE 0 
          END AS discount_percentage,
          CASE 
            WHEN (AVG(loc_occ.value::numeric) >= MIN(loc_occ.value::numeric) * 1.05 AND COUNT(loc_occ.id) >= 1) THEN TRUE
            ELSE FALSE
          END AS is_promotion
        FROM product p
        LEFT JOIN (
          SELECT o.id, o.product_id, o.value, m.location
          FROM ocurrency o
          JOIN market m ON o.market_id = m.id
          WHERE o.is_suspended = false
            AND ST_DWithin(m.location, ST_GeographyFromText(${wktPoint}), ${radius})
        ) loc_occ ON loc_occ.product_id = p.id
        GROUP BY p.id
      )
      SELECT 
        p.id,
        p.ean,
        p.ncm,
        p.name,
        p.description,
        p.icon,
        p.created_at AS "createdAt",
        ps.min_price AS "minPriceNumeric",
        ps.max_price AS "maxPriceNumeric",
        ps.avg_price AS "avgPriceNumeric",
        ps.occurrences_count AS "occurrencesCount",
        ps.min_distance_meters AS "nearestMarketDistance",
        COALESCE(ps.best_market_name, ps.nearest_market_name) AS "nearestMarketName",
        ps.discount_percentage AS "discountPercentage",
        ps.is_promotion AS "isPromotion"
      FROM product p
      LEFT JOIN product_stats ps ON ps.product_id = p.id
      WHERE ${sql.join(filterClauses, sql` AND `)}
      ORDER BY ${orderSql}
      LIMIT ${limit} OFFSET ${offset}
    `;

    try {
      const result = await db.execute(query);
      const rows = (result.rows || result) as any[];
      return rows.map((row) => ({
        id: Number(row.id),
        ean: row.ean || null,
        ncm: row.ncm || null,
        name: String(row.name),
        description: row.description || null,
        icon: row.icon || null,
        createdAt: row.createdAt || new Date().toISOString(),
        minPriceNumeric: row.minPriceNumeric ? Number(row.minPriceNumeric) : null,
        maxPriceNumeric: row.maxPriceNumeric ? Number(row.maxPriceNumeric) : null,
        avgPriceNumeric: row.avgPriceNumeric ? Number(row.avgPriceNumeric) : null,
        occurrencesCount: Number(row.occurrencesCount || 0),
        nearestMarketDistance: row.nearestMarketDistance !== null && row.nearestMarketDistance !== undefined ? Math.round(Number(row.nearestMarketDistance)) : null,
        nearestMarketName: row.nearestMarketName ? String(row.nearestMarketName) : null,
        discountPercentage: row.discountPercentage ? Number(row.discountPercentage) : 0,
        isPromotion: Boolean(row.isPromotion),
      }));
    } catch (err) {
      console.warn("[ProductRepository] Erro ao executar busca espacial por proximidade:", err);
      return [];
    }
  }

  async countProducts(params: {
    search?: string | undefined;
    category?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    radius?: number | undefined;
    onlyPromotions?: boolean | undefined;
  }): Promise<number> {
    const { search, category, latitude, longitude, radius = 15000, onlyPromotions = false } = params;

    // If coordinates provided, count nearby matching products
    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      const wktPoint = `POINT(${longitude} ${latitude})`;
      const filterClauses: any[] = [sql`1=1`];

      if (search && search.trim().length > 0) {
        const cleanSearch = search.trim();
        const term = `%${cleanSearch}%`;
        filterClauses.push(sql`(p.name ILIKE ${term} OR p.ean ILIKE ${term} OR p.ean = ${cleanSearch})`);
      }

      if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
        const cleanCat = category.trim();
        const matched = findPredefinedCategory(cleanCat);
        if (matched) {
          const matchTerms = [matched.name, matched.id, cleanCat, ...(matched.aliases || [])];
          const subConditions = matchTerms.map(
            (t) => sql`p.description ILIKE ${`%${t}%`}`
          );
          filterClauses.push(sql`(${sql.join(subConditions, sql` OR `)})`);
        } else {
          filterClauses.push(sql`p.description ILIKE ${`%${cleanCat}%`}`);
        }
      }

      if (onlyPromotions) {
        filterClauses.push(sql`ps.is_promotion = TRUE`);
      }

      const countQuery = sql`
        WITH product_stats AS (
          SELECT 
            p.id AS product_id,
            MIN(loc_occ.value::numeric) AS min_price,
            AVG(loc_occ.value::numeric) AS avg_price,
            COUNT(loc_occ.id)::int AS occurrences_count,
            CASE 
              WHEN (AVG(loc_occ.value::numeric) >= MIN(loc_occ.value::numeric) * 1.05 AND COUNT(loc_occ.id) >= 1) THEN TRUE
              ELSE FALSE
            END AS is_promotion
          FROM product p
          LEFT JOIN (
            SELECT o.id, o.product_id, o.value, m.location
            FROM ocurrency o
            JOIN market m ON o.market_id = m.id
            WHERE o.is_suspended = false
              AND ST_DWithin(m.location, ST_GeographyFromText(${wktPoint}), ${radius})
          ) loc_occ ON loc_occ.product_id = p.id
          GROUP BY p.id
        )
        SELECT COUNT(DISTINCT p.id)::int AS count
        FROM product p
        LEFT JOIN product_stats ps ON ps.product_id = p.id
        WHERE ${sql.join(filterClauses, sql` AND `)}
      `;

      try {
        const res = await db.execute(countQuery);
        const rows = (res.rows || res) as any[];
        const count = Number(rows[0]?.count || 0);
        if (count > 0) return count;
      } catch (err) {
        console.warn("[ProductRepository] Erro ao contar produtos por proximidade:", err);
      }
    }

    // Standard count fallback
    const conditions = [];

    if (search && search.trim().length > 0) {
      const cleanSearch = search.trim();
      const term = `%${cleanSearch}%`;
      const digitsOnly = cleanSearch.replace(/\D/g, "");
      const digitsWithoutZero = digitsOnly.replace(/^0+/, "");
      const pad13 = digitsWithoutZero ? digitsWithoutZero.padStart(13, "0") : "";
      const pad14 = digitsWithoutZero ? digitsWithoutZero.padStart(14, "0") : "";

      const searchConditions = [
        ilike(product.name, term),
        ilike(product.ean, term),
        eq(product.ean, cleanSearch),
      ];

      if (digitsOnly) searchConditions.push(eq(product.ean, digitsOnly), ilike(product.ean, `%${digitsOnly}%`));
      if (digitsWithoutZero) searchConditions.push(eq(product.ean, digitsWithoutZero));
      if (pad13) searchConditions.push(eq(product.ean, pad13));
      if (pad14) searchConditions.push(eq(product.ean, pad14));

      conditions.push(or(...searchConditions));
    }

    if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchConditions = [
          ilike(product.description, `%${matched.name}%`),
          ilike(product.description, `%${matched.id}%`),
          ilike(product.description, `%${cleanCat}%`),
        ];
        if (matched.aliases) {
          for (const alias of matched.aliases) {
            matchConditions.push(ilike(product.description, `%${alias}%`));
          }
        }
        conditions.push(or(...matchConditions));
      } else {
        conditions.push(ilike(product.description, `%${cleanCat}%`));
      }
    }

    let query = db.select({ count: sql<number>`count(*)::int` }).from(product);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const res = await query;
    return Number(res[0]?.count || 0);
  }

  async createProduct(data: CreateProductDTO) {
    this.categoryCache = null;
    const safeName = data.name.trim().slice(0, 195);
    const safeDescription = (data.description || data.category || "").trim().slice(0, 250);

    const result = await db.insert(product).values({
      ean: data.ean?.trim() || null,
      ncm: data.ncm?.trim() || null,
      name: safeName,
      description: safeDescription,
      icon: data.icon?.trim() || "",
    }).returning();
    return result[0];
  }

  async updateProduct(id: number, data: UpdateProductDTO) {
    this.categoryCache = null;
    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.ean !== undefined) updatePayload.ean = data.ean;
    if (data.ncm !== undefined) updatePayload.ncm = data.ncm;
    if (data.description !== undefined || data.category !== undefined) {
      updatePayload.description = data.description ?? data.category;
    }
    if (data.icon !== undefined) updatePayload.icon = data.icon;

    const result = await db
      .update(product)
      .set(updatePayload)
      .where(eq(product.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteProduct(id: number) {
    this.categoryCache = null;
    const res = await db.delete(product).where(eq(product.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  async getPredefinedCategories() {
    return PREDEFINED_PRODUCT_CATEGORIES;
  }

  async getCategories(): Promise<string[]> {
    const now = Date.now();
    if (this.categoryCache && this.categoryCache.expiry > now) {
      return this.categoryCache.data;
    }

    const rows = await db
      .select({ category: product.description })
      .from(product)
      .where(sql`${product.description} IS NOT NULL AND ${product.description} != ''`)
      .groupBy(product.description);

    const categoriesSet = new Set<string>(PREDEFINED_CATEGORY_NAMES);
    for (const r of rows) {
      if (r.category) {
        const parts = r.category.split(",");
        for (const p of parts) {
          const trimmed = p.trim();
          if (
            trimmed &&
            trimmed !== "Categoria Indisponível" &&
            trimmed !== "Sem Categoria" &&
            trimmed !== "Geral"
          ) {
            const matched = findPredefinedCategory(trimmed);
            if (matched) {
              categoriesSet.add(matched.name);
            }
          }
        }
      }
    }
    const resultList = Array.from(categoriesSet);
    this.categoryCache = { data: resultList, expiry: now + 5 * 60 * 1000 };
    return resultList;
  }

  async getLatestPriceForProduct(productId: number): Promise<string | null> {
    const res = await db
      .select({ value: ocurrency.value })
      .from(ocurrency)
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)))
      .orderBy(desc(ocurrency.createdAt))
      .limit(1);

    if (!res[0] || !res[0].value) return null;
    const num = Number(res[0].value);
    return `R$ ${num.toFixed(2).replace(".", ",")}`;
  }

  async getLatestPricesForProductIds(productIds: number[]): Promise<Map<number, string>> {
    const priceMap = new Map<number, string>();
    if (!productIds || productIds.length === 0) return priceMap;

    const uniqueIds = Array.from(new Set(productIds.filter((id) => id > 0)));
    if (uniqueIds.length === 0) return priceMap;

    const rows = await db
      .select({
        productId: ocurrency.productId,
        value: ocurrency.value,
        createdAt: ocurrency.createdAt,
      })
      .from(ocurrency)
      .where(and(inArray(ocurrency.productId, uniqueIds), eq(ocurrency.isSuspended, false)))
      .orderBy(desc(ocurrency.createdAt));

    for (const row of rows) {
      if (row.productId && !priceMap.has(row.productId) && row.value) {
        const num = Number(row.value);
        priceMap.set(row.productId, `R$ ${num.toFixed(2).replace(".", ",")}`);
      }
    }

    return priceMap;
  }

  async getPriceStats(productId: number) {
    const res = await db
      .select({
        minPrice: sql<string | null>`min(${ocurrency.value})`,
        maxPrice: sql<string | null>`max(${ocurrency.value})`,
        avgPrice: sql<string | null>`avg(${ocurrency.value})`,
        count: sql<number>`count(*)::int`,
      })
      .from(ocurrency)
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)));

    const row = res[0];
    if (!row || !row.count) {
      return {
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        count: 0,
      };
    }

    return {
      minPrice: row.minPrice ? `R$ ${Number(row.minPrice).toFixed(2).replace(".", ",")}` : null,
      maxPrice: row.maxPrice ? `R$ ${Number(row.maxPrice).toFixed(2).replace(".", ",")}` : null,
      avgPrice: row.avgPrice ? `R$ ${Number(row.avgPrice).toFixed(2).replace(".", ",")}` : null,
      count: Number(row.count),
    };
  }

  async getPriceHistory(productId: number, limit: number = 15, since?: Date): Promise<PriceHistoryItem[]> {
    const conditions = [
      eq(ocurrency.productId, productId),
      eq(ocurrency.isSuspended, false),
    ];

    if (since) {
      conditions.push(gte(ocurrency.createdAt, since.toISOString()));
    }

    const res = await db
      .select({
        id: ocurrency.id,
        value: ocurrency.value,
        marketId: ocurrency.marketId,
        marketName: market.name,
        createdAt: ocurrency.createdAt,
      })
      .from(ocurrency)
      .leftJoin(market, eq(ocurrency.marketId, market.id))
      .where(and(...conditions))
      .orderBy(desc(ocurrency.createdAt))
      .limit(limit);

    // Sort ascending chronologically so the timeline flows left-to-right (past to present)
    const sorted = [...res].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((r) => {
      const numVal = Number(r.value);
      return {
        id: r.id,
        value: numVal,
        formattedValue: `R$ ${numVal.toFixed(2).replace(".", ",")}`,
        marketId: r.marketId,
        marketName: r.marketName || "Mercado não identificado",
        createdAt: r.createdAt,
      };
    });
  }
}

export const ProductRepository = new ProductRepositoryClass();

