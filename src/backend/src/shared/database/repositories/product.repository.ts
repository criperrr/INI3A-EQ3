import type { CreateProductDTO, OpenFoodFactsResponse, PriceHistoryItem, UpdateProductDTO } from "@/shared/types/product";
import { db } from "../database";
import { market, ocurrency, product } from "../schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

class ProductRepositoryClass {
  async getProductFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse | null> {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      throw new Error(`Erro ao acessar a API externa: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as OpenFoodFactsResponse;
    return data;
  }

  async getProductByEan(ean: string) {
    const result = await db.select().from(product).where(eq(product.ean, ean)).limit(1);
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
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(product.name, term), ilike(product.ean, term)));
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
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(product.name, term), ilike(product.ean, term)));
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
    const result = await db.insert(product).values({
      ean: data.ean || null,
      ncm: data.ncm || null,
      name: data.name,
      description: data.description || data.category || "",
      icon: data.icon || "",
    }).returning();
    return result[0];
  }

  async updateProduct(id: number, data: UpdateProductDTO) {
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
    const res = await db.delete(product).where(eq(product.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  async getCategories(): Promise<string[]> {
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
    return Array.from(categoriesSet);
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

