import { apiRequest } from "./api";

export interface MarketData {
  id: number;
  name: string;
  location?: string;
  createdAt?: string;
}

export async function fetchMarkets(): Promise<MarketData[]> {
  try {
    return await apiRequest<MarketData[]>("/markets", {
      method: "GET",
    });
  } catch (error) {
    console.error("[MarketService] Error fetching markets:", error);
    return [];
  }
}

export async function createMarket(
  name: string,
  latitude?: number,
  longitude?: number,
): Promise<MarketData> {
  return apiRequest<MarketData>("/markets", {
    method: "POST",
    body: JSON.stringify({ name, latitude, longitude }),
  });
}
