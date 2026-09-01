import { apiRequest } from "./api";

export interface PriceHistoryItem {
  id: number;
  value: number;
  formattedValue: string;
  marketId: number;
  marketName: string;
  createdAt: string;
}

export interface ProductData {
  id?: number;
  barcode?: string;
  ean?: string | null;
  ncm?: string | null;
  name: string;
  description?: string;
  category: string;
  imageUri?: string | null;
  icon?: string | null;
  lastPrice?: string;
  bestPrice?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  avgPrice?: string | null;
  occurrencesCount?: number;
  nearestMarketName?: string | null;
  nearestMarketDistance?: number | null;
  formattedDistance?: string | null;
  isPromotion?: boolean;
  discountPercentage?: number | null;
}

export interface ProductDetailData extends ProductData {
  priceHistory?: PriceHistoryItem[];
}

export interface PaginatedProductsData {
  items: ProductData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchProductsParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount";
  sortOrder?: "asc" | "desc";
  latitude?: number;
  longitude?: number;
  radius?: number;
  onlyPromotions?: boolean;
}

export interface CreateProductParams {
  name: string;
  category?: string;
  description?: string;
  icon?: string;
  ean?: string;
  ncm?: string;
}

export interface UpdateProductParams {
  name?: string;
  category?: string;
  description?: string;
  icon?: string;
  ean?: string;
  ncm?: string;
}

let memoryProductsCache: Record<string, { data: PaginatedProductsData; timestamp: number }> = {};
let memoryCategoriesCache: { data: string[]; timestamp: number } | null = null;

export const fetchProducts = async (params?: FetchProductsParams): Promise<PaginatedProductsData> => {
  const queryParts: string[] = [];
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  if (params?.category && params.category !== "Todos") queryParts.push(`category=${encodeURIComponent(params.category.trim())}`);
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
  if (params?.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);
  if (params?.latitude !== undefined && params?.latitude !== null) queryParts.push(`latitude=${params.latitude.toFixed(5)}`);
  if (params?.longitude !== undefined && params?.longitude !== null) queryParts.push(`longitude=${params.longitude.toFixed(5)}`);
  if (params?.radius) queryParts.push(`radius=${params.radius}`);
  if (params?.onlyPromotions) queryParts.push(`onlyPromotions=true`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const cacheKey = queryString || "default";

  // Check in-memory cache for immediate response (cache valid for 60s)
  const cached = memoryProductsCache[cacheKey];
  const isFresh = cached && Date.now() - cached.timestamp < 60000;

  if (isFresh) {
    return cached.data;
  }

  try {
    const res = await apiRequest<PaginatedProductsData>(`/products${queryString}`, {
      method: "GET",
    });
    const resultData = res || { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
    memoryProductsCache[cacheKey] = { data: resultData, timestamp: Date.now() };
    return resultData;
  } catch (error: any) {
    if (cached) {
      return cached.data;
    }
    console.warn("[ProductService] Aviso ao carregar lista de produtos:", error?.message);
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
};

export const fetchProductById = async (id: number | string): Promise<ProductDetailData | null> => {
  try {
    return await apiRequest<ProductDetailData>(`/products/${id}`, {
      method: "GET",
    });
  } catch (error: any) {
    if (
      error?.status === 404 ||
      error?.code === "NOT_FOUND" ||
      error?.code === "PRODUCT_NOT_FOUND" ||
      String(error?.message).toLowerCase().includes("não encontrado")
    ) {
      return null;
    }
    console.warn(`[ProductService] Produto ID ${id} não encontrado ou erro de busca:`, error?.message);
    return null;
  }
};

export const fetchProductByEan = async (ean: string): Promise<ProductData | null> => {
  if (!ean || !ean.trim()) return null;

  try {
    const response = await apiRequest<ProductData>(`/products/barcode/${encodeURIComponent(ean.trim())}`, {
      method: "GET",
    });
    return response;
  } catch (error: any) {
    if (
      error?.status === 404 ||
      error?.code === "PRODUCT_NOT_FOUND" ||
      error?.code === "NOT_FOUND" ||
      String(error?.message).toLowerCase().includes("não encontrado")
    ) {
      return null;
    }
    console.warn(`[ProductService] EAN ${ean} não encontrado na base ou catálogo:`, error?.message);
    return null;
  }
};

export const fetchCategories = async (): Promise<string[]> => {
  if (memoryCategoriesCache && Date.now() - memoryCategoriesCache.timestamp < 300000) {
    return memoryCategoriesCache.data;
  }

  try {
    const res = await apiRequest<string[]>("/products/categories", {
      method: "GET",
    });
    if (res && res.length > 0) {
      memoryCategoriesCache = { data: res, timestamp: Date.now() };
    }
    return res || [];
  } catch (error) {
    if (memoryCategoriesCache) return memoryCategoriesCache.data;
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
};

export const fetchPriceHistory = async (
  productId: number | string,
  period?: "7d" | "1m" | "6m" | "1y" | "all" | string,
  limit: number = 15
): Promise<PriceHistoryItem[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (period && period !== "all") queryParams.append("period", period);
    if (limit) queryParams.append("limit", String(limit));
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    return await apiRequest<PriceHistoryItem[]>(`/products/${productId}/history${queryString}`, {
      method: "GET",
    });
  } catch (error) {
    console.error(`Erro ao buscar histórico de preços do produto ${productId}:`, error);
    return [];
  }
};

export const createCustomProduct = async (data: CreateProductParams): Promise<ProductData> => {
  return apiRequest<ProductData>("/products/custom", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateProduct = async (id: number | string, data: UpdateProductParams): Promise<ProductData> => {
  return apiRequest<ProductData>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: number | string): Promise<boolean> => {
  const res = await apiRequest<{ deleted: boolean; id: number }>(`/products/${id}`, {
    method: "DELETE",
  });
  return res?.deleted ?? true;
};

export interface ReportProductParams {
  reason: string;
  description?: string;
}

export const reportProduct = async (
  id: number | string,
  data: ReportProductParams,
): Promise<{ reported: boolean; message: string }> => {
  return apiRequest<{ reported: boolean; message: string }>(`/products/${id}/report`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};



