import { ProductRepository } from "@/shared/database/repositories/product.repository";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { ConflictError, NotFoundError, ValidationError, UnauthorizedError } from "@/shared/errors/errors";
import { normalizeCategoryName } from "@/shared/constants/productCategories";
import { invalidateCachePattern } from "@/shared/middlewares/cacheMiddleware";
import { validateGs1Barcode } from "@/shared/util/barcodeValidator";
import type {
  CreateProductDTO,
  ExternalProductSource,
  PaginatedProductsResult,
  PendingProductAdminItem,
  PriceHistoryItem,
  ProductDetailDTO,
  ProductDTO,
  ProductExistenceValidationResult,
  SearchProductsQuery,
  UpdateProductDTO,
} from "@/shared/types/product";

export const PRODUCT_QUORUM_TARGET = 3;

function getSourceLabel(source: ExternalProductSource, store?: string): string {
  switch (source) {
    case "local_database":
      return "Base Local Presco";
    case "brazilian_retail_catalog":
      return store ? `Catálogo Varejista Nacional (${store})` : "Catálogo Varejista Nacional";
    case "openfoodfacts":
      return "OpenFoodFacts / OpenProducts (Licença Aberta)";
    case "upcitemdb":
      return "Base Global UPCitemdb";
    case "cosmos_official_api":
      return "Bluesoft Cosmos (API Oficial GTIN)";
    case "variable_weight_scale":
      return "Etiqueta de Balança / Peso Variável (PLU Local)";
    case "pending_review":
      return "Em Análise (Novo Código GS1)";
    default:
      return "Não identificado";
  }
}

function extractOpenFoodFactsImage(productData: any): string {
  if (!productData) return "";
  const uri =
    productData.image_front_url ||
    productData.image_url ||
    productData.image_front_small_url ||
    productData.image_small_url ||
    productData.selected_images?.front?.display?.pt ||
    productData.selected_images?.front?.display?.en ||
    productData.selected_images?.front?.small?.pt ||
    productData.selected_images?.front?.small?.en ||
    "";
  return typeof uri === "string" ? uri.trim() : "";
}

class ProductServiceClass {
  private formatProductDTO(raw: any, latestPrice?: string | null): ProductDTO {
    const rawDesc = (raw.description || "").trim();
    let categoriesList: string[] = [];
    if (rawDesc.includes(",")) {
      categoriesList = rawDesc
        .split(",")
        .map((p: string) => normalizeCategoryName(p.trim()))
        .filter((c: string, idx: number, arr: string[]) => c && arr.indexOf(c) === idx);
    } else if (rawDesc) {
      categoriesList = [normalizeCategoryName(rawDesc)];
    } else {
      categoriesList = ["Outros"];
    }
    const category = categoriesList[0] || "Outros";

    let formattedDistance: string | null = null;
    if (raw.nearestMarketDistance !== undefined && raw.nearestMarketDistance !== null) {
      const d = Number(raw.nearestMarketDistance);
      if (d < 1000) {
        formattedDistance = `${Math.round(d)} m`;
      } else {
        formattedDistance = `${(d / 1000).toFixed(1).replace(".", ",")} km`;
      }
    }

    const minPriceFormatted =
      raw.minPriceNumeric !== undefined && raw.minPriceNumeric !== null
        ? `R$ ${Number(raw.minPriceNumeric).toFixed(2).replace(".", ",")}`
        : null;

    const maxPriceFormatted =
      raw.maxPriceNumeric !== undefined && raw.maxPriceNumeric !== null
        ? `R$ ${Number(raw.maxPriceNumeric).toFixed(2).replace(".", ",")}`
        : null;

    const avgPriceFormatted =
      raw.avgPriceNumeric !== undefined && raw.avgPriceNumeric !== null
        ? `R$ ${Number(raw.avgPriceNumeric).toFixed(2).replace(".", ",")}`
        : null;

    const finalLastPrice = minPriceFormatted || latestPrice || "Preço não informado";

    let isoCreatedAt = new Date().toISOString();
    if (raw.createdAt) {
      const parsed = new Date(raw.createdAt);
      if (!isNaN(parsed.getTime())) {
        isoCreatedAt = parsed.toISOString();
      }
    }

    const occurrencesCount = raw.occurrencesCount !== undefined ? Number(raw.occurrencesCount) : undefined;
    const barcodeCheck = raw.ean ? validateGs1Barcode(raw.ean) : null;
    const isGs1Valid = Boolean(barcodeCheck?.isValid);
    const hasCatalogImage = Boolean(raw.icon && typeof raw.icon === "string" && raw.icon.trim().startsWith("http"));
    const isSuspended = Boolean(raw.isSuspended);

    let verificationStatus: ProductDTO["verificationStatus"] = "community_submitted";
    if (isSuspended) {
      verificationStatus = "pending_review";
    } else if (isGs1Valid && hasCatalogImage) {
      verificationStatus = "verified_catalog";
    } else if (isGs1Valid) {
      verificationStatus = "verified_gs1";
    } else if ((occurrencesCount ?? 0) >= 2) {
      verificationStatus = "community_verified";
    }

    return {
      id: raw.id,
      barcode: raw.ean || `ID-${raw.id}`,
      ean: raw.ean || null,
      ncm: raw.ncm || null,
      name: raw.name,
      description: raw.description || "",
      category,
      categories: categoriesList,
      brand: raw.brand || null,
      imageUri: raw.icon || null,
      icon: raw.icon || null,
      createdAt: isoCreatedAt,
      lastPrice: finalLastPrice,
      bestPrice: minPriceFormatted || finalLastPrice,
      minPrice: minPriceFormatted,
      maxPrice: maxPriceFormatted,
      avgPrice: avgPriceFormatted,
      occurrencesCount,
      nearestMarketName: raw.nearestMarketName || null,
      nearestMarketDistance: raw.nearestMarketDistance !== undefined ? raw.nearestMarketDistance : null,
      nearestMarketCoordinate: raw.nearestMarketCoordinate || null,
      formattedDistance,
      isPromotion: Boolean(raw.isPromotion),
      discountPercentage: raw.discountPercentage ? Number(raw.discountPercentage) : 0,
      isGs1Valid,
      isSuspended,
      pendingApproval: isSuspended,
      verificationStatus,
    };
  }

