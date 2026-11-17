import type { CreateProductDTO, OpenFoodFactsResponse, PriceHistoryItem, UpdateProductDTO } from "@/shared/types/product";
import { PREDEFINED_CATEGORY_NAMES, PREDEFINED_PRODUCT_CATEGORIES, findPredefinedCategory } from "@/shared/constants/productCategories";
import { db } from "../database";
import { cartProduct, market, ocurrency, product, productReport, productSubmission, user } from "../schema";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql, isNotNull } from "drizzle-orm";

export function calculateBarcodeSimilarity(codeA: string, codeB: string): number {
  if (!codeA || !codeB) return 0;
  const a = codeA.replace(/\D/g, "");
  const b = codeB.replace(/\D/g, "");
  if (!a || !b) return 0;
  if (a === b) return 1.0;

  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1.0;

  // Normalized prefix/suffix matching (e.g., zero padding variations)
  const aNoZero = a.replace(/^0+/, "");
  const bNoZero = b.replace(/^0+/, "");
  if (aNoZero && bNoZero && aNoZero === bNoZero) {
    return 0.95;
  }

  // Levenshtein distance calculation
  const matrix: number[][] = [];
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [];
    for (let j = 0; j <= lenB; j++) {
      if (i === 0) matrix[i]![j] = j;
      else if (j === 0) matrix[i]![j] = i;
      else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const prevRow = matrix[i - 1]!;
        const currRow = matrix[i]!;
        currRow[j] = Math.min(
          prevRow[j]! + 1, // deletion
          currRow[j - 1]! + 1, // insertion
          prevRow[j - 1]! + cost // substitution
        );
      }
    }
  }

  const distance = matrix[lenA]![lenB]!;
  const editSimilarity = 1 - distance / maxLen;

  // Longest common substring / subsequence bonus
  let matches = 0;
  const minLen = Math.min(lenA, lenB);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++;
  }
  const positionalSimilarity = matches / maxLen;

  return Math.max(0, Math.min(1, Math.max(editSimilarity, positionalSimilarity * 0.9)));
}

const BRAZILIAN_RETAIL_CATALOG_STORES = [
  "https://www.savegnago.com.br",
  "https://www.covabra.com.br",
  "https://www.mambo.com.br",
  "https://www.bistek.com.br",
  "https://www.prezunic.com.br",
  "https://www.supermuffato.com.br",
];

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

class ProductRepositoryClass {
  private categoryCache: { data: string[]; expiry: number } | null = null;
  private externalProductCache = new Map<string, { data: OpenFoodFactsResponse | null; expiry: number }>();
  private storeCircuitBreaker = new Map<string, { failures: number; openUntil: number }>();

  private isCircuitOpen(hostKey: string): boolean {
    const state = this.storeCircuitBreaker.get(hostKey);
    if (!state) return false;
    if (state.openUntil > Date.now()) return true;
    this.storeCircuitBreaker.delete(hostKey);
    return false;
  }

  private recordCircuitFailure(hostKey: string): void {
    const state = this.storeCircuitBreaker.get(hostKey) || { failures: 0, openUntil: 0 };
    state.failures += 1;
    if (state.failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      state.openUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    }
    this.storeCircuitBreaker.set(hostKey, state);
  }

  private recordCircuitSuccess(hostKey: string): void {
    if (this.storeCircuitBreaker.has(hostKey)) {
      this.storeCircuitBreaker.delete(hostKey);
    }
  }

  private setExternalCache(key: string, data: OpenFoodFactsResponse | null) {
    if (this.externalProductCache.size >= 500) {
      const firstKey = this.externalProductCache.keys().next().value;
      if (firstKey) this.externalProductCache.delete(firstKey);
    }
    const ttlMs = data ? 30 * 60 * 1000 : 3 * 60 * 1000;
    this.externalProductCache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  private async fetchFromBrazilianRetailCatalogs(
    codesToTry: string[],
    timeoutMs = 1800
  ): Promise<OpenFoodFactsResponse | null> {
    const primaryCode = codesToTry[0];
    if (!primaryCode) return null;

    const availableStores = BRAZILIAN_RETAIL_CATALOG_STORES.filter((s) => !this.isCircuitOpen(s));
    if (availableStores.length === 0) return null;

    const fetchStoreEan = async (storeUrl: string, code: string): Promise<OpenFoodFactsResponse | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const url = `${storeUrl}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${encodeURIComponent(code)}`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.status === 403 || res.status === 429 || res.status >= 500) {
          this.recordCircuitFailure(storeUrl);
          return null;
        }
        if (!res.ok) return null;

        const json = await res.json();
        this.recordCircuitSuccess(storeUrl);
        if (!Array.isArray(json) || json.length === 0) return null;

        const item = json[0];
        const sku = item?.items?.[0];
        const rawName = (item?.productName || sku?.nameComplete || sku?.name || "").trim();
        if (!rawName) return null;

        const brand = (item?.brand || "").trim();
        const rawCategories: string[] = Array.isArray(item?.categories) ? item.categories : [];
        const categorySegments = rawCategories
          .flatMap((c: string) => String(c).split("/"))
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 1 && !/^(mambo|bistek|savegnago|covabra|prezunic|muffato)$/i.test(s));

        const imageUrl = (sku?.images?.[0]?.imageUrl || "").trim();
        const offerPrice = Number(sku?.sellers?.[0]?.commertialOffer?.Price || 0);
        const storeDomain = storeUrl.replace(/^https?:\/\/(www\.)?/, "");

