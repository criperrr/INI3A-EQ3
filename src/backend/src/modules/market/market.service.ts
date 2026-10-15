import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { HereMarketDiscovery } from "@/shared/services/hereMarketDiscovery.service";
import { NotFoundError, ValidationError } from "@/shared/errors/errors";
import { RoutingService } from "@/shared/services/routing.service";

class MarketServiceClass {
  async getAllMarkets(params?: { latitude?: number | undefined; longitude?: number | undefined; radius?: number | undefined; includeAll?: boolean | undefined }) {
    let markets: any[] = [];
    if (params?.latitude !== undefined && params?.longitude !== undefined) {
      const radius = params.radius && params.radius > 0 ? params.radius : 15000;

      // 1. Query existing markets in database within user's radius
      markets = await MarketRepository.getMarketsByRadius(
        { lat: params.latitude, lng: params.longitude },
        radius
      );

      // 2. If no markets found locally, dynamically discover via HERE Location Services and save to DB
      // with a safe 3.5s timeout race so the user immediately gets real supermarkets on their first request.
      if (!markets || markets.length === 0) {
        try {
          const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3500));
          await Promise.race([
            HereMarketDiscovery.discoverNearbyMarkets(params.latitude, params.longitude, radius),
            timeoutPromise,
          ]);
          markets = await MarketRepository.getMarketsByRadius(
            { lat: params.latitude, lng: params.longitude },
            radius
          );
        } catch (err) {
          console.warn("[MarketService] Erro ao sincronizar mercados via HERE API:", err);
        }
      } else {
        // Continuous background discovery to keep adding newly mapped neighborhood stores
        HereMarketDiscovery.discoverNearbyMarkets(params.latitude, params.longitude, radius).catch(() => {});
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

  private validateMarketCoordinates(latitude: any, longitude: any): { lat: number; lng: number } {
    if (
      latitude === undefined ||
      latitude === null ||
      isNaN(Number(latitude)) ||
      longitude === undefined ||
      longitude === null ||
      isNaN(Number(longitude))
    ) {
      throw new ValidationError([
        { field: "location", message: "Coordenadas de latitude e longitude são obrigatórias e devem ser números válidos." },
      ]);
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (lat < -34.0 || lat > 5.5 || lng < -74.0 || lng > -34.5) {
      throw new ValidationError([
        { field: "location", message: "Coordenadas fora dos limites do território brasileiro (latitude entre -34.0 e +5.5, longitude entre -74.0 e -34.5)." },
      ]);
    }

    const distanceToMarcoZero = RoutingService.calculateHaversineDistance(
      { lat, lng },
      { lat: -23.55052, lng: -46.633308 }
    );

    if (distanceToMarcoZero <= 50) {
      throw new ValidationError([
        { field: "location", message: "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé." },
      ]);
    }

    return { lat, lng };
  }

  async createMarket(data: { name: string; latitude: number; longitude: number }) {
    const location = this.validateMarketCoordinates(data.latitude, data.longitude);

    const [created] = await MarketRepository.createMarket({
      name: data.name.trim(),
      location,
    });

    return created;
  }

  async updateMarket(id: number | string, data: { name?: string | undefined; latitude?: number | undefined; longitude?: number | undefined }) {
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.latitude !== undefined || data.longitude !== undefined) {
      updateData.location = this.validateMarketCoordinates(data.latitude, data.longitude);
    }

    const updated = await MarketRepository.updateMarket(id, updateData);
    if (!updated || updated.length === 0) {
      throw new NotFoundError("Mercado não encontrado.");
    }
    return updated[0];
  }

  async deleteMarket(id: number | string) {
    const count = await MarketRepository.deleteMarket(id);
    if (!count) {
      throw new NotFoundError("Mercado não encontrado.");
    }
    return { deleted: true, id: Number(id) };
  }

  async reallocateMarkets() {
    const { executeReallocation } = await import("@/shared/database/reallocateMarkets");
    await executeReallocation();
    return { success: true, message: "Mercados e ocorrências realocados com sucesso para os estabelecimentos oficiais." };
  }
}

export const marketService = new MarketServiceClass();