  async getProductByBarcode(barcode: string): Promise<ProductDTO | null> {
    const cleanBarcode = barcode?.trim();
    if (!cleanBarcode) return null;

    const localProduct = await ProductRepository.getProductByEan(cleanBarcode);
    if (localProduct) {
      if (localProduct.isSuspended) {
        return null;
      }
      // Whenever a scan occurs, query OpenFoodFacts to check if a new/updated photo is available
      try {
        const offData = await ProductRepository.getProductFromOpenFoodFacts(cleanBarcode);
        const productData = offData?.product;
        if (productData) {
          const offImageUri = extractOpenFoodFactsImage(productData);
          const currentIcon = (localProduct.icon || "").trim();

          // If OpenFoodFacts has a photo and it differs from local icon (or if local icon was missing)
          if (offImageUri && offImageUri !== currentIcon) {
            const updated = await ProductRepository.updateProduct(localProduct.id, {
              icon: offImageUri,
            });
            if (updated) {
              localProduct.icon = updated.icon;
              await invalidateCachePattern("products");
            }
          }
        }
      } catch (offErr) {
        console.warn("[ProductService] Error checking/updating OpenFoodFacts photo on scan:", offErr);
      }

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
      const rawCategory =
        productData.categories_tags?.[0]?.replace(/^[a-z]{2}:/, "") ||
        productData.categories?.split(",")[0]?.trim() ||
        "Outros";
      const category = normalizeCategoryName(rawCategory);
      const imageUri = extractOpenFoodFactsImage(productData);

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

      if (safeName) {
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
      }
    } catch (err) {
      console.warn("[ProductService] OpenFoodFacts search error:", err);
    }

    // 3. Fallback: Search local database for similar barcode with score >= 65% (0.65)
    try {
      const similarLocal = await ProductRepository.findSimilarProductByBarcode(cleanBarcode, 0.65);
      if (similarLocal && similarLocal.product) {
        const prod = similarLocal.product;
        const latestPrice = await ProductRepository.getLatestPriceForProduct(prod.id);
        const stats = await ProductRepository.getPriceStats(prod.id);
        const dto = this.formatProductDTO(prod, latestPrice);
        return {
          ...dto,
          minPrice: stats.minPrice,
          maxPrice: stats.maxPrice,
          avgPrice: stats.avgPrice,
          occurrencesCount: stats.count,
          matchScore: similarLocal.matchScore,
          isExactMatch: false,
          scannedEan: cleanBarcode,
        };
      }
    } catch (simErr) {
      console.warn("[ProductService] Error in local barcode similarity check:", simErr);
    }

    return null;
  }

