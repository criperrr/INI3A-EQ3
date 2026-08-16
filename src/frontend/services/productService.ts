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
  minPrice?: string | null;
  maxPrice?: string | null;
  avgPrice?: string | null;
  occurrencesCount?: number;
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
  sortBy?: "name" | "createdAt" | "id";
  sortOrder?: "asc" | "desc";
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

export const fetchProducts = async (params?: FetchProductsParams): Promise<PaginatedProductsData> => {
  const queryParts: string[] = [];
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  if (params?.category && params.category !== "Todos") queryParts.push(`category=${encodeURIComponent(params.category.trim())}`);
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
  if (params?.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  try {
    return await apiRequest<PaginatedProductsData>(`/products${queryString}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
};

export const fetchProductById = async (id: number | string): Promise<ProductDetailData | null> => {
  try {
    return await apiRequest<ProductDetailData>(`/products/${id}`, {
      method: "GET",
    });
  } catch (error: any) {
    if (error?.status === 404 || error?.code === "NOT_FOUND" || error?.code === "PRODUCT_NOT_FOUND") {
      return null;
    }
    console.error(`Erro ao buscar produto por ID ${id}:`, error);
    throw error;
  }
};

export const fetchProductByEan = async (ean: string): Promise<ProductData | null> => {
  try {
    const response = await apiRequest<ProductData>(`/products/barcode/${encodeURIComponent(ean.trim())}`, {
      method: "GET",
    });
    return response;
  } catch (error: any) {
    if (error?.status === 404 || error?.code === "PRODUCT_NOT_FOUND" || error?.code === "NOT_FOUND") {
      return null;
    }
    console.error(`Erro de comunicação ao buscar EAN ${ean}:`, error);
    throw error;
  }
};

export const fetchCategories = async (): Promise<string[]> => {
  try {
    return await apiRequest<string[]>("/products/categories", {
      method: "GET",
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
};

export const fetchPriceHistory = async (productId: number | string): Promise<PriceHistoryItem[]> => {
  try {
    return await apiRequest<PriceHistoryItem[]>(`/products/${productId}/history`, {
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


