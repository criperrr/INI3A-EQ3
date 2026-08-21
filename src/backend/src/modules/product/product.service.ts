import { ProductRepository } from "@/shared/database/repositories/product.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/errors";
import type {
  CreateProductDTO,
  PaginatedProductsResult,
  PriceHistoryItem,
  ProductDetailDTO,
  ProductDTO,
  SearchProductsQuery,
  UpdateProductDTO,
} from "@/shared/types/product";

class ProductServiceClass {
  private formatProductDTO(raw: any, latestPrice?: string | null): ProductDTO {
    const category = raw.description || "Sem Categoria";
    return {
      id: raw.id,
      barcode: raw.ean || `ID-${raw.id}`,
      ean: raw.ean || null,
      ncm: raw.ncm || null,
      name: raw.name,
      description: raw.description || "",
      category,
      imageUri: raw.icon || null,
      icon: raw.icon || null,
      createdAt: raw.createdAt || new Date().toISOString(),
      lastPrice: latestPrice || "Preço não informado",
    };
  }

  async getProductByBarcode(barcode: string): Promise<ProductDTO | null> {
    const cleanBarcode = barcode?.trim();
    if (!cleanBarcode) return null;

    const localProduct = await ProductRepository.getProductByEan(cleanBarcode);
    if (localProduct) {
      const latestPrice = await ProductRepository.getLatestPriceForProduct(localProduct.id);
      const stats = await ProductRepository.getPriceStats(localProduct.id);
      const dto = this.formatProductDTO(localProduct, latestPrice);
      return {
        ...dto,
        minPrice: stats.minPrice,
        maxPrice: stats.maxPrice,
        avgPrice: stats.avgPrice,
        occurrencesCount: stats.count,
      };
    }

    try {
      const data = await ProductRepository.getProductFromOpenFoodFacts(cleanBarcode);
      if (!data || data.status === 0 || !data.product) {
        return null;
      }

      const productData = data.product;
      const rawName = (
        productData.product_name_pt ||
        productData.product_name ||
        productData.generic_name_pt ||
        productData.generic_name ||
        productData.product_name_en ||
        ""
      ).trim();

      const genericDesc = (
        productData.generic_name_pt ||
        productData.generic_name ||
        ""
      ).trim();

      const brand = (productData.brands || "").split(",")[0]?.trim();
      let finalName = rawName;
      if (brand && (!finalName || !finalName.toLowerCase().includes(brand.toLowerCase()))) {
        finalName = finalName ? `${brand} ${finalName}` : brand;
      }
      if (genericDesc && finalName && !finalName.toLowerCase().includes(genericDesc.toLowerCase()) && finalName.length < 35) {
        finalName = `${finalName} - ${genericDesc}`;
      }
      if (!finalName) {
        finalName = "Produto sem nome";
      }

      const safeName = finalName.slice(0, 195);
      const category = (
        productData.categories_tags?.[0]?.replace(/^[a-z]{2}:/, "") ||
        productData.categories?.split(",")[0]?.trim() ||
        "Geral"
      ).slice(0, 100);
      const imageUri = productData.image_url || productData.image_front_url || productData.image_small_url || "";

      let createdProduct = null;
      try {
        createdProduct = await ProductRepository.createProduct({
          ean: cleanBarcode,
          name: safeName,
          description: category,
          icon: imageUri,
        });
      } catch (saveErr) {
        console.warn("[ProductService] Could not persist external product:", saveErr);
        createdProduct = await ProductRepository.getProductByEan(cleanBarcode);
      }

      if (createdProduct) {
        return this.formatProductDTO(createdProduct, null);
      }

      return {
        id: 0,
        barcode: cleanBarcode,
        ean: cleanBarcode,
        ncm: null,
        name: safeName,
        description: category,
        category,
        imageUri: imageUri || null,
        icon: imageUri || null,
        createdAt: new Date().toISOString(),
        lastPrice: "Preço não informado",
      };
    } catch (err) {
      console.warn("[ProductService] OpenFoodFacts search error:", err);
      return null;
    }
  }

  async getProductById(id: number): Promise<ProductDetailDTO> {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError([{ field: "id", message: "ID do produto inválido." }]);
    }

    const localProduct = await ProductRepository.getProductById(id);
    if (!localProduct) {
      throw new NotFoundError("Produto não encontrado.");
    }