  async getProductById(id: number): Promise<ProductDetailDTO> {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError([{ field: "id", message: "ID do produto inválido." }]);
    }

    const localProduct = await ProductRepository.getProductById(id);
    if (!localProduct) {
      throw new NotFoundError("Produto não encontrado.");
    }

    // If product has an EAN and missing icon, attempt to fetch from OpenFoodFacts to populate missing image
    if ((!localProduct.icon || !localProduct.icon.trim()) && localProduct.ean) {
      try {
        const offData = await ProductRepository.getProductFromOpenFoodFacts(localProduct.ean);
        const productData = offData?.product;
        if (productData) {
          const offImageUri = extractOpenFoodFactsImage(productData);
          if (offImageUri) {
            const updated = await ProductRepository.updateProduct(localProduct.id, {
              icon: offImageUri,
            });
            if (updated) {
              localProduct.icon = updated.icon;
              await invalidateCachePattern("products");
            }
          }
        }
      } catch (offErr) {
        console.warn("[ProductService] Error updating product photo in getProductById:", offErr);
      }
    }

    const [latestPrice, stats, priceHistory] = await Promise.all([
      ProductRepository.getLatestPriceForProduct(id),
      ProductRepository.getPriceStats(id),
      ProductRepository.getPriceHistory(id),
    ]);

    const dto = this.formatProductDTO(localProduct, latestPrice);
    const verificationStatus: ProductDTO["verificationStatus"] =
      dto.verificationStatus === "community_submitted" && stats.count >= 2
        ? "community_verified"
        : dto.verificationStatus;

