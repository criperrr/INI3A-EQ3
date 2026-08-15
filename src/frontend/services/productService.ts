import { apiRequest } from "./api";

export interface ProductItem {
  id: number;
  ean: string | null;
  ncm: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  lastPrice?: string;
}

export interface ProductData {
  id?: number;
  barcode?: string;
  name: string;
  category: string;
  imageUri?: string | null;
  lastPrice?: string;
}

export interface CreateProductPayload {
  name: string;
  ean?: string;
  ncm?: string;
  description?: string;
  icon?: string;
}

export interface UpdateProductPayload {
  name?: string;
  ean?: string;
  ncm?: string;
  description?: string;
  icon?: string;
}

export const fetchProducts = async (
  search?: string,
  limit?: number,
  offset?: number
): Promise<ProductItem[]> => {
  try {
    const params = new URLSearchParams();
    if (search && search.trim()) params.append("search", search.trim());
    if (limit) params.append("limit", String(limit));
    if (offset) params.append("offset", String(offset));

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest<ProductItem[]>(`/products${queryString}`, {
      method: "GET",
    });
    return response || [];
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
};

export const fetchProductById = async (id: number): Promise<ProductItem | null> => {
  try {
    const response = await apiRequest<ProductItem>(`/products/${id}`, {
      method: "GET",
    });
    return response || null;
  } catch (error) {
    console.error(`Erro ao buscar produto por ID ${id}:`, error);
    return null;
  }
};

export const fetchProductByEan = async (ean: string): Promise<ProductData | null> => {
  try {
    const response = await apiRequest<ProductData>(`/products/barcode/${ean}`, {
      method: "GET",
    });
    return response;
  } catch (error) {
    console.error(`Erro ao buscar produto com EAN ${ean}:`, error);
    return null;
  }
};

export const createProduct = async (
  data: CreateProductPayload
): Promise<ProductItem> => {
  return apiRequest<ProductItem>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateProduct = async (
  id: number,
  data: UpdateProductPayload
): Promise<ProductItem> => {
  return apiRequest<ProductItem>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: number): Promise<boolean> => {
  await apiRequest<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
  });
  return true;
};

