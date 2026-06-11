import { request } from "./api";

export interface Ocurrency {
  id: number;
  userId: number;
  marketId: number;
  productId: number;
  value: string;
  trustFlag: boolean;
  isSuspended: boolean;
  isResolved: boolean;
  upvoteCount: number;
  downvoteCount: number;
  volate: boolean;
  createdAt: string;
}

export interface CreateOcurrencyPayload {
  marketId: number;
  productId: number;
  value: number;
}

export interface GetEntriesParams {
  market_id?: number;
  product_id?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}

/**
 * Cria uma nova ocorrência de preço (crowdsourcing).
 */
export async function createEntry(
  payload: CreateOcurrencyPayload,
): Promise<Ocurrency> {
  return request<Ocurrency>("/api/v1/entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Lista ocorrências com filtros opcionais de mercado, produto e localização.
 */
export async function getEntries(
  params: GetEntriesParams,
): Promise<Ocurrency[]> {
  const query = new URLSearchParams();

  if (params.market_id != null) query.set("market_id", String(params.market_id));
  if (params.product_id != null) query.set("product_id", String(params.product_id));
  if (params.lat != null) query.set("lat", String(params.lat));
  if (params.lng != null) query.set("lng", String(params.lng));
  if (params.radius != null) query.set("radius", String(params.radius));

  return request<Ocurrency[]>(`/api/v1/entries?${query.toString()}`);
}
