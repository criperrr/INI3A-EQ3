import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { NotFoundError } from "@/shared/errors/errors";

class MarketServiceClass {
  async getAllMarkets() {
    return MarketRepository.getAllMarkets();
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