    return {
      ...dto,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      avgPrice: stats.avgPrice,
      occurrencesCount: stats.count,
      verificationStatus,
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
        marketId: query.marketId,
        marketName: query.marketName,
        limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        latitude: query.latitude,
        longitude: query.longitude,
        radius: query.radius,
        onlyPromotions: query.onlyPromotions,
      }),
      ProductRepository.countProducts({
        search: query.search,
        category: query.category,
        marketId: query.marketId,
        marketName: query.marketName,
        latitude: query.latitude,
        longitude: query.longitude,
        radius: query.radius,
        onlyPromotions: query.onlyPromotions,
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

  async validateProductExistence(params: {
    ean?: string | undefined;
    name?: string | undefined;
  }): Promise<ProductExistenceValidationResult> {
    const cleanEan = params.ean?.trim().replace(/\s+/g, "") || "";
    const cleanName = params.name?.trim() || "";

    if (!cleanEan && !cleanName) {
      throw new ValidationError([
        { field: "ean", message: "Informe um código de barras (EAN) ou nome de produto para validação." },
      ]);
    }

    const barcodeCheck = cleanEan ? validateGs1Barcode(cleanEan) : null;
    if (cleanEan && barcodeCheck && !barcodeCheck.isValid) {
      return {
        exists: false,
        isGs1Valid: false,
        gs1Format: barcodeCheck.format,
        isBrazilianPrefix: barcodeCheck.isBrazilianPrefix,
        isVariableWeightCode: barcodeCheck.isVariableWeightCode,
        pluCode: barcodeCheck.pluCode,
        canRegisterAsPending: false,
        source: "none",
        sourceLabel: "Código GS1 Inválido",
        confidence: "none",
        ean: cleanEan,
        matchedProduct: null,
        reason: barcodeCheck.reason || "Código de barras inválido pelo algoritmo GS1 Módulo-10.",
      };
    }

    // 0. Check Variable-Weight Scale Barcode (GS1 Prefix '2' — Butcher, Bakery, Deli, Produce)
    if (cleanEan && barcodeCheck?.isVariableWeightCode) {
      return {
        exists: true,
        isGs1Valid: true,
        gs1Format: barcodeCheck.format,
        isBrazilianPrefix: false,
        isVariableWeightCode: true,
        pluCode: barcodeCheck.pluCode,
        canRegisterAsPending: true,
        source: "variable_weight_scale",
        sourceLabel: getSourceLabel("variable_weight_scale"),
        confidence: "high",
        ean: cleanEan,
        matchedProduct: {
          name: cleanName || `Produto Pesável (PLU ${barcodeCheck.pluCode})`,
          brand: null,
          category: "Hortifruti",
          categories: ["Hortifruti", "Carnes", "Padaria"],
          imageUri: null,
          ncm: null,
          referencePrice: null,
        },
        reason: `Etiqueta de balança detectada (PLU interno ${barcodeCheck.pluCode}). Vinculado diretamente ao estabelecimento local.`,
      };
    }

    // 1. Check Local Database first
    if (cleanEan) {
      const localByEan = await ProductRepository.getProductByEan(cleanEan);
      if (localByEan && !localByEan.isSuspended) {
        const dto = this.formatProductDTO(localByEan, null);
        return {
          exists: true,
          isGs1Valid: Boolean(barcodeCheck?.isValid),
          gs1Format: barcodeCheck?.format || null,
          isBrazilianPrefix: Boolean(barcodeCheck?.isBrazilianPrefix),
          isVariableWeightCode: false,
          pluCode: null,
          canRegisterAsPending: true,
          source: "local_database",
          sourceLabel: getSourceLabel("local_database"),
          confidence: "high",
          ean: localByEan.ean || cleanEan,
          matchedProduct: {
            id: localByEan.id,
            name: dto.name,
            brand: dto.brand || null,
            category: dto.category,
            categories: dto.categories || [dto.category],
            imageUri: dto.imageUri,
            ncm: dto.ncm,
            referencePrice: null,
          },
        };
      }
    }

    // 2. Check Waterfall External Product Federation by EAN (Level 1 OpenFoodFacts -> Level 2 Retail -> Level 3 Cosmos API)
    if (cleanEan) {
      const externalData = await ProductRepository.getProductFromOpenFoodFacts(cleanEan);
      if (externalData && externalData.product) {
        const prod = externalData.product;
        const source: ExternalProductSource =
          externalData.source || prod.external_source || "openfoodfacts";
        const rawName = (
          prod.product_name_pt ||
          prod.product_name ||
          prod.generic_name_pt ||
          prod.generic_name ||
          ""
        ).trim();

        const brand = (prod.brands || "").split(",")[0]?.trim() || null;
        let finalName = rawName;
        if (brand && (!finalName || !finalName.toLowerCase().includes(brand.toLowerCase()))) {
          finalName = finalName ? `${brand} ${finalName}` : brand;
        }

        const rawCategory =
          prod.categories_tags?.[0]?.replace(/^[a-z]{2}:/, "") ||
          prod.categories?.split(",")[0]?.trim() ||
          finalName ||
          "Outros";
        const category = normalizeCategoryName(rawCategory);
        const imageUri = extractOpenFoodFactsImage(prod) || null;
        const referencePrice =
          typeof prod.reference_price === "number" && prod.reference_price > 0
            ? prod.reference_price
            : null;

        if (finalName) {
          return {
            exists: true,
            isGs1Valid: Boolean(barcodeCheck?.isValid),
            gs1Format: barcodeCheck?.format || null,
            isBrazilianPrefix: Boolean(barcodeCheck?.isBrazilianPrefix),
            isVariableWeightCode: false,
            pluCode: null,
            canRegisterAsPending: true,
            source,
            sourceLabel: getSourceLabel(source, prod.external_store),
            confidence: "high",
            ean: cleanEan,
            matchedProduct: {
              name: finalName.slice(0, 195),
              brand,
              category,
              categories: [category],
              imageUri,
              ncm: prod.ncm ? String(prod.ncm) : null,
              referencePrice,
            },
          };
        }
      }
    }

    // 3. Fallback: Search by product name in local DB or Brazilian Retail Catalog Federation
    if (cleanName.length >= 3) {
      const localByName = await ProductRepository.getProductByExactName(cleanName);
      if (localByName && !localByName.isSuspended) {
        const dto = this.formatProductDTO(localByName, null);
        return {
          exists: true,
          isGs1Valid: Boolean(barcodeCheck?.isValid),
          gs1Format: barcodeCheck?.format || null,
          isBrazilianPrefix: Boolean(barcodeCheck?.isBrazilianPrefix),
          isVariableWeightCode: false,
          pluCode: null,
          canRegisterAsPending: true,
          source: "local_database",
          sourceLabel: getSourceLabel("local_database"),
          confidence: "high",
          ean: localByName.ean || cleanEan || null,
          matchedProduct: {
            id: localByName.id,
            name: dto.name,
            brand: dto.brand || null,
            category: dto.category,
            categories: dto.categories || [dto.category],
            imageUri: dto.imageUri,
            ncm: dto.ncm,
            referencePrice: null,
          },
        };
      }

      const externalByName = await ProductRepository.searchExternalProductByName(cleanName);
      if (externalByName && externalByName.product) {
        const prod = externalByName.product;
        const source: ExternalProductSource =
          externalByName.source || prod.external_source || "brazilian_retail_catalog";
        const matchedName = (prod.product_name_pt || prod.product_name || cleanName).trim();
        const brand = (prod.brands || "").split(",")[0]?.trim() || null;
        const rawCat = prod.categories?.split(",")[0]?.trim() || matchedName;
        const category = normalizeCategoryName(rawCat);
        const imageUri = extractOpenFoodFactsImage(prod) || null;
        const referencePrice =
          typeof prod.reference_price === "number" && prod.reference_price > 0
            ? prod.reference_price
            : null;

        return {
          exists: true,
          isGs1Valid: Boolean(barcodeCheck?.isValid),
          gs1Format: barcodeCheck?.format || null,
          isBrazilianPrefix: Boolean(barcodeCheck?.isBrazilianPrefix),
          isVariableWeightCode: false,
          pluCode: null,
          canRegisterAsPending: true,
          source,
          sourceLabel: getSourceLabel(source, prod.external_store),
          confidence: "medium",
          ean: cleanEan || externalByName.code || null,
          matchedProduct: {
            name: matchedName.slice(0, 195),
            brand,
            category,
            categories: [category],
            imageUri,
            ncm: prod.ncm ? String(prod.ncm) : null,
            referencePrice,
          },
        };
      }
    }

    // 4. Human Fallback / Quarantine: If mathematically valid GS1 (Modulo-10), allow registration as "Pending Review"
    if (cleanEan && barcodeCheck?.isValid) {
      return {
        exists: false,
        isGs1Valid: true,
        gs1Format: barcodeCheck.format,
        isBrazilianPrefix: barcodeCheck.isBrazilianPrefix,
        isVariableWeightCode: false,
        pluCode: null,
        canRegisterAsPending: true,
        source: "pending_review",
        sourceLabel: getSourceLabel("pending_review"),
        confidence: "low",
        ean: cleanEan,
        matchedProduct: null,
        reason:
          "Código GS1 matematicamente válido, mas ainda não indexado nas bases nacionais (possível embalagem recém-lançada ou marca regional). O cadastro será enviado como 'Pendente de Verificação'.",
      };
    }

    return {
      exists: false,
      isGs1Valid: false,
      gs1Format: null,
      isBrazilianPrefix: false,
      isVariableWeightCode: false,
      pluCode: null,
      canRegisterAsPending: true,
      source: "none",
      sourceLabel: "Não encontrado nas bases nacionais",
      confidence: "none",
      ean: cleanEan || null,
      matchedProduct: null,
      reason: "Não foi possível localizar este produto nas bases nacionais. Ele será registrado como 'Pendente de Verificação'.",
    };
  }

  private async handleExistingProductQuorum(
    existing: any,
    userId: number,
    isPromotion?: boolean,
  ): Promise<ProductDTO> {
    if (!existing.isSuspended) {
      const latestPrice = await ProductRepository.getLatestPriceForProduct(existing.id);
      const dto = this.formatProductDTO(existing, latestPrice);
      if (isPromotion !== undefined) {
        dto.isPromotion = isPromotion;
      }
      return dto;
    }

    if (existing.createdByUserId) {
      await ProductRepository.recordProductSubmission(existing.id, existing.createdByUserId);
    }

    const quorumResult = await ProductRepository.recordProductSubmission(existing.id, userId);
    const quorumUsersCount = Math.max(1, quorumResult.quorumUsersCount);

    if (quorumUsersCount >= PRODUCT_QUORUM_TARGET) {
      const approved = await ProductRepository.approveProduct(existing.id);
      for (const contributorId of quorumResult.contributorUserIds) {
        await UserRepository.incrementPoints(contributorId, 25).catch(() => {});
      }
      await invalidateCachePattern("products");

      const latestPrice = await ProductRepository.getLatestPriceForProduct(existing.id);
      const dto = this.formatProductDTO(approved || { ...existing, isSuspended: false }, latestPrice);
      dto.isSuspended = false;
      dto.pendingApproval = false;
      dto.quorumUsersCount = quorumUsersCount;
      dto.quorumTarget = PRODUCT_QUORUM_TARGET;
      dto.alreadySubmittedByUser = !quorumResult.isNewSubmission;
      dto.verificationStatus = "community_verified";
      if (isPromotion !== undefined) {
        dto.isPromotion = isPromotion;
      }
      return dto;
    }

    const dto = this.formatProductDTO(existing, null);
    dto.isSuspended = true;
    dto.pendingApproval = true;
    dto.quorumUsersCount = quorumUsersCount;
    dto.quorumTarget = PRODUCT_QUORUM_TARGET;
    dto.alreadySubmittedByUser = !quorumResult.isNewSubmission;
    dto.verificationStatus = "pending_review";
    if (isPromotion !== undefined) {
      dto.isPromotion = isPromotion;
    }
    return dto;
  }

  async createCustomProduct(
    data: CreateProductDTO & { createdByUserId?: number | undefined; strictExistenceCheck?: boolean | undefined },
    createdByUserId?: number,
  ): Promise<ProductDTO> {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new ValidationError([{ field: "name", message: "O nome do produto é obrigatório." }]);
    }

    const userId = createdByUserId ?? data.createdByUserId;
    if (!userId) {
      throw new UnauthorizedError("É necessário estar autenticado para cadastrar um produto customizado.");
    }

    const trimmedEan = data.ean?.trim().replace(/\s+/g, "");
    let isVariableWeightScale = false;

    if (trimmedEan) {
      const eanValidation = validateGs1Barcode(trimmedEan);
      if (!eanValidation.isValid) {
        throw new ValidationError([
          {
            field: "ean",
            message: eanValidation.reason || "Código de barras (EAN) inválido pelo padrão GS1.",
          },
        ]);
      }
      isVariableWeightScale = Boolean(eanValidation.isVariableWeightCode);

      const existing = await ProductRepository.getProductByEan(trimmedEan);
      if (existing) {
        return this.handleExistingProductQuorum(existing, userId, data.isPromotion);
      }
    } else {
      const existingByName = await ProductRepository.getProductByExactName(data.name.trim());
      if (existingByName) {
        return this.handleExistingProductQuorum(existingByName, userId, data.isPromotion);
      }
    }

    let initialIcon = data.icon?.trim() || "";
    let enrichedCategory = "";
    let enrichedNcm = data.ncm?.trim() || "";
    let externalConfirmed = false;

    if (trimmedEan && !isVariableWeightScale) {
      try {
        const offData = await ProductRepository.getProductFromOpenFoodFacts(trimmedEan);
        const productData = offData?.product;
        if (productData) {
          externalConfirmed = true;
          if (!initialIcon) {
            initialIcon = extractOpenFoodFactsImage(productData);
          }
          if (!enrichedNcm && productData.ncm) {
            enrichedNcm = String(productData.ncm).trim();
          }
          const rawExternalCat =
            productData.categories_tags?.[0]?.replace(/^[a-z]{2}:/, "") ||
            productData.categories?.split(",")[0]?.trim() ||
            "";
          if (rawExternalCat) {
            enrichedCategory = normalizeCategoryName(rawExternalCat);
          }
        }
      } catch (err) {
        console.warn("[ProductService] Error fetching external catalog in createCustomProduct:", err);
      }
    } else if (!trimmedEan && !initialIcon) {
      try {
        const byNameData = await ProductRepository.searchExternalProductByName(data.name.trim());
        const productData = byNameData?.product;
        if (productData) {
          externalConfirmed = true;
          initialIcon = extractOpenFoodFactsImage(productData);
          const rawExternalCat = productData.categories?.split(",")[0]?.trim() || "";
          if (rawExternalCat) {
            enrichedCategory = normalizeCategoryName(rawExternalCat);
          }
        }
      } catch {}
    }

    let categoryStr = Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories.join(", ")
      : (data.description || data.category || "");

    if ((!categoryStr.trim() || categoryStr.trim() === "Outros") && enrichedCategory && enrichedCategory !== "Outros") {
      categoryStr = enrichedCategory;
    }

    const shouldSuspend = Boolean(data.strictExistenceCheck) && !externalConfirmed && !isVariableWeightScale;

    const created = await ProductRepository.createProduct(
      {
        ean: trimmedEan || undefined,
        ncm: enrichedNcm || undefined,
        name: data.name.trim(),
        categories: data.categories,
        description: categoryStr.trim(),
        icon: initialIcon,
        isPromotion: data.isPromotion,
        isSuspended: shouldSuspend,
        createdAt: data.createdAt,
        createdByUserId: userId,
      },
      userId,
    );

    if (!created) {
      throw new Error("Erro ao salvar produto no banco de dados.");
    }

    const quorumInfo = await ProductRepository.recordProductSubmission(created.id, userId);

    if (!shouldSuspend) {
      await UserRepository.incrementPoints(userId, 25).catch(() => {});
      await invalidateCachePattern("products");
    }

    const dto = this.formatProductDTO(created, null);
    if (data.isPromotion !== undefined) {
      dto.isPromotion = data.isPromotion;
    }
    dto.isSuspended = shouldSuspend;
    dto.pendingApproval = shouldSuspend;
    dto.quorumUsersCount = Math.max(1, quorumInfo.quorumUsersCount);
    dto.quorumTarget = PRODUCT_QUORUM_TARGET;
    dto.alreadySubmittedByUser = false;

    if (shouldSuspend) {
      dto.verificationStatus = "pending_review";
    } else if (externalConfirmed && dto.verificationStatus !== "verified_catalog") {
      dto.verificationStatus = "verified_catalog";
    }
    return dto;
  }

  async updateProduct(id: number, data: UpdateProductDTO): Promise<ProductDTO> {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError([{ field: "id", message: "ID do produto inválido." }]);
    }

    const existing = await ProductRepository.getProductById(id);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado para atualização.");
    }

    const trimmedEan = data.ean?.trim().replace(/\s+/g, "");
    if (trimmedEan && trimmedEan !== existing.ean) {
      const eanValidation = validateGs1Barcode(trimmedEan);
      if (!eanValidation.isValid) {
        throw new ValidationError([
          {
            field: "ean",
            message: eanValidation.reason || "Código de barras (EAN) inválido pelo padrão GS1.",
          },
        ]);
      }

      const conflict = await ProductRepository.getProductByEan(trimmedEan);
      if (conflict && conflict.id !== id) {
        throw new ConflictError("Já existe outro produto cadastrado com este código de barras (EAN).");
      }
    }

    const categoryStr = Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories.join(", ")
      : (data.description || data.category);

    const updated = await ProductRepository.updateProduct(id, {
      name: data.name?.trim(),
      ean: trimmedEan !== undefined ? trimmedEan || "" : undefined,
      ncm: data.ncm?.trim(),
      categories: data.categories,
      description: categoryStr?.trim(),
      icon: data.icon?.trim(),
      isPromotion: data.isPromotion,
    });

    if (!updated) {
      throw new Error("Erro ao atualizar o produto no banco de dados.");
    }

    await invalidateCachePattern("products");

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

    const deleted = await ProductRepository.deleteProduct(id);
    if (deleted) {
      await invalidateCachePattern("products");
    }
    return deleted;
  }

  async purgeAllProducts(): Promise<{ purged: boolean; rowCount: number }> {
    const result = await ProductRepository.purgeAllProducts();
    await invalidateCachePattern("products");
    return result;
  }

  async getCategories(): Promise<string[]> {
    return ProductRepository.getCategories();
  }

  async getPredefinedCategories() {
    return ProductRepository.getPredefinedCategories();
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

  async reportProduct(
    userId: number,
    productId: number,
    reason: string,
    description?: string,
  ) {
    if (!productId || isNaN(productId) || productId <= 0) {
      throw new ValidationError([{ field: "productId", message: "ID do produto inválido." }]);
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new ValidationError([{ field: "reason", message: "O motivo da denúncia é obrigatório." }]);
    }

    const product = await ProductRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError("Produto não encontrado.");
    }

    const report = await ProductRepository.createReport(
      userId,
      productId,
      reason.trim(),
      description?.trim(),
    );

    return {
      reported: true,
      reportId: report?.id,
      message: "Denúncia registrada com sucesso. Nossa equipe irá analisar.",
    };
  }

  async getPendingAdminProducts(): Promise<PendingProductAdminItem[]> {
    const rows = await ProductRepository.getPendingProducts();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const rawDesc = (row.description || "").trim();
        let categories: string[] = [];
        if (rawDesc.includes(",")) {
          categories = rawDesc
            .split(",")
            .map((p) => normalizeCategoryName(p.trim()))
            .filter((c, i, arr) => c && arr.indexOf(c) === i);
        } else if (rawDesc) {
          categories = [normalizeCategoryName(rawDesc)];
        } else {
          categories = ["Outros"];
        }
        const category = categories[0] || "Outros";
        const barcodeCheck = row.ean ? validateGs1Barcode(row.ean) : null;
        let isoCreatedAt = new Date().toISOString();
        if (row.createdAt) {
          const parsed = new Date(row.createdAt);
          if (!isNaN(parsed.getTime())) isoCreatedAt = parsed.toISOString();
        }

        const submissionDetails = await ProductRepository.getProductSubmissionDetails(Number(row.id));
        const contributors = submissionDetails.map((s) => ({
          userId: Number(s.userId),
          userName: s.userName || null,
          userEmail: s.userEmail || null,
          points: Number(s.points || 0),
          submittedAt: s.submittedAt || isoCreatedAt,
        }));

        if (contributors.length === 0 && row.createdByUserId) {
          contributors.push({
            userId: Number(row.createdByUserId),
            userName: row.userName || null,
            userEmail: row.userEmail || null,
            points: Number(row.userPoints || 0),
            submittedAt: isoCreatedAt,
          });
        }

        const quorumUsersCount = Math.max(1, contributors.length, Number(row.quorumUsersCount || 1));
        const quarantineReason = row.ean
          ? `Código ${barcodeCheck?.format || "EAN"} (${row.ean}) matematicamente válido pelo Módulo-10, mas não encontrado nos 3 níveis de bases nacionais (OpenFoodFacts/UPCitemdb, Federação Varejista VTEX e Cosmos API).`
          : "Produto submetido manualmente sem código de barras (EAN) e sem correspondência nos catálogos nacionais.";

        return {
          id: Number(row.id),
          ean: row.ean || null,
          ncm: row.ncm || null,
          name: row.name,
          description: row.description || null,
          category,
          categories,
          icon: row.icon || null,
          isSuspended: Boolean(row.isSuspended),
          isGs1Valid: Boolean(barcodeCheck?.isValid),
          gs1Format: barcodeCheck?.format || null,
          isBrazilianPrefix: Boolean(barcodeCheck?.isBrazilianPrefix),
          isVariableWeightCode: Boolean(barcodeCheck?.isVariableWeightCode),
          pluCode: barcodeCheck?.pluCode || null,
          checkDigitExpected: barcodeCheck?.expectedCheckDigit ?? null,
          checkDigitActual: barcodeCheck?.actualCheckDigit ?? null,
          quarantineReason,
          rewardXpPerUser: 25,
          createdByUserId: row.createdByUserId ?? null,
          userName: row.userName || null,
          userEmail: row.userEmail || null,
          userPoints: Number(row.userPoints || 0),
          quorumUsersCount,
          quorumTarget: PRODUCT_QUORUM_TARGET,
          contributors,
          pendingOccurrencesCount: Number(row.pendingOccurrencesCount || 0),
          createdAt: isoCreatedAt,
        };
      }),
    );

    return enriched;
  }

  async approveProduct(adminUserId: number, productId: number) {
    const existing = await ProductRepository.getProductById(productId);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado.");
    }

    if (!existing.isSuspended) {
      return {
        approved: true,
        product: this.formatProductDTO(existing, null),
      };
    }

    const approved = await ProductRepository.approveProduct(productId);
    if (!approved) {
      throw new NotFoundError("Erro ao aprovar produto.");
    }

    const contributors = await ProductRepository.getProductSubmissionContributors(productId);
    const rewardUserIds = Array.from(
      new Set([...contributors, ...(existing.createdByUserId ? [existing.createdByUserId] : [])]),
    );
    for (const uid of rewardUserIds) {
      await UserRepository.incrementPoints(uid, 25).catch(() => {});
    }

    await invalidateCachePattern("products");

    return {
      approved: true,
      product: this.formatProductDTO(approved, null),
    };
  }

  async rejectProduct(adminUserId: number, productId: number) {
    const existing = await ProductRepository.getProductById(productId);
    if (!existing) {
      throw new NotFoundError("Produto não encontrado.");
    }

    await ProductRepository.deleteProduct(productId);
    await invalidateCachePattern("products");

    return {
      rejected: true,
      deleted: true,
      id: productId,
    };
  }
}

export const productService = new ProductServiceClass();


