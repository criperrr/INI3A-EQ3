import { request } from "./api";

export interface Market {
  id: number;
  name: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance_m?: number;
  createdAt?: string;
}

export interface GetMarketsParams {
  lat: number;
  lng: number;
  radius?: number;
}

/**
 * Retorna mercados próximos à localização fornecida.
 * @param params.lat  Latitude do usuário
 * @param params.lng  Longitude do usuário
 * @param params.radius Raio de busca em metros (padrão 5000m)
 */
export async function getMarkets(params: GetMarketsParams): Promise<Market[]> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });

  if (params.radius != null) {
    query.set("radius", String(params.radius));
  }

  return request<Market[]>(`/api/v1/markets?${query.toString()}`);
}

/**
 * Retorna detalhes de um mercado por ID.
 */
export async function getMarket(id: number): Promise<Market> {
  return request<Market>(`/api/v1/markets/${id}`);
}