        return {
          code,
          status: 1,
          status_verbose: "product found",
          source: "brazilian_retail_catalog",
          product: {
            product_name: rawName,
            product_name_pt: rawName,
            brands: brand,
            categories: categorySegments.join(", ") || "Outros",
            image_url: imageUrl,
            image_front_url: imageUrl,
            reference_price: offerPrice > 0 ? offerPrice : null,
            external_source: "brazilian_retail_catalog",
            external_store: storeDomain,
          },
        };
      } catch {
        this.recordCircuitFailure(storeUrl);
        return null;
      }
    };

    return new Promise((resolve) => {
      const tasks: Promise<OpenFoodFactsResponse | null>[] = [];
      for (const store of availableStores) {
        tasks.push(fetchStoreEan(store, primaryCode));
      }
      if (tasks.length === 0) return resolve(null);

      let completed = 0;
      let resolved = false;
      let fallbackWithoutImage: OpenFoodFactsResponse | null = null;

      tasks.forEach((p) => {
        p.then((res) => {
          if (resolved) return;
          if (res && res.product?.product_name) {
            if (res.product.image_front_url) {
              resolved = true;
              resolve(res);
              return;
            }
            if (!fallbackWithoutImage) {
              fallbackWithoutImage = res;
            }
          }
          completed++;
          if (completed >= tasks.length) {
            resolve(fallbackWithoutImage);
          }
        });
      });
    });
  }

  private async fetchFromUpcItemDb(code: string, timeoutMs = 1800): Promise<OpenFoodFactsResponse | null> {
    if (this.isCircuitOpen("upcitemdb")) return null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "PrescoApp/1.5",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        this.recordCircuitFailure("upcitemdb");
        return null;
      }
      if (!res.ok) return null;
      this.recordCircuitSuccess("upcitemdb");

      const data: any = await res.json();
      const item = data?.items?.[0];
      if (!item || !item.title) return null;

      const imageUrl = Array.isArray(item.images) && item.images.length > 0 ? String(item.images[0]).trim() : "";
      return {
        code,
        status: 1,
        status_verbose: "product found",
        source: "upcitemdb",
        product: {
          product_name: String(item.title).trim(),
          product_name_pt: String(item.title).trim(),
          brands: item.brand ? String(item.brand).trim() : "",
          categories: item.category ? String(item.category).trim() : "Outros",
          image_url: imageUrl,
          image_front_url: imageUrl,
          external_source: "upcitemdb",
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Level 3 Fallback: Official Bluesoft Cosmos REST API via X-Cosmos-Token (when configured in .env)
   * Respects daily quota and avoids any web/search engine HTML scraping.
   */
  private async fetchFromCosmosOfficialApi(code: string, timeoutMs = 2000): Promise<OpenFoodFactsResponse | null> {
    const cosmosToken = process.env.COSMOS_API_TOKEN?.trim();
    if (!cosmosToken || !code || code.length < 8) return null;
    if (this.isCircuitOpen("cosmos_api")) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const url = `https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(code)}.json`;

      const res = await fetch(url, {
        headers: {
          "X-Cosmos-Token": cosmosToken,
          "User-Agent": "Cosmos-API-Client",
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429 || res.status === 401 || res.status === 403) {
        this.recordCircuitFailure("cosmos_api");
        return null;
      }
      if (!res.ok) return null;
      this.recordCircuitSuccess("cosmos_api");

      const data: any = await res.json();
      const description = String(data?.description || "").trim();
      if (!description) return null;

      const brand = String(data?.brand?.name || "").trim();
      const ncmCode = String(data?.ncm?.code || "").replace(/\D/g, "").trim();
      const gpcDesc = String(data?.gpc?.description || data?.ncm?.description || "Outros").trim();
      const thumbnail = String(data?.thumbnail || "").trim();
      const avgPrice = Number(data?.avg_price || data?.price || 0);

      return {
        code,
        status: 1,
        status_verbose: "product found",
        source: "cosmos_official_api",
        product: {
          product_name: description,
          product_name_pt: description,
          brands: brand,
          ncm: ncmCode || undefined,
          categories: gpcDesc,
          image_url: thumbnail,
          image_front_url: thumbnail,
          reference_price: avgPrice > 0 ? avgPrice : null,
          external_source: "cosmos_official_api",
        },
      };
    } catch {
      return null;
    }
  }

  async searchExternalProductByName(nameQuery: string, timeoutMs = 1800): Promise<OpenFoodFactsResponse | null> {
    const cleanQuery = (nameQuery || "").trim();
    if (cleanQuery.length < 3) return null;

    const cacheKey = `name:${cleanQuery.toLowerCase()}`;
    const cached = this.externalProductCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const queryTokens = cleanQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    if (queryTokens.length === 0) return null;

    const searchStores = BRAZILIAN_RETAIL_CATALOG_STORES.filter((s) => !this.isCircuitOpen(s)).slice(0, 3);
    if (searchStores.length === 0) return null;

    const fetchStoreByName = async (storeUrl: string): Promise<OpenFoodFactsResponse | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const url = `${storeUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(cleanQuery)}&_from=0&_to=2`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.status === 403 || res.status === 429 || res.status >= 500) {
          this.recordCircuitFailure(storeUrl);
          return null;
        }
        if (!res.ok) return null;
        this.recordCircuitSuccess(storeUrl);

        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0) return null;

        for (const item of json) {
          const sku = item?.items?.[0];
          const rawName = (item?.productName || sku?.nameComplete || sku?.name || "").trim();
          if (!rawName) continue;

          const normalizedCandidate = rawName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          const matchedTokens = queryTokens.filter((tk) => normalizedCandidate.includes(tk));
          const tokenOverlap = matchedTokens.length / queryTokens.length;
          if (tokenOverlap < 0.6) continue;

          const eanCode = (sku?.ean || "").trim();
          const brand = (item?.brand || "").trim();
          const rawCategories: string[] = Array.isArray(item?.categories) ? item.categories : [];
          const categorySegments = rawCategories
            .flatMap((c: string) => String(c).split("/"))
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 1 && !/^(mambo|bistek|savegnago|covabra|prezunic|muffato)$/i.test(s));

          const imageUrl = (sku?.images?.[0]?.imageUrl || "").trim();
          const offerPrice = Number(sku?.sellers?.[0]?.commertialOffer?.Price || 0);
          const storeDomain = storeUrl.replace(/^https?:\/\/(www\.)?/, "");

          return {
            code: eanCode,
            status: 1,
            status_verbose: "product found",
            source: "brazilian_retail_catalog",
            product: {
              product_name: rawName,
              product_name_pt: rawName,
              brands: brand,
              categories: categorySegments.join(", ") || "Outros",
              image_url: imageUrl,
              image_front_url: imageUrl,
              reference_price: offerPrice > 0 ? offerPrice : null,
              external_source: "brazilian_retail_catalog",
              external_store: storeDomain,
            },
          };
        }
        return null;
      } catch {
        this.recordCircuitFailure(storeUrl);
        return null;
      }
    };

    const results = await Promise.all(searchStores.map((s) => fetchStoreByName(s)));
    const found = results.find((r) => r && r.product?.image_front_url) || results.find(Boolean) || null;
    this.setExternalCache(cacheKey, found);
    return found;
  }

  /**
   * Waterfall Execution Order:
   * - Skips external network lookups for variable-weight scale codes (13 digits starting with '2').
   * - Level 1: OpenFoodFacts / OpenBeautyFacts / OpenProductsFacts / OpenPetFoodFacts (open license) + UPCitemdb.
   * - Level 2: Brazilian Retail Catalogs (VTEX) in parallel with 1.8s timeout & Circuit Breaker.
   * - Level 3: Official Bluesoft Cosmos API via COSMOS_API_TOKEN as final fallback.
   */
  async getProductFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse | null> {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const digitsOnly = cleanBarcode.replace(/\D/g, "");
    // Variable-weight scale barcodes (prefix 2, 13 digits) are store-internal and never exist in global catalogs
    if (digitsOnly.length === 13 && digitsOnly.startsWith("2")) {
      return null;
    }

    const cacheKey = `ean:${digitsOnly || cleanBarcode}`;
    const cached = this.externalProductCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const digitsWithoutZero = digitsOnly.replace(/^0+/, "");
    const pad13 = digitsWithoutZero ? digitsWithoutZero.padStart(13, "0") : "";
    const codesToTry = Array.from(new Set([digitsOnly, digitsWithoutZero, pad13, cleanBarcode].filter(Boolean)));

    const fetchUrl = async (url: string, timeoutMs = 1800): Promise<OpenFoodFactsResponse | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          headers: {
            "User-Agent": "PrescoApp - Mobile/Backend - Version 1.5 (contato@presco.app)",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const data = (await response.json()) as OpenFoodFactsResponse;
        if (data && (data.status === 1 || (data as any).status_verbose === "product found") && data.product) {
          data.source = "openfoodfacts";
          data.product.external_source = "openfoodfacts";
          return data;
        }
        return null;
      } catch {
        return null;
      }
    };

    const fetchFastest = (urls: string[], timeoutMs = 1800): Promise<OpenFoodFactsResponse | null> => {
      return new Promise((resolve) => {
        let completed = 0;
        let hasResolved = false;
        if (urls.length === 0) return resolve(null);

        urls.forEach((u) => {
          fetchUrl(u, timeoutMs).then((res) => {
            if (hasResolved) return;
            if (res) {
              hasResolved = true;
              resolve(res);
            } else {
              completed++;
              if (completed >= urls.length) {
                resolve(null);
              }
            }
          });
        });
      });
    };

    // LEVEL 1: Open-license databases (OpenFoodFacts BR/World + OpenBeauty + OpenProducts + OpenPetFood + UPCitemdb)
    const level1Urls: string[] = [];
    for (const code of codesToTry) {
      level1Urls.push(
        `https://br.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        `https://world.openpetfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`
      );
    }

    const [offResult, upcResult] = await Promise.all([
      fetchFastest(Array.from(new Set(level1Urls)), 1800),
      this.fetchFromUpcItemDb(digitsOnly || cleanBarcode, 1600),
    ]);

    const level1Hit = offResult || upcResult;
    const level1Name = (
      level1Hit?.product?.product_name_pt ||
      level1Hit?.product?.product_name ||
      ""
    ).trim();
    const level1Image = (
      level1Hit?.product?.image_front_url ||
      level1Hit?.product?.image_url ||
      ""
    ).trim();

    // If Level 1 returned a complete product with name AND open-license image, return immediately!
    if (level1Hit && level1Name.length >= 4 && level1Image) {
      this.setExternalCache(cacheKey, level1Hit);
      return level1Hit;
    }

    // LEVEL 2: Brazilian Retail Catalogs (VTEX Federation with 1.8s timeout & Circuit Breaker)
    const retailResult = await this.fetchFromBrazilianRetailCatalogs(codesToTry, 1800);

    if (level1Hit && retailResult) {
      // Prioritize OpenFoodFacts open-license image if present, while enriching Portuguese name/category from Retail Catalog
      const merged: OpenFoodFactsResponse = {
        ...retailResult,
        source: offResult ? "openfoodfacts" : retailResult.source,
        product: {
          ...retailResult.product,
          ...offResult?.product,
          product_name_pt:
            retailResult.product.product_name_pt ||
            level1Hit.product.product_name_pt ||
            retailResult.product.product_name,
          product_name:
            retailResult.product.product_name ||
            level1Hit.product.product_name,
          categories:
            retailResult.product.categories && retailResult.product.categories !== "Outros"
              ? retailResult.product.categories
              : level1Hit.product.categories,
          // OpenFoodFacts image takes priority for open licensing
          image_front_url: level1Image || retailResult.product.image_front_url,
          image_url: level1Image || retailResult.product.image_url,
        },
      };
      this.setExternalCache(cacheKey, merged);
      return merged;
    }

    if (retailResult) {
      this.setExternalCache(cacheKey, retailResult);
      return retailResult;
    }

    if (level1Hit) {
      this.setExternalCache(cacheKey, level1Hit);
      return level1Hit;
    }

    // LEVEL 3: Official Bluesoft Cosmos API via Token (when COSMOS_API_TOKEN is configured)
    const cosmosResult = await this.fetchFromCosmosOfficialApi(digitsOnly || cleanBarcode, 2000);
    this.setExternalCache(cacheKey, cosmosResult);
    return cosmosResult;
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

  async getProductByExactName(name: string) {
    if (!name || !name.trim()) return null;
    const normalized = name.trim().replace(/\s+/g, " ");
    const result = await db
      .select()
      .from(product)
      .where(sql`LOWER(TRIM(${product.name})) = LOWER(${normalized})`)
      .limit(1);
    return result[0] || null;
  }

  async findSimilarProductByBarcode(
    scannedBarcode: string,
    minScore = 0.65
  ): Promise<{ product: typeof product.$inferSelect; matchScore: number } | null> {
    if (!scannedBarcode) return null;
    const cleanRaw = scannedBarcode.trim();
    if (!cleanRaw) return null;

    // Fetch all non-suspended products that have an EAN defined
    const candidates = await db
      .select()
      .from(product)
      .where(and(isNotNull(product.ean), eq(product.isSuspended, false)))
      .limit(300);

    if (!candidates || candidates.length === 0) return null;

    let bestCandidate: typeof product.$inferSelect | null = null;
    let highestScore = 0;

    for (const item of candidates) {
      if (!item.ean) continue;
      const score = calculateBarcodeSimilarity(cleanRaw, item.ean);

      // We only consider items with score >= minScore (e.g. 0.65)
      if (score >= minScore) {
        // Tie-breaker: prioritize items that actually have an image (icon)
        const currentHasImage = Boolean(item.icon && item.icon.trim().length > 0);
        const bestHasImage = Boolean(bestCandidate?.icon && bestCandidate.icon.trim().length > 0);

        if (
          score > highestScore ||
          (Math.abs(score - highestScore) < 0.03 && currentHasImage && !bestHasImage)
        ) {
          highestScore = score;
          bestCandidate = item;
        }
      }
    }

    if (bestCandidate && highestScore >= minScore) {
      return {
        product: bestCandidate,
        matchScore: Number(highestScore.toFixed(2)),
      };
    }

    return null;
  }

  async getProductById(id: number) {
    const result = await db.select().from(product).where(eq(product.id, id)).limit(1);
    return result[0] || null;
  }

  async searchProducts(params: {
    search?: string | undefined;
    category?: string | undefined;
    marketId?: number | undefined;
    marketName?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    radius?: number | undefined;
    onlyPromotions?: boolean | undefined;
  }) {
    const {
      search,
      category,
      marketId,
      marketName,
      limit = 20,
      offset = 0,
      sortBy = "id",
      sortOrder = "desc",
      latitude,
      longitude,
      radius = 15000,
      onlyPromotions = false,
    } = params;

    // 1. Spatial Proximity Query when coordinates are provided
    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      const nearbyResults = await this.searchProductsNearby({
        latitude,
        longitude,
        radius,
        search,
        category,
        marketId,
        marketName,
        limit,
        offset,
        sortBy,
        sortOrder,
        onlyPromotions,
      });

      // If market filter is active or nearby items found, return them directly
      if (marketId || marketName || (nearbyResults && nearbyResults.length > 0)) {
        return nearbyResults;
      }
    }

    // 2. Standard Catalog Query Fallback (when no coordinates or no nearby occurrences found)
    const conditions: any[] = [eq(product.isSuspended, false)];

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
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchConditions = [
          ilike(product.description, `%${matched.name}%`),
          ilike(product.description, `%${matched.id}%`),
          ilike(product.description, `%${cleanCat}%`),
        ];
        if (matched.aliases) {
          for (const alias of matched.aliases) {
            matchConditions.push(ilike(product.description, `%${alias}%`));
          }
        }
        conditions.push(or(...matchConditions));
      } else {
        conditions.push(ilike(product.description, `%${cleanCat}%`));
      }
    }

    if (marketId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ocurrency o WHERE o.product_id = ${product.id} AND o.is_suspended = false AND o.market_id = ${marketId})`
      );
    } else if (marketName && marketName.trim()) {
      const mTerm = `%${marketName.trim()}%`;
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ocurrency o JOIN market m ON o.market_id = m.id WHERE o.product_id = ${product.id} AND o.is_suspended = false AND m.name ILIKE ${mTerm})`
      );
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

  async searchProductsNearby(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    search?: string | undefined;
    category?: string | undefined;
    marketId?: number | undefined;
    marketName?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    onlyPromotions?: boolean | undefined;
  }) {
    const {
      latitude,
      longitude,
      radius = 15000,
      search,
      category,
      marketId,
      marketName,
      limit = 20,
      offset = 0,
      sortBy = "id",
      sortOrder = "desc",
      onlyPromotions = false,
    } = params;

    const wktPoint = `POINT(${longitude} ${latitude})`;

    // Construct search & category SQL fragments safely
    const filterClauses: any[] = [sql`p.is_suspended = FALSE`];

    if (search && search.trim().length > 0) {
      const cleanSearch = search.trim();
      const term = `%${cleanSearch}%`;
      filterClauses.push(sql`(p.name ILIKE ${term} OR p.ean ILIKE ${term} OR p.ean = ${cleanSearch})`);
    }

    if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchTerms = [matched.name, matched.id, cleanCat, ...(matched.aliases || [])];
        const subConditions = matchTerms.map(
          (t) => sql`p.description ILIKE ${`%${t}%`}`
        );
        filterClauses.push(sql`(${sql.join(subConditions, sql` OR `)})`);
      } else {
        filterClauses.push(sql`p.description ILIKE ${`%${cleanCat}%`}`);
      }
    }

    if (onlyPromotions) {
      filterClauses.push(sql`ps.is_promotion = TRUE`);
    }

    if (marketId) {
      filterClauses.push(
        sql`EXISTS (SELECT 1 FROM ocurrency om WHERE om.product_id = p.id AND om.is_suspended = false AND om.market_id = ${marketId})`
      );
    } else if (marketName && marketName.trim()) {
      const mTerm = `%${marketName.trim()}%`;
      filterClauses.push(
        sql`EXISTS (SELECT 1 FROM ocurrency om JOIN market mm ON om.market_id = mm.id WHERE om.product_id = p.id AND om.is_suspended = false AND mm.name ILIKE ${mTerm})`
      );
    }

    // Determine ordering clause
    let orderSql = sql`
      ps.is_promotion DESC,
      (ps.min_distance_meters IS NULL) ASC,
      ps.min_distance_meters ASC,
      p.id DESC
    `;

    if (sortBy === "distance") {
      orderSql = sortOrder === "asc"
        ? sql`(ps.min_distance_meters IS NULL) ASC, ps.min_distance_meters ASC, ps.min_price ASC`
        : sql`(ps.min_distance_meters IS NULL) ASC, ps.min_distance_meters DESC, ps.min_price ASC`;
    } else if (sortBy === "price") {
      orderSql = sortOrder === "asc"
        ? sql`(ps.min_price IS NULL) ASC, ps.min_price ASC, ps.min_distance_meters ASC`
        : sql`(ps.min_price IS NULL) ASC, ps.min_price DESC, ps.min_distance_meters ASC`;
    } else if (sortBy === "discount") {
      orderSql = sql`ps.discount_percentage DESC, ps.min_price ASC`;
    } else if (sortBy === "name") {
      orderSql = sortOrder === "asc" ? sql`p.name ASC` : sql`p.name DESC`;
    } else if (sortBy === "createdAt") {
      orderSql = sortOrder === "asc" ? sql`p.created_at ASC` : sql`p.created_at DESC`;
    }

    const query = sql`
      WITH product_stats AS (
        SELECT 
          p.id AS product_id,
          MIN(loc_occ.value::numeric) AS min_price,
          MAX(loc_occ.value::numeric) AS max_price,
          AVG(loc_occ.value::numeric) AS avg_price,
          COUNT(loc_occ.id)::int AS occurrences_count,
          MIN(ST_Distance(loc_occ.location, ST_GeographyFromText(${wktPoint}))) AS min_distance_meters,
          (
            SELECT m2.name 
            FROM ocurrency o2
            JOIN market m2 ON o2.market_id = m2.id
            WHERE o2.product_id = p.id 
              AND o2.is_suspended = false
              AND ST_DWithin(m2.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY ST_Distance(m2.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS nearest_market_name,
          (
            SELECT ST_Y(m2.location::geometry)
            FROM ocurrency o2
            JOIN market m2 ON o2.market_id = m2.id
            WHERE o2.product_id = p.id 
              AND o2.is_suspended = false
              AND ST_DWithin(m2.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY ST_Distance(m2.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS nearest_market_lat,
          (
            SELECT ST_X(m2.location::geometry)
            FROM ocurrency o2
            JOIN market m2 ON o2.market_id = m2.id
            WHERE o2.product_id = p.id 
              AND o2.is_suspended = false
              AND ST_DWithin(m2.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY ST_Distance(m2.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS nearest_market_lng,
          (
            SELECT m3.name
            FROM ocurrency o3
            JOIN market m3 ON o3.market_id = m3.id
            WHERE o3.product_id = p.id
              AND o3.is_suspended = false
              AND ST_DWithin(m3.location, ST_GeographyFromText(${wktPoint}), ${radius})
            ORDER BY o3.value::numeric ASC, ST_Distance(m3.location, ST_GeographyFromText(${wktPoint})) ASC
            LIMIT 1
          ) AS best_market_name,
          CASE 
            WHEN AVG(loc_occ.value::numeric) > MIN(loc_occ.value::numeric) * 1.04 THEN ROUND(((AVG(loc_occ.value::numeric) - MIN(loc_occ.value::numeric)) / AVG(loc_occ.value::numeric)) * 100)::int
            ELSE 0 
          END AS discount_percentage,
          CASE 
            WHEN (AVG(loc_occ.value::numeric) >= MIN(loc_occ.value::numeric) * 1.05 AND COUNT(loc_occ.id) >= 1) THEN TRUE
            ELSE FALSE
          END AS is_promotion
        FROM product p
        LEFT JOIN (
          SELECT o.id, o.product_id, o.value, m.location
          FROM ocurrency o
          JOIN market m ON o.market_id = m.id
          WHERE o.is_suspended = false
            AND ST_DWithin(m.location, ST_GeographyFromText(${wktPoint}), ${radius})
        ) loc_occ ON loc_occ.product_id = p.id
        GROUP BY p.id
      )
      SELECT 
        p.id,
        p.ean,
        p.ncm,
        p.name,
        p.description,
        p.icon,
        p.created_at AS "createdAt",
        ps.min_price AS "minPriceNumeric",
        ps.max_price AS "maxPriceNumeric",
        ps.avg_price AS "avgPriceNumeric",
        ps.occurrences_count AS "occurrencesCount",
        ps.min_distance_meters AS "nearestMarketDistance",
        COALESCE(ps.best_market_name, ps.nearest_market_name) AS "nearestMarketName",
        ps.nearest_market_lat AS "nearestMarketLat",
        ps.nearest_market_lng AS "nearestMarketLng",
        ps.discount_percentage AS "discountPercentage",
        ps.is_promotion AS "isPromotion"
      FROM product p
      LEFT JOIN product_stats ps ON ps.product_id = p.id
      WHERE ${sql.join(filterClauses, sql` AND `)}
      ORDER BY ${orderSql}
      LIMIT ${limit} OFFSET ${offset}
    `;

    try {
      const result = await db.execute(query);
      const rows = (result.rows || result) as any[];
      return rows.map((row) => ({
        id: Number(row.id),
        ean: row.ean || null,
        ncm: row.ncm || null,
        name: String(row.name),
        description: row.description || null,
        icon: row.icon || null,
        createdAt: row.createdAt || new Date().toISOString(),
        minPriceNumeric: row.minPriceNumeric ? Number(row.minPriceNumeric) : null,
        maxPriceNumeric: row.maxPriceNumeric ? Number(row.maxPriceNumeric) : null,
        avgPriceNumeric: row.avgPriceNumeric ? Number(row.avgPriceNumeric) : null,
        occurrencesCount: Number(row.occurrencesCount || 0),
        nearestMarketDistance: row.nearestMarketDistance !== null && row.nearestMarketDistance !== undefined ? Math.round(Number(row.nearestMarketDistance)) : null,
        nearestMarketName: row.nearestMarketName ? String(row.nearestMarketName) : null,
        nearestMarketCoordinate:
          row.nearestMarketLat !== null && row.nearestMarketLat !== undefined &&
          row.nearestMarketLng !== null && row.nearestMarketLng !== undefined
            ? { latitude: Number(row.nearestMarketLat), longitude: Number(row.nearestMarketLng) }
            : null,
        discountPercentage: row.discountPercentage ? Number(row.discountPercentage) : 0,
        isPromotion: Boolean(row.isPromotion),
      }));
    } catch (err) {
      console.warn("[ProductRepository] Erro ao executar busca espacial por proximidade:", err);
      return [];
    }
  }

  async countProducts(params: {
    search?: string | undefined;
    category?: string | undefined;
    marketId?: number | undefined;
    marketName?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    radius?: number | undefined;
    onlyPromotions?: boolean | undefined;
  }): Promise<number> {
    const { search, category, marketId, marketName, latitude, longitude, radius = 15000, onlyPromotions = false } = params;

    // If coordinates provided, count nearby matching products
    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      const wktPoint = `POINT(${longitude} ${latitude})`;
      const filterClauses: any[] = [sql`p.is_suspended = FALSE`];

      if (search && search.trim().length > 0) {
        const cleanSearch = search.trim();
        const term = `%${cleanSearch}%`;
        filterClauses.push(sql`(p.name ILIKE ${term} OR p.ean ILIKE ${term} OR p.ean = ${cleanSearch})`);
      }

      if (category && category.trim().length > 0 && category.toLowerCase() !== "todos") {
        const cleanCat = category.trim();
        const matched = findPredefinedCategory(cleanCat);
        if (matched) {
          const matchTerms = [matched.name, matched.id, cleanCat, ...(matched.aliases || [])];
          const subConditions = matchTerms.map(
            (t) => sql`p.description ILIKE ${`%${t}%`}`
          );
          filterClauses.push(sql`(${sql.join(subConditions, sql` OR `)})`);
        } else {
          filterClauses.push(sql`p.description ILIKE ${`%${cleanCat}%`}`);
        }
      }

      if (onlyPromotions) {
        filterClauses.push(sql`ps.is_promotion = TRUE`);
      }

      if (marketId) {
        filterClauses.push(
          sql`EXISTS (SELECT 1 FROM ocurrency om WHERE om.product_id = p.id AND om.is_suspended = false AND om.market_id = ${marketId})`
        );
      } else if (marketName && marketName.trim()) {
        const mTerm = `%${marketName.trim()}%`;
        filterClauses.push(
          sql`EXISTS (SELECT 1 FROM ocurrency om JOIN market mm ON om.market_id = mm.id WHERE om.product_id = p.id AND om.is_suspended = false AND mm.name ILIKE ${mTerm})`
        );
      }

      const countQuery = sql`
        WITH product_stats AS (
          SELECT 
            p.id AS product_id,
            MIN(loc_occ.value::numeric) AS min_price,
            AVG(loc_occ.value::numeric) AS avg_price,
            COUNT(loc_occ.id)::int AS occurrences_count,
            CASE 
              WHEN (AVG(loc_occ.value::numeric) >= MIN(loc_occ.value::numeric) * 1.05 AND COUNT(loc_occ.id) >= 1) THEN TRUE
              ELSE FALSE
            END AS is_promotion
          FROM product p
          LEFT JOIN (
            SELECT o.id, o.product_id, o.value, m.location
            FROM ocurrency o
            JOIN market m ON o.market_id = m.id
            WHERE o.is_suspended = false
              AND ST_DWithin(m.location, ST_GeographyFromText(${wktPoint}), ${radius})
          ) loc_occ ON loc_occ.product_id = p.id
          GROUP BY p.id
        )
        SELECT COUNT(DISTINCT p.id)::int AS count
        FROM product p
        LEFT JOIN product_stats ps ON ps.product_id = p.id
        WHERE ${sql.join(filterClauses, sql` AND `)}
      `;

      try {
        const res = await db.execute(countQuery);
        const rows = (res.rows || res) as any[];
        const count = Number(rows[0]?.count || 0);
        if (marketId || marketName || count > 0) return count;
      } catch (err) {
        console.warn("[ProductRepository] Erro ao contar produtos por proximidade:", err);
      }
    }

    // Standard count fallback
    const conditions: any[] = [eq(product.isSuspended, false)];

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
      const cleanCat = category.trim();
      const matched = findPredefinedCategory(cleanCat);
      if (matched) {
        const matchConditions = [
          ilike(product.description, `%${matched.name}%`),
          ilike(product.description, `%${matched.id}%`),
          ilike(product.description, `%${cleanCat}%`),
        ];
        if (matched.aliases) {
          for (const alias of matched.aliases) {
            matchConditions.push(ilike(product.description, `%${alias}%`));
          }
        }
        conditions.push(or(...matchConditions));
      } else {
        conditions.push(ilike(product.description, `%${cleanCat}%`));
      }
    }

    if (marketId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ocurrency o WHERE o.product_id = ${product.id} AND o.is_suspended = false AND o.market_id = ${marketId})`
      );
    } else if (marketName && marketName.trim()) {
      const mTerm = `%${marketName.trim()}%`;
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ocurrency o JOIN market m ON o.market_id = m.id WHERE o.product_id = ${product.id} AND o.is_suspended = false AND m.name ILIKE ${mTerm})`
      );
    }

    let query = db.select({ count: sql<number>`count(*)::int` }).from(product);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const res = await query;
    return Number(res[0]?.count || 0);
  }

  async createProduct(
    data: CreateProductDTO & { createdByUserId?: number | undefined; isSuspended?: boolean | undefined },
    createdByUserId?: number,
  ) {
    this.categoryCache = null;
    const safeName = data.name.trim().slice(0, 195);
    const categoryStr = Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories.join(", ")
      : (data.description || data.category || "");
    const safeDescription = categoryStr.trim().slice(0, 250);

    const userId = createdByUserId !== undefined ? createdByUserId : data.createdByUserId;

    const payload: typeof product.$inferInsert = {
      ean: data.ean?.trim() || null,
      ncm: data.ncm?.trim() || null,
      name: safeName,
      description: safeDescription,
      icon: data.icon?.trim() || "",
      isSuspended: Boolean(data.isSuspended),
      createdByUserId: userId !== undefined ? userId : null,
    };

    if (data.createdAt) {
      const parsedDate = new Date(data.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        payload.createdAt = parsedDate.toISOString();
      }
    }

    const result = await db.insert(product).values(payload).returning();
    return result[0];
  }

  async updateProduct(id: number, data: UpdateProductDTO & { isSuspended?: boolean | undefined }) {
    this.categoryCache = null;
    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.ean !== undefined) updatePayload.ean = data.ean;
    if (data.ncm !== undefined) updatePayload.ncm = data.ncm;
    if (data.categories !== undefined) {
      updatePayload.description = Array.isArray(data.categories) ? data.categories.join(", ") : data.categories;
    } else if (data.description !== undefined || data.category !== undefined) {
      updatePayload.description = data.description ?? data.category;
    }
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.isSuspended !== undefined) updatePayload.isSuspended = data.isSuspended;
    if (data.createdAt !== undefined) {
      const parsedDate = new Date(data.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        updatePayload.createdAt = parsedDate.toISOString();
      }
    }

    const result = await db
      .update(product)
      .set(updatePayload)
      .where(eq(product.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteProduct(id: number) {
    this.categoryCache = null;
    await db.delete(productSubmission).where(eq(productSubmission.productId, id)).catch(() => {});
    await db.delete(cartProduct).where(eq(cartProduct.productId, id)).catch(() => {});
    await db.delete(productReport).where(eq(productReport.productId, id)).catch(() => {});
    await db.delete(ocurrency).where(eq(ocurrency.productId, id)).catch(() => {});
    const res = await db.delete(product).where(eq(product.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  async purgeAllProducts() {
    this.categoryCache = null;
    await db.execute(sql`DELETE FROM product_submission;`).catch(() => {});
    await db.execute(sql`DELETE FROM cart_product;`);
    await db.execute(sql`DELETE FROM product_report;`);
    await db.execute(sql`DELETE FROM ocurrency;`);
    const res = await db.execute(sql`DELETE FROM product;`);
    return { purged: true, rowCount: res.rowCount ?? 0 };
  }

  async recordProductSubmission(
    productId: number,
    userId: number,
  ): Promise<{ isNewSubmission: boolean; quorumUsersCount: number; contributorUserIds: number[] }> {
    if (productId && userId) {
      const inserted = await db
        .insert(productSubmission)
        .values({ productId, userId })
        .onConflictDoNothing()
        .returning();

      const rows = await db
        .select({ userId: productSubmission.userId })
        .from(productSubmission)
        .where(eq(productSubmission.productId, productId));

      const contributorUserIds = Array.from(new Set(rows.map((r) => Number(r.userId)).filter(Boolean)));
      return {
        isNewSubmission: inserted.length > 0,
        quorumUsersCount: contributorUserIds.length,
        contributorUserIds,
      };
    }
    return { isNewSubmission: false, quorumUsersCount: 0, contributorUserIds: [] };
  }

  async getProductSubmissionContributors(productId: number): Promise<number[]> {
    const rows = await db
      .select({ userId: productSubmission.userId })
      .from(productSubmission)
      .where(eq(productSubmission.productId, productId));
    return Array.from(new Set(rows.map((r) => Number(r.userId)).filter(Boolean)));
  }

  async getPendingProducts() {
    const rows = await db
      .select({
        id: product.id,
        ean: product.ean,
        ncm: product.ncm,
        name: product.name,
        description: product.description,
        icon: product.icon,
        isSuspended: product.isSuspended,
        createdByUserId: product.createdByUserId,
        userName: user.name,
        userEmail: user.email,
        userPoints: user.points,
        createdAt: product.createdAt,
        quorumUsersCount: sql<number>`(
          SELECT GREATEST(
            COUNT(DISTINCT ps.user_id)::int,
            CASE WHEN ${product.createdByUserId} IS NOT NULL THEN 1 ELSE 0 END
          )
          FROM product_submission ps
          WHERE ps.product_id = ${product.id}
        )::int`,
        pendingOccurrencesCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ocurrency o
          WHERE o.product_id = ${product.id}
        )::int`,
      })
      .from(product)
      .leftJoin(user, eq(product.createdByUserId, user.id))
      .where(eq(product.isSuspended, true))
      .orderBy(desc(product.createdAt));

    return rows;
  }

  async getProductSubmissionDetails(productId: number) {
    const rows = await db
      .select({
        userId: productSubmission.userId,
        userName: user.name,
        userEmail: user.email,
        points: user.points,
        submittedAt: productSubmission.createdAt,
      })
      .from(productSubmission)
      .leftJoin(user, eq(productSubmission.userId, user.id))
      .where(eq(productSubmission.productId, productId))
      .orderBy(asc(productSubmission.createdAt));

    return rows;
  }

  async approveProduct(id: number) {
    this.categoryCache = null;
    const [updated] = await db
      .update(product)
      .set({ isSuspended: false })
      .where(eq(product.id, id))
      .returning();
    return updated || null;
  }

  async getPredefinedCategories() {
    return PREDEFINED_PRODUCT_CATEGORIES;
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

    const categoriesSet = new Set<string>(PREDEFINED_CATEGORY_NAMES);
    for (const r of rows) {
      if (r.category) {
        const parts = r.category.split(",");
        for (const p of parts) {
          const trimmed = p.trim();
          if (
            trimmed &&
            trimmed !== "Categoria Indisponível" &&
            trimmed !== "Sem Categoria" &&
            trimmed !== "Geral"
          ) {
            const matched = findPredefinedCategory(trimmed);
            if (matched) {
              categoriesSet.add(matched.name);
            }
          }
        }
      }
    }
    const resultList = Array.from(categoriesSet);
    this.categoryCache = { data: resultList, expiry: now + 5 * 60 * 1000 };
    return resultList;
  }

  async getLatestPriceForProduct(productId: number): Promise<string | null> {
    const result = await db
      .select({ value: ocurrency.value })
      .from(ocurrency)
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)))
      .orderBy(desc(ocurrency.createdAt))
      .limit(1);

    if (!result[0]?.value) return null;
    return `R$ ${Number(result[0].value).toFixed(2).replace(".", ",")}`;
  }

  async getLatestPricesForProductIds(productIds: number[]): Promise<Map<number, string>> {
    if (!productIds || productIds.length === 0) return new Map();

    const rows = await db
      .select({
        productId: ocurrency.productId,
        value: ocurrency.value,
      })
      .from(ocurrency)
      .where(
        and(
          inArray(ocurrency.productId, productIds),
          eq(ocurrency.isSuspended, false)
        )
      )
      .orderBy(desc(ocurrency.createdAt));

    const priceMap = new Map<number, string>();
    for (const row of rows) {
      if (row.productId && !priceMap.has(row.productId) && row.value) {
        const num = Number(row.value);
        priceMap.set(row.productId, `R$ ${num.toFixed(2).replace(".", ",")}`);
      }
    }

    return priceMap;
  }

  async getPriceStats(productId: number) {
    // 1. Fetch 5 most recent active price records for calculating 5-last average
    const recentOccurrences = await db
      .select({
        value: ocurrency.value,
      })
      .from(ocurrency)
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)))
      .orderBy(desc(ocurrency.createdAt))
      .limit(5);

    // 2. Fetch min, max and total count for the product
    const globalRes = await db
      .select({
        minPrice: sql<string | null>`min(${ocurrency.value})`,
        maxPrice: sql<string | null>`max(${ocurrency.value})`,
        count: sql<number>`count(*)::int`,
      })
      .from(ocurrency)
      .where(and(eq(ocurrency.productId, productId), eq(ocurrency.isSuspended, false)));

    const globalRow = globalRes[0];
    if (!globalRow || !globalRow.count || recentOccurrences.length === 0) {
      return {
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        count: 0,
      };
    }

    const recentValues = recentOccurrences
      .map((r) => Number(r.value))
      .filter((v) => !isNaN(v) && v > 0);

    const avg5Recent =
      recentValues.length > 0
        ? recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
        : null;

    return {
      minPrice: globalRow.minPrice ? `R$ ${Number(globalRow.minPrice).toFixed(2).replace(".", ",")}` : null,
      maxPrice: globalRow.maxPrice ? `R$ ${Number(globalRow.maxPrice).toFixed(2).replace(".", ",")}` : null,
      avgPrice: avg5Recent !== null ? `R$ ${avg5Recent.toFixed(2).replace(".", ",")}` : null,
      count: Number(globalRow.count),
    };
  }

  async getPriceHistory(productId: number, limit: number = 15, since?: Date): Promise<PriceHistoryItem[]> {
    const conditions = [
      eq(ocurrency.productId, productId),
      eq(ocurrency.isSuspended, false),
    ];

    if (since) {
      conditions.push(gte(ocurrency.createdAt, since.toISOString()));
    }

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
      .where(and(...conditions))
      .orderBy(desc(ocurrency.createdAt))
      .limit(limit);

    // Sort ascending chronologically so the timeline flows left-to-right (past to present)
    const sorted = [...res].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((r) => {
      const numVal = Number(r.value);
      let isoCreatedAt = new Date().toISOString();
      if (r.createdAt) {
        const parsed = new Date(r.createdAt);
        if (!isNaN(parsed.getTime())) {
          isoCreatedAt = parsed.toISOString();
        }
      }
      return {
        id: r.id,
        value: numVal,
        formattedValue: `R$ ${numVal.toFixed(2).replace(".", ",")}`,
        marketId: r.marketId,
        marketName: r.marketName || "Mercado não identificado",
        createdAt: isoCreatedAt,
      };
    });
  }

  async createReport(userId: number, productId: number, reason: string, description?: string) {
    const [created] = await db
      .insert(productReport)
      .values({
        userId,
        productId,
        reason,
        description: description || null,
      })
      .returning();
    return created;
  }

  async getProductsBasicInfo(ids: number[]): Promise<{ id: number; name: string; icon: string | null }[]> {
    if (!ids || ids.length === 0) return [];
    return db
      .select({
        id: product.id,
        name: product.name,
        icon: product.icon,
      })
      .from(product)
      .where(inArray(product.id, ids));
  }
}

export const ProductRepository = new ProductRepositoryClass();


