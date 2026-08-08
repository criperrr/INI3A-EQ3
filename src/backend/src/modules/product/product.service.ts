import { ProductRepository } from "@/shared/database/repositories/product.repository";
import type { ProductInfo } from "@/shared/types/product";

class ProductServiceClass {
  async getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
    try {
      const data = await ProductRepository.getProductFromOpenFoodFacts(barcode);
      
      if (!data || data.status === 0) {
        return null; // Produto não encontrado
      }
      
      const product = data.product;
      
      return {
        barcode: barcode,
        name: product.product_name || product.product_name_pt || "Produto sem nome",
        category: product.categories?.split(",")[0]?.trim() || "Categoria Indisponível",
        imageUri: product.image_url || product.image_front_url || null,
        lastPrice: "Preço não informado",
      };
    } catch (error) {
      console.error("Erro no ProductServiceClass:", error);
      throw new Error("Não foi possível buscar as informações do produto.");
    }
  }
}

export const productService = new ProductServiceClass();
