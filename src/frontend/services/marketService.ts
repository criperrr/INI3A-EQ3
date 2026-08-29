import { apiRequest } from "./api";

export interface MarketData {
  id: number;
  name: string;
  location?: string;
  createdAt?: string;
  distance?: number;
  formattedDistance?: string | null;
}

let memoryMarketsCache: { data: MarketData[]; timestamp: number } | null = null;

export async function fetchMarkets(params?: { latitude?: number; longitude?: number; radius?: number }): Promise<MarketData[]> {
  const isDefaultQuery = !params || (!params.latitude && !params.longitude);

  if (isDefaultQuery && memoryMarketsCache && Date.now() - memoryMarketsCache.timestamp < 120000) {
    return memoryMarketsCache.data;
  }

  const queryParts: string[] = [];
  if (params?.latitude !== undefined) queryParts.push(`latitude=${params.latitude}`);
  if (params?.longitude !== undefined) queryParts.push(`longitude=${params.longitude}`);
  if (params?.radius !== undefined) queryParts.push(`radius=${params.radius}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  try {
    const res = await apiRequest<MarketData[]>(`/markets${queryString}`, {
      method: "GET",
    });
    const data = res || [];
    if (isDefaultQuery && data.length > 0) {
      memoryMarketsCache = { data, timestamp: Date.now() };
    }
    return data;
  } catch (error) {
    if (isDefaultQuery && memoryMarketsCache) return memoryMarketsCache.data;
    console.warn("[MarketService] Error fetching markets:", error);
    return [];
  }
}

export async function createMarket(
  name: string,
  latitude?: number,
  longitude?: number,
): Promise<MarketData> {
  memoryMarketsCache = null;
  return apiRequest<MarketData>("/markets", {
    method: "POST",
    body: JSON.stringify({ name, latitude, longitude }),
  });
}
