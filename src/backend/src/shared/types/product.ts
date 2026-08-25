export interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_pt?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  [key: string]: any;
}

export interface OpenFoodFactsResponse {
  code: string;
  product: OpenFoodFactsProduct;
  status: number;
  status_verbose: string;
}

export interface ProductInfo {
  id?: number;
  barcode: string;
  name: string;
  category: string;
  imageUri: string | null;
  lastPrice: string;
}

export interface PriceHistoryItem {
  id: number;
  value: number;
  formattedValue: string;
  marketId: number;
  marketName: string;
  createdAt: string;
}

export interface ProductDTO {
  id: number;
  barcode: string;
  ean: string | null;
  ncm: string | null;
  name: string;
  description: string;
  category: string;
  imageUri: string | null;
  icon: string | null;
  createdAt: string;
  lastPrice: string;
  minPrice?: string | null;
  maxPrice?: string | null;
  avgPrice?: string | null;
  occurrencesCount?: number;
}

export interface ProductDetailDTO extends ProductDTO {
  priceHistory: PriceHistoryItem[];
}

export interface SearchProductsQuery {
  search?: string | undefined;
  category?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: "name" | "createdAt" | "id" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface PaginatedProductsResult {
  items: ProductDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductDTO {
  name: string;
  ean?: string | undefined;
  ncm?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
}

export interface UpdateProductDTO {
  name?: string | undefined;
  ean?: string | undefined;
  ncm?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
}

export interface ProductCategoryDTO {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  description: string;
}


