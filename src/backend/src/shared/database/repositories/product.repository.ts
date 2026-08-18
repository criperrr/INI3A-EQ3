import type { CreateProductDTO, OpenFoodFactsResponse, PriceHistoryItem, UpdateProductDTO } from "@/shared/types/product";
import { db } from "../database";
import { market, ocurrency, product } from "../schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

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
    sortBy?: "name" | "createdAt" | "id" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
  }) {
    const { search, category, limit = 20, offset = 0, sortBy = "id", sortOrder = "desc" } = params;

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
      conditions.push(ilike(product.description, `%${category.trim()}%`));
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

  async countProducts(params: { search?: string | undefined; category?: string | undefined }): Promise<number> {
    const { search, category } = params;
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
      conditions.push(ilike(product.description, `%${category.trim()}%`));
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

    const categoriesSet = new Set<string>();
    for (const r of rows) {
      if (r.category) {
        const parts = r.category.split(",");
        for (const p of parts) {
          const trimmed = p.trim();
          if (trimmed && trimmed !== "Categoria Indisponível") {
            categoriesSet.add(trimmed);
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

  async getPriceHistory(productId: number, limit: number = 15): Promise<PriceHistoryItem[]> {
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
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)))
      .orderBy(asc(ocurrency.createdAt))
      .limit(limit);

    return res.map((r) => {
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

