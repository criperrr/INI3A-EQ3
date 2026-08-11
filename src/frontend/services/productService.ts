import { apiRequest } from "./api";

export interface ProductData {
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
  } catch (error) {
    console.error(`Erro ao buscar produto com EAN ${ean}:`, error);
    return null; // Retorna nulo se o produto não for encontrado ou houver erro
  }
};
