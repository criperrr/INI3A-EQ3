import type { OpenFoodFactsResponse } from "@/shared/types/product";
import type * as Repositories from "@/shared/types/repositories";
import { db } from "../database";
import { product } from "../schema";
import { eq, ilike, or, desc } from "drizzle-orm";

class ProductRepositoryClass {
  async getProductFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse | null> {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      throw new Error(`Erro ao acessar a API externa: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as OpenFoodFactsResponse;
    return data;
  }

  async getAllProducts(options?: Repositories.ProductFilter): Promise<Repositories.Product[]> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    if (options?.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      return db
        .select()
        .from(product)
        .where(
          or(
            ilike(product.name, term),
            ilike(product.description, term),
            eq(product.ean, options.search.trim())
          )
        )
        .orderBy(desc(product.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return db
      .select()
      .from(product)
      .orderBy(desc(product.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getProductById(id: number): Promise<Repositories.Product | null> {
    const result = await db.select().from(product).where(eq(product.id, id)).limit(1);
    return result[0] || null;
  }

  async getProductByEan(ean: string): Promise<Repositories.Product | null> {
    const result = await db.select().from(product).where(eq(product.ean, ean)).limit(1);
    return result[0] || null;
  }

  async createProduct(data: Repositories.CreateProduct): Promise<Repositories.Product> {
    const result = await db
      .insert(product)
      .values({
        ean: data.ean ?? null,
        ncm: data.ncm ?? null,
        name: data.name,
        description: data.description ?? "",
        icon: data.icon ?? "",
      })
      .returning();
    if (!result[0]) {
      throw new Error("Erro ao criar produto no banco de dados.");
    }
    return result[0];
  }

  async updateProduct(id: number, data: Repositories.UpdateProduct): Promise<Repositories.Product | null> {
    const updateValues: Record<string, unknown> = {};

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.ean !== undefined) updateValues.ean = data.ean;
    if (data.ncm !== undefined) updateValues.ncm = data.ncm;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.icon !== undefined) updateValues.icon = data.icon;

    const result = await db
      .update(product)
      .set(updateValues)
      .where(eq(product.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteProduct(id: number): Promise<Repositories.Product | null> {
    const result = await db
      .delete(product)
      .where(eq(product.id, id))
      .returning();
    return result[0] || null;
  }
}

export const ProductRepository = new ProductRepositoryClass();