    const [latestPrice, stats, priceHistory] = await Promise.all([
      ProductRepository.getLatestPriceForProduct(id),
      ProductRepository.getPriceStats(id),
      ProductRepository.getPriceHistory(id),
    ]);

    const dto = this.formatProductDTO(localProduct, latestPrice);

    return {
      ...dto,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      avgPrice: stats.avgPrice,
      occurrencesCount: stats.count,
      priceHistory,
    };
  }

  async listProducts(query: SearchProductsQuery): Promise<PaginatedProductsResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductRepository.searchProducts({
        search: query.search,
        category: query.category,
        limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      ProductRepository.countProducts({
        search: query.search,
        category: query.category,
      }),
    ]);

    const productIds = items.map((item) => item.id);
    const priceMap = await ProductRepository.getLatestPricesForProductIds(productIds);

    const formattedItems: ProductDTO[] = items.map((item) => {
      const latestPrice = priceMap.get(item.id) || null;
      return this.formatProductDTO(item, latestPrice);
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createCustomProduct(data: CreateProductDTO): Promise<ProductDTO> {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new ValidationError([{ field: "name", message: "O nome do produto é obrigatório." }]);
    }

    const trimmedEan = data.ean?.trim();
    if (trimmedEan) {
      const existing = await ProductRepository.getProductByEan(trimmedEan);
      if (existing) {
        throw new ConflictError("Já existe um produto cadastrado com este código de barras (EAN).");
      }
    }

    const created = await ProductRepository.createProduct({
      ean: trimmedEan || undefined,
      ncm: data.ncm?.trim() || undefined,
      name: data.name.trim(),
      description: data.description?.trim() || data.category?.trim() || "",
      icon: data.icon?.trim() || "",
    });

    if (!created) {
      throw new Error("Erro ao salvar produto no banco de dados.");
    }

    return this.formatProductDTO(created, null);
  }

  async updateProduct(id: number, data: UpdateProductDTO): Promise<ProductDTO> {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError([{ field: "id", message: "ID do produto inválido." }]);
    }

    const existing = await ProductRepository.getProductById(id);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado para atualização.");
    }

    const trimmedEan = data.ean?.trim();
    if (trimmedEan && trimmedEan !== existing.ean) {
      const conflict = await ProductRepository.getProductByEan(trimmedEan);
      if (conflict && conflict.id !== id) {
        throw new ConflictError("Já existe outro produto cadastrado com este código de barras (EAN).");
      }
    }

    const updated = await ProductRepository.updateProduct(id, {
      name: data.name?.trim(),
      ean: trimmedEan !== undefined ? trimmedEan || "" : undefined,
      ncm: data.ncm?.trim(),
      description: data.description?.trim() || data.category?.trim(),
      icon: data.icon?.trim(),
    });

    if (!updated) {
      throw new Error("Erro ao atualizar o produto no banco de dados.");
    }

    const latestPrice = await ProductRepository.getLatestPriceForProduct(id);
    return this.formatProductDTO(updated, latestPrice);
  }

  async deleteProduct(id: number): Promise<boolean> {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError([{ field: "id", message: "ID do produto inválido." }]);
    }

    const existing = await ProductRepository.getProductById(id);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado para exclusão.");
    }

    return ProductRepository.deleteProduct(id);
  }

  async getCategories(): Promise<string[]> {
    return ProductRepository.getCategories();
  }

  async getPriceHistory(productId: number, period?: string, limit: number = 15): Promise<PriceHistoryItem[]> {
    if (!productId || isNaN(productId) || productId <= 0) {
      throw new ValidationError([{ field: "productId", message: "ID do produto inválido." }]);
    }

    let since: Date | undefined;
    const now = new Date();
    const cleanPeriod = period?.toLowerCase();

    if (cleanPeriod === "7d" || cleanPeriod === "7") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (cleanPeriod === "1m" || cleanPeriod === "30d" || cleanPeriod === "30") {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (cleanPeriod === "6m" || cleanPeriod === "180d" || cleanPeriod === "180") {
      since = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    } else if (cleanPeriod === "1y" || cleanPeriod === "1a" || cleanPeriod === "365d" || cleanPeriod === "365") {
      since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const safeLimit = Math.min(Math.max(1, limit || 15), 15);
    return ProductRepository.getPriceHistory(productId, safeLimit, since);
  }
}

export const productService = new ProductServiceClass();

