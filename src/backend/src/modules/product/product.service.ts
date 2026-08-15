import { ProductRepository } from "@/shared/database/repositories/product.repository";
import type { ProductInfo } from "@/shared/types/product";

class ProductServiceClass {
  async getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
    try {
      // Verifica no banco de dados local primeiro
      const localProduct = await ProductRepository.getProductByEan(barcode);
      if (localProduct) {
        return {
          barcode: localProduct.ean || barcode,
          name: localProduct.name,
          category: localProduct.description || "Categoria Indisponível",
          imageUri: localProduct.icon || null,
          lastPrice: "Preço não informado",
        };
      }

      // Se não encontrar, busca na API externa
      const data = await ProductRepository.getProductFromOpenFoodFacts(barcode);
      
      if (!data || data.status === 0) {
        return null; // Produto não encontrado
      }
      
      const productData = data.product;
      const productInfo: ProductInfo = {
        barcode: barcode,
        name: productData.product_name || productData.product_name_pt || "Produto sem nome",
        category: productData.categories?.split(",")[0]?.trim() || "Categoria Indisponível",
        imageUri: productData.image_url || productData.image_front_url || null,
        lastPrice: "Preço não informado",
      };

      // Persiste no banco de dados local para consultas futuras
      try {
        await ProductRepository.createProduct({
          ean: barcode,
          name: productInfo.name,
          description: productInfo.category,
          icon: productInfo.imageUri || "",
        });
      } catch (saveErr) {
        console.warn("ProductService: Não foi possível salvar produto externo no banco:", saveErr);
      }
      
      return productInfo;
    } catch (error) {
      console.error("Erro no ProductServiceClass:", error);
      throw new Error("Não foi possível buscar as informações do produto.");
    }
  }

  async createCustomProduct(data: { name: string; category?: string; icon?: string; ean?: string }): Promise<ProductInfo> {
    const internalEan = data.ean || `INT-${Date.now()}`;
    
    // Check if it already exists
    const existing = await ProductRepository.getProductByEan(internalEan);
    if (existing) {
      throw new Error("Produto com este EAN já existe.");
    }

    const created = await ProductRepository.createProduct({
      ean: internalEan,
      name: data.name,
      ...(data.category ? { description: data.category } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
    });

    if (!created) {
      throw new Error("Erro ao criar produto no banco de dados.");
    }

    return {
      barcode: created.ean || internalEan,
      name: created.name,
      category: created.description || "Sem Categoria",
      imageUri: created.icon || null,
      lastPrice: "Preço não informado",
    };
  }
}

export const productService = new ProductServiceClass();
