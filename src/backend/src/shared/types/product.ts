export interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_pt?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  [key: string]: any; // Permite outras propriedades da API
}

export interface OpenFoodFactsResponse {
  code: string;
  product: OpenFoodFactsProduct;
  status: number;
  status_verbose: string;
}

export interface ProductInfo {
  barcode: string;
  name: string;
  category: string;
  imageUri: string | null;
  lastPrice: string;
}
