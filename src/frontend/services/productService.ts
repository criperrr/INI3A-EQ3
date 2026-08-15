import { apiRequest } from "./api";

export interface ProductData {
  barcode?: string;
  name: string;
  category: string;
  imageUri?: string;
  lastPrice?: string;
}

export const fetchProductByEan = async (ean: string): Promise<ProductData | null> => {
  try {
    const response = await apiRequest<ProductData>(`/products/barcode/${ean}`, {
      method: "GET",
    });
    return response;
  } catch (error: any) {
    if (error?.status === 404 || error?.code === "PRODUCT_NOT_FOUND") {
      return null;
    }
    console.error(`Erro de comunicação ao buscar EAN ${ean}:`, error);
    throw error;
  }
};

export const createCustomProduct = async (data: {
  name: string;
  category?: string;
  icon?: string;
  ean?: string;
}): Promise<ProductData> => {
  return apiRequest<ProductData>("/products/custom", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

