import type { OpenFoodFactsResponse } from "@/shared/types/product";
import { db } from "../database";
import { product } from "../schema";
import { eq } from "drizzle-orm";

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

  async createProduct(data: {
    ean: string;
    name: string;
    description?: string;
    icon?: string;
  }) {
    const result = await db.insert(product).values({
      ean: data.ean,
      name: data.name,
      description: data.description || "",
      icon: data.icon || "",
    }).returning();
    return result[0];
  }
}

export const ProductRepository = new ProductRepositoryClass();
