import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { OsmMarketDiscovery } from "@/shared/services/osmMarketDiscovery.service";
import { NotFoundError } from "@/shared/errors/errors";

class MarketServiceClass {
  async getAllMarkets(params?: { latitude?: number | undefined; longitude?: number | undefined; radius?: number | undefined }) {
    let markets: any[] = [];
    if (params?.latitude !== undefined && params?.longitude !== undefined) {
      const radius = params.radius || 15000;

      // Dynamically discover and sync local real-world supermarkets from OpenStreetMap
      await OsmMarketDiscovery.discoverNearbyMarkets(params.latitude, params.longitude, radius);

      if (params.radius) {
        markets = await MarketRepository.getMarketsByRadius(
          { lat: params.latitude, lng: params.longitude },
          params.radius
        );
      } else {
        markets = await MarketRepository.getAllMarkets({ lat: params.latitude, lng: params.longitude });
      }
    } else {
      markets = await MarketRepository.getAllMarkets();
    }

    return markets.map((m: any) => {
      let formattedDistance: string | null = null;
      if (m.distance !== undefined && m.distance !== null) {
        const d = Number(m.distance);
        if (d < 1000) {
          formattedDistance = `${Math.round(d)} m`;
        } else {
          formattedDistance = `${(d / 1000).toFixed(1).replace(".", ",")} km`;
        }
      }

      return {
        ...m,
        distance: m.distance !== undefined && m.distance !== null ? Number(m.distance) : undefined,
        formattedDistance,
      };
    });
  }

  async getMarketById(id: number | string) {
    const found = await MarketRepository.getMarket(id);
    if (!found || found.length === 0) {
      throw new NotFoundError("Mercado não encontrado.");
    }
    return found[0];
  }

  async createMarket(data: { name: string; latitude?: number | undefined; longitude?: number | undefined }) {
    const location = {
      lat: data.latitude || -23.55052,
      lng: data.longitude || -46.633308,
    };


    const [created] = await MarketRepository.createMarket({
      name: data.name.trim(),
      location,
    });

    return created;
  }
}

export const marketService = new MarketServiceClass();
