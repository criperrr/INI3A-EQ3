export type ExternalProductSource =
  | "local_database"
  | "openfoodfacts"
  | "brazilian_retail_catalog"
  | "upcitemdb"
  | "cosmos_official_api"
  | "variable_weight_scale"
  | "pending_review"
  | "none";

export interface OpenFoodFactsProduct {
  product_name?: string | undefined;
  product_name_pt?: string | undefined;
  categories?: string | undefined;
  image_url?: string | undefined;
  image_front_url?: string | undefined;
  brands?: string | undefined;
  ncm?: string | undefined;
  reference_price?: number | null | undefined;
  external_source?: ExternalProductSource | undefined;
  external_store?: string | undefined;
  [key: string]: any;
}

export interface OpenFoodFactsResponse {
  code: string;
  product: OpenFoodFactsProduct;
  status: number;
  status_verbose: string;
  source?: ExternalProductSource | undefined;
}

export interface ProductExistenceValidationResult {
  exists: boolean;
  isGs1Valid: boolean;
  gs1Format: string | null;
  isBrazilianPrefix: boolean;
  isVariableWeightCode?: boolean | undefined;
  pluCode?: string | null | undefined;
  canRegisterAsPending?: boolean | undefined;
  source: ExternalProductSource;
  sourceLabel: string;
  confidence: "high" | "medium" | "low" | "none";
  ean: string | null;
  matchedProduct: {
    id?: number | undefined;
    name: string;
    brand: string | null;
    category: string;
    categories: string[];
    imageUri: string | null;
    ncm: string | null;
    referencePrice: number | null;
  } | null;
  reason?: string | undefined;
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
  categories?: string[] | undefined;
  brand?: string | null | undefined;
  imageUri: string | null;
  icon: string | null;
  createdAt: string;
  lastPrice: string;
  bestPrice?: string | null | undefined;
  minPrice?: string | null | undefined;
  maxPrice?: string | null | undefined;
  avgPrice?: string | null | undefined;
  occurrencesCount?: number | undefined;
  nearestMarketName?: string | null | undefined;
  nearestMarketDistance?: number | null | undefined;
  nearestMarketCoordinate?: { latitude: number; longitude: number } | null | undefined;
  formattedDistance?: string | null | undefined;
  isPromotion?: boolean | undefined;
  discountPercentage?: number | null | undefined;
  matchScore?: number | undefined;
  isExactMatch?: boolean | undefined;
  scannedEan?: string | null | undefined;
  isGs1Valid?: boolean | undefined;
  isSuspended?: boolean | undefined;
  pendingApproval?: boolean | undefined;
  quorumUsersCount?: number | undefined;
  quorumTarget?: number | undefined;
  alreadySubmittedByUser?: boolean | undefined;
  verificationStatus?:
    | "verified_catalog"
    | "verified_gs1"
    | "community_verified"
    | "community_submitted"
    | "pending_review"
    | undefined;
}

export interface PendingProductContributor {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  points: number;
  submittedAt: string;
}

export interface PendingProductAdminItem {
  id: number;
  ean: string | null;
  ncm: string | null;
  name: string;
  description: string | null;
  category: string;
  categories: string[];
  icon: string | null;
  isSuspended: boolean;
  isGs1Valid: boolean;
  gs1Format: string | null;
  isBrazilianPrefix: boolean;
  isVariableWeightCode: boolean;
  pluCode: string | null;
  checkDigitExpected: number | null;
  checkDigitActual: number | null;
  quarantineReason: string;
  rewardXpPerUser: number;
  createdByUserId: number | null;
  userName: string | null;
  userEmail: string | null;
  userPoints: number;
  quorumUsersCount: number;
  quorumTarget: number;
  contributors: PendingProductContributor[];
  pendingOccurrencesCount: number;
  createdAt: string;
}

export interface ProductDetailDTO extends ProductDTO {
  priceHistory: PriceHistoryItem[];
}

export interface SearchProductsQuery {
  search?: string | undefined;
  category?: string | undefined;
  marketId?: number | undefined;
  marketName?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: "name" | "createdAt" | "id" | "distance" | "price" | "discount" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  radius?: number | undefined;
  onlyPromotions?: boolean | undefined;
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
  categories?: string[] | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  isPromotion?: boolean | undefined;
  brand?: string | undefined;
  createdAt?: string | Date | undefined;
}

export interface UpdateProductDTO {
  name?: string | undefined;
  ean?: string | undefined;
  ncm?: string | undefined;
  category?: string | undefined;
  categories?: string[] | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  isPromotion?: boolean | undefined;
  brand?: string | undefined;
  createdAt?: string | Date | undefined;
}

export interface ProductCategoryDTO {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  description: string;
}


