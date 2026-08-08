import type { OpenFoodFactsResponse } from "@/shared/types/product";

class ProductRepositoryClass {
  async getProductFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse | null> {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      throw new Error(`Erro ao acessar a API externa: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as OpenFoodFactsResponse;
    return data;
  }
}

export const ProductRepository = new ProductRepositoryClass();
