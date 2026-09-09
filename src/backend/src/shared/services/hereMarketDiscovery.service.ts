import { db } from "../database/database";
import { market } from "../database/schema";
import { sql } from "drizzle-orm";
import { env } from "../config/env";

export interface DiscoveredMarket {
  name: string;
  lat: number;
  lng: number;
  address?: string | undefined;
  openingHours?: string | undefined;
  category?: string | undefined;
}

class HereMarketDiscoveryClass {
  private memoryCache = new Map<string, { timestamp: number; data: DiscoveredMarket[] }>();
  private CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Discovers real-world supermarkets, grocery stores and convenience stores around GPS coordinates
   * using HERE Location Services API (Discover & Browse v7).
   */
  async discoverNearbyMarkets(
    latitude: number,
    longitude: number,
    radiusMeters: number = 15000
  ): Promise<DiscoveredMarket[]> {
    const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const apiKey = env.HERE_API_KEY || process.env.HERE_API_KEY || "";
    if (!apiKey) {
      console.warn("[HereMarketDiscovery] HERE_API_KEY não configurada. Pulei descoberta dinâmica.");
      return [];
    }

    const discovered: DiscoveredMarket[] = [];
    const seenCoordinates = new Set<string>();

    const addIfUnique = (
      name: string,
      lat: number,
      lng: number,
      address?: string,
      openingHours?: string,
      category?: string
    ) => {
      const cleanName = this.normalizeMarketName(name);
      if (!cleanName || cleanName.length < 3) return;

      const coordKey = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
      if (seenCoordinates.has(coordKey)) return;
      seenCoordinates.add(coordKey);

      // Verify distance is within requested radius
      const dist = this.calculateHaversineDistance(latitude, longitude, lat, lng);
      if (dist <= radiusMeters) {
        discovered.push({
          name: cleanName,
          lat,
          lng,
          address,
          openingHours,
          category,
        });
      }
    };

    // Parallel multi-strategy fetch using HERE Discover (text query) and HERE Browse (categories)
    const fetchPromises = [
      this.fetchFromHereDiscover(latitude, longitude, apiKey),
      this.fetchFromHereBrowse(latitude, longitude, apiKey),
    ];

    try {
      const results = await Promise.allSettled(fetchPromises);
      for (const res of results) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          for (const item of res.value) {
            addIfUnique(
              item.name,
              item.lat,
              item.lng,
              item.address,
              item.openingHours,
              item.category
            );
          }
        }
      }

      // Auto-persist newly discovered markets into PostgreSQL PostGIS database
      if (discovered.length > 0) {
        await this.syncWithDatabase(discovered);
      }

