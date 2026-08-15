import { ProductRepository } from "@/shared/database/repositories/product.repository";
import type { ProductInfo } from "@/shared/types/product";
import type * as Services from "@/shared/types/services";
import { ConflictError, NotFoundError } from "@/shared/errors/errors";

class ProductServiceClass {
  async listProducts(filter?: Services.ProductFilter): Promise<Services.Product[]> {
    return ProductRepository.getAllProducts(filter);
  }

  async getProductById(id: number): Promise<Services.Product> {
    const product = await ProductRepository.getProductById(id);
    if (!product) {
      throw new NotFoundError("Produto não encontrado.");
    }
    return product;
  }

  async getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
    try {
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

      const data = await ProductRepository.getProductFromOpenFoodFacts(barcode);
      
      if (!data || data.status === 0) {
        return null;
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
      if (error instanceof NotFoundError) throw error;
      console.error("Erro no ProductServiceClass:", error);
      throw new Error("Não foi possível buscar as informações do produto.");
    }
  }

  async createProduct(data: Services.CreateProduct): Promise<Services.Product> {
    if (data.ean && data.ean.trim().length > 0) {
      const existing = await ProductRepository.getProductByEan(data.ean.trim());
      if (existing) {
        throw new ConflictError("Produto com este código de barras (EAN) já existe.");
      }
    }

    const created = await ProductRepository.createProduct({
      name: data.name,
      ean: data.ean?.trim() || null,
      ncm: data.ncm?.trim() || null,
      description: data.description?.trim() || "",
      icon: data.icon?.trim() || "",
    });

    if (!created) {
      throw new Error("Erro ao criar produto no banco de dados.");
    }

    return created;
  }

  async createCustomProduct(data: { name: string; category?: string; icon?: string; ean?: string }): Promise<ProductInfo> {
    const internalEan = data.ean || `INT-${Date.now()}`;
    
    const existing = await ProductRepository.getProductByEan(internalEan);
    if (existing) {
      throw new ConflictError("Produto com este EAN já existe.");
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

  async updateProduct(id: number, data: Services.UpdateProduct): Promise<Services.Product> {
    const existing = await ProductRepository.getProductById(id);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado.");
    }

    if (data.ean && data.ean.trim() !== existing.ean) {
      const withEan = await ProductRepository.getProductByEan(data.ean.trim());
      if (withEan && withEan.id !== id) {
        throw new ConflictError("Outro produto já possui este código de barras (EAN).");
      }
    }

    const updated = await ProductRepository.updateProduct(id, {
      ...data,
      ...(data.ean !== undefined ? { ean: data.ean ? data.ean.trim() : null } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.ncm !== undefined ? { ncm: data.ncm ? data.ncm.trim() : null } : {}),
      ...(data.description !== undefined ? { description: data.description ? data.description.trim() : "" } : {}),
      ...(data.icon !== undefined ? { icon: data.icon ? data.icon.trim() : "" } : {}),
    });

    if (!updated) {
      throw new NotFoundError("Produto não encontrado.");
    }

    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const existing = await ProductRepository.getProductById(id);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado.");
    }

    const deleted = await ProductRepository.deleteProduct(id);
    return !!deleted;
  }
}

export const productService = new ProductServiceClass();

