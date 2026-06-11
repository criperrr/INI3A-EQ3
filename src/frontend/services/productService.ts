import { request } from "./api";

export interface Product {
  id: number;
  name: string;
  ean?: string | null;
  ncm?: string | null;
  description?: string | null;
  icon?: string | null;
  best_price?: number | null;
  market_name?: string | null;
  distance_m?: number | null;
}

export interface Offer {
  ocurrency_id: number;
  price: string;
  market_id: number;
  market_name: string;
  distance_m: number | null;
  created_at: string;
}

export interface ProductDetailResponse extends Product {
  offers: Offer[];
}

export interface SearchProductsParams {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  cursor?: number;
}

/**
 * Busca produtos por nome (fuzzy via pg_trgm) ou EAN.
 * Retorna lista com até 20 resultados com preço mais baixo local quando lat/lng fornecidos.
 */
export async function searchProducts(
  params: SearchProductsParams,
): Promise<Product[]> {
  const query = new URLSearchParams({ q: params.q });

  if (params.lat != null) query.set("lat", String(params.lat));
  if (params.lng != null) query.set("lng", String(params.lng));
  if (params.radius != null) query.set("radius", String(params.radius));
  if (params.cursor != null) query.set("cursor", String(params.cursor));

  return request<Product[]>(`/api/v1/products/search?${query.toString()}`);
}

/**
 * Retorna detalhes de um produto específico por ID, incluindo ofertas de preço locais.
 */
export async function getProduct(
  id: number,
  lat?: number,
  lng?: number,
): Promise<ProductDetailResponse> {
  const query = new URLSearchParams();
  if (lat != null) query.set("lat", String(lat));
  if (lng != null) query.set("lng", String(lng));

  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request<ProductDetailResponse>(`/api/v1/products/${id}${queryString}`);
}

/**
 * Busca detalhes de um produto específico por código de barras (EAN).
 * Se não existir no banco de dados local, a API tenta buscar via Open Food Facts.
 */
export async function getProductByBarcode(ean: string): Promise<Product> {
  return request<Product>(`/api/v1/products/barcode/${ean}`);
}

/**
 * Cria um novo produto no catálogo global.
 */
export async function createProduct(payload: {
  name: string;
  ean?: string;
  ncm?: string;
  description?: string;
}): Promise<Product> {
  return request<Product>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