      this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: discovered });
      return discovered;
    } catch (err) {
      console.warn("[HereMarketDiscovery] Erro durante descoberta via HERE API:", err);
      return [];
    }
  }

  /**
   * Queries HERE Discover API with query 'supermercado'
   */
  private async fetchFromHereDiscover(
    lat: number,
    lng: number,
    apiKey: string
  ): Promise<DiscoveredMarket[]> {
    const url = `https://discover.search.hereapi.com/v1/discover?at=${lat},${lng}&q=supermercado&limit=50&apiKey=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[HereMarketDiscovery] HERE Discover HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as any;
      if (!data?.items || !Array.isArray(data.items)) return [];

      return this.parseHereItems(data.items);
    } catch {
      clearTimeout(timer);
      return [];
    }
  }

  /**
   * Queries HERE Browse API filtering for Supermarkets, Groceries, Convenience categories
   * 600-6300-0066 = Supermarket / Hypermarket
   * 600-6300-0067 = Specialty Food / Grocery Store
   * 600-6300-0244 = Convenience Store
   */
  private async fetchFromHereBrowse(
    lat: number,
    lng: number,
    apiKey: string
  ): Promise<DiscoveredMarket[]> {
    const categories = "600-6300-0066,600-6300-0067,600-6300-0244";
    const url = `https://browse.search.hereapi.com/v1/browse?at=${lat},${lng}&categories=${categories}&limit=50&apiKey=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[HereMarketDiscovery] HERE Browse HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as any;
      if (!data?.items || !Array.isArray(data.items)) return [];

      return this.parseHereItems(data.items);
    } catch {
      clearTimeout(timer);
      return [];
    }
  }

  /**
   * Parses items returned by HERE Search v7 APIs
   */
  private parseHereItems(items: any[]): DiscoveredMarket[] {
    const list: DiscoveredMarket[] = [];
    // Reject non-retail or unwanted categories if primary
    const invalidPrimaryCategories = new Set([
      "700-7200-0269", // Organizações e Sociedades
      "800-8500-0178", // Estacionamento
      "700-7400-0000", // Serviços ao Consumidor
      "500-5000-0000", // Hotel
      "100-1000-0000", // Restaurante puro (se não for empório)
    ]);

    for (const item of items) {
      const title = (item.title || "").trim();
      const pos = item.position;
      if (!title || !pos || typeof pos.lat !== "number" || typeof pos.lng !== "number") {
        continue;
      }

      // Category check
      const primaryCat = item.categories?.find((c: any) => c.primary)?.id;
      if (primaryCat && invalidPrimaryCategories.has(primaryCat)) {
        continue;
      }

      const hasMarketCategory = item.categories?.some((c: any) =>
        /supermercado|mercado|aliment|mercearia|conveni|grocery|padaria|bakery/i.test(c.name || "") ||
        ["600-6300-0066", "600-6300-0067", "600-6300-0244"].includes(c.id)
      );
      const hasExcludedCategory = item.categories?.some((c: any) =>
        /estética|estetica|beleza|salão|salao|livraria|embalag|descart|papelaria|gráfica|grafica/i.test(c.name || "")
      );
      if (!hasMarketCategory || hasExcludedCategory) {
        continue;
      }

      // Address label
      const address = item.address?.label;

      // Extract opening hours
      let openingHours: string | undefined;
      if (item.openingHours && Array.isArray(item.openingHours) && item.openingHours.length > 0) {
        const oh = item.openingHours[0];
        if (Array.isArray(oh.text) && oh.text.length > 0) {
          openingHours = oh.text.join(" | ");
        } else if (oh.isOpen !== undefined) {
          openingHours = oh.isOpen ? "Aberto agora" : "Fechado agora";
        }
      }

      const categoryName = item.categories?.[0]?.name || "Supermercado";

      list.push({
        name: title,
        lat: pos.lat,
        lng: pos.lng,
        address,
        openingHours,
        category: categoryName,
      });
    }

    return list;
  }

  /**
   * Synchronizes discovered HERE markets with PostgreSQL PostGIS database without duplicating.
   * Uses spatial proximity deduplication (< 100m or same name < 500m) rather than global name matching,
   * allowing real supermarket chains (e.g. Carrefour, Dia, Pão de Açúcar) to exist in multiple neighborhoods/cities.
   */
  private async syncWithDatabase(discovered: DiscoveredMarket[]): Promise<void> {
    try {
      for (const item of discovered) {
        const wktPoint = `POINT(${item.lng} ${item.lat})`;

        const [existing] = await db
          .select({ id: market.id, name: market.name })
          .from(market)
          .where(
            sql`
              ST_DWithin(
                ${market.location},
                ST_GeographyFromText(${wktPoint}),
                100
              )
              OR (
                LOWER(TRIM(${market.name})) = LOWER(TRIM(${item.name}))
                AND ST_DWithin(
                  ${market.location},
                  ST_GeographyFromText(${wktPoint}),
                  500
                )
              )
            `
          )
          .limit(1);

        if (!existing) {
          await db.insert(market).values({
            name: item.name,
            location: { lat: item.lat, lng: item.lng } as any,
          });
        }
      }
    } catch (err) {
      console.warn("[HereMarketDiscovery] Erro ao sincronizar mercados no PostGIS:", err);
    }
  }

  /**
   * Cleans and normalizes supermarket names.
   */
  private normalizeMarketName(name: string): string {
    let clean = name.trim();
    if (!clean) return "";

    // Reject pure street names, avenues, roads, alleys, highways
    if (/^(rua|r\.|av\.|avenida|alameda|estrada|rodovia|travessa|tv\.|praça|praca|viela|rod\.)\b/i.test(clean)) {
      return "";
    }

    // Reject pure house numbers or postal codes
    if (/^\d+/.test(clean)) {
      return "";
    }

    // Reject non-retail or unwanted organizations / facilities
    if (
      /\b(estacionamento|parking|sindicato|associação|associacao|conselho|igreja|templo|paróquia|paroquia|escola|colégio|colegio|faculdade|universidade|posto|auto posto|gasolina|farmácia|farmacia|drogaria|academia|lava rápido|lava rapido|oficina|mecânica|mecanica|borracharia|hospital|clínica|clinica|odontologia|consultório|consultorio|livraria|estética|estetica|salão|salao|embalagens|descartáveis|descartaveis|pet shop|veterinári|veterinari|papelaria|gráfica|grafica|lavanderia|banco|lotérica|loterica|bar e lanches|pastelaria|restaurante|chocolates|culturista)\b/i.test(
        clean
      )
    ) {
      return "";
    }

    // Standardize capitalization of initial category words
    clean = clean.replace(/^(supermercado|mercado|hipermercado)\s+/i, (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });

    // If it's just "Supermercado" or "Mercado" without any identifier, reject
    if (/^(supermercado|mercado|loja|mercearia)$/i.test(clean)) {
      return "";
    }
    return clean;
  }

  /**
   * Calculates Haversine distance in meters between two GPS coordinates.
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const HereMarketDiscovery = new HereMarketDiscoveryClass();
