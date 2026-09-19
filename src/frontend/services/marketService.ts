import { apiRequest } from "./api";

export interface MarketData {
  id: number;
  name: string;
  location?: string;
  createdAt?: string;
  distance?: number;
  formattedDistance?: string | null;
}

const marketsLocationCache = new Map<string, { data: MarketData[]; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

export async function fetchMarkets(params?: { latitude?: number; longitude?: number; radius?: number }): Promise<MarketData[]> {
  const hasCoords = params?.latitude !== undefined && params?.longitude !== undefined;
  const cacheKey = hasCoords
    ? `${params.latitude!.toFixed(3)}_${params.longitude!.toFixed(3)}_${params.radius || 15000}`
    : "none";

  const cached = marketsLocationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
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
    if (data.length > 0) {
      marketsLocationCache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
  } catch (error) {
    if (cached) return cached.data;
    console.warn("[MarketService] Error fetching markets:", error);
    return [];
  }
}

export async function createMarket(
  name: string,
  latitude?: number,
  longitude?: number,
): Promise<MarketData> {
  marketsLocationCache.clear();
  return apiRequest<MarketData>("/markets", {
    method: "POST",
    body: JSON.stringify({ name, latitude, longitude }),
  });
}
