import { db } from "../database/database";
import { market } from "../database/schema";
import { sql } from "drizzle-orm";

interface DiscoveredMarket {
  name: string;
  lat: number;
  lng: number;
}

class OsmMarketDiscoveryClass {
  private memoryCache = new Map<string, { timestamp: number; data: DiscoveredMarket[] }>();
  private CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Discovers real-world supermarkets and grocery stores around GPS coordinates using OpenStreetMap (Photon + Nominatim + Overpass).
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

    const discovered: DiscoveredMarket[] = [];
    const seenCoordinates = new Set<string>();

    const addIfUnique = (name: string, lat: number, lng: number) => {
      const cleanName = this.normalizeMarketName(name);
      if (!cleanName || cleanName.length < 3) return;

      const coordKey = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
      if (seenCoordinates.has(coordKey)) return;
      seenCoordinates.add(coordKey);

      // Verify distance is within radius bounds
      const dist = this.calculateHaversineDistance(latitude, longitude, lat, lng);
      if (dist <= radiusMeters) {
        discovered.push({ name: cleanName, lat, lng });
      }
    };

    // Parallel multi-source fetch with strict timeout
    const fetchPromises = [
      this.fetchFromPhoton(latitude, longitude).catch(() => []),
      this.fetchFromNominatim(latitude, longitude, radiusMeters).catch(() => []),
      this.fetchFromOverpass(latitude, longitude, radiusMeters).catch(() => []),
    ];

    try {
      const results = await Promise.allSettled(fetchPromises);
      for (const res of results) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          for (const item of res.value) {
            addIfUnique(item.name, item.lat, item.lng);
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
      console.warn("[OsmMarketDiscovery] Error during dynamic discovery:", err);
      return [];
    }
  }

  /**
   * Queries Photon Komoot OpenStreetMap API
   */
  private async fetchFromPhoton(lat: number, lng: number): Promise<DiscoveredMarket[]> {
    const url = `https://photon.komoot.io/api/?q=supermercado&lat=${lat}&lon=${lng}&limit=25`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "PrescoApp/1.0 (contact@presco.app)" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return [];
      const data = (await res.json()) as any;
      if (!data?.features || !Array.isArray(data.features)) return [];

      const list: DiscoveredMarket[] = [];
      const validTypes = new Set(["supermarket", "grocery", "convenience", "wholesale", "department_store"]);

      for (const f of data.features) {
        const name = f.properties?.name;
        const coords = f.geometry?.coordinates;
        const osmValue = f.properties?.osm_value;

        if (name && coords && coords.length >= 2 && (!osmValue || validTypes.has(osmValue))) {
          list.push({
            name,
            lat: Number(coords[1]),
            lng: Number(coords[0]),
          });
        }
      }
      return list;
    } catch {
      clearTimeout(timer);
      return [];
    }
  }

  /**
   * Queries OpenStreetMap Nominatim Bounding Box API
   */
  private async fetchFromNominatim(lat: number, lng: number, radiusMeters: number): Promise<DiscoveredMarket[]> {
    const delta = Math.min(0.2, Math.max(0.04, (radiusMeters / 111320) * 1.2));
    const minLng = lng - delta;
    const maxLng = lng + delta;
    const minLat = lat - delta;
    const maxLat = lat + delta;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=supermercado&bounded=1&viewbox=${minLng},${maxLat},${maxLng},${minLat}&limit=25`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "PrescoApp/1.0 (contact@presco.app)" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return [];
      const data = (await res.json()) as any;
      if (!Array.isArray(data)) return [];

      const list: DiscoveredMarket[] = [];
      for (const d of data) {
        const name = d.name || (d.display_name ? d.display_name.split(",")[0] : null);
        const dLat = Number(d.lat);
        const dLng = Number(d.lon);
        if (name && !isNaN(dLat) && !isNaN(dLng)) {
          list.push({ name, lat: dLat, lng: dLng });
        }
      }
      return list;
    } catch {
      clearTimeout(timer);
      return [];
    }
  }

  /**
   * Queries Overpass OpenStreetMap API
   */
  private async fetchFromOverpass(lat: number, lng: number, radiusMeters: number): Promise<DiscoveredMarket[]> {
    const query = `[out:json][timeout:4];(nwr["shop"~"supermarket|convenience|grocery|wholesale"](around:${Math.min(radiusMeters, 15000)},${lat},${lng}););out center 25;`;
    const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "PrescoApp/1.0 (contact@presco.app)" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return [];
      const data = (await res.json()) as any;
      if (!data?.elements || !Array.isArray(data.elements)) return [];

      const list: DiscoveredMarket[] = [];
      for (const el of data.elements) {
        const name = el.tags?.name || el.tags?.brand;
        const eLat = Number(el.lat || el.center?.lat);
        const eLng = Number(el.lon || el.center?.lon);
        if (name && !isNaN(eLat) && !isNaN(eLng)) {
          list.push({ name, lat: eLat, lng: eLng });
        }
      }
      return list;
    } catch {
      clearTimeout(timer);
      return [];
    }
  }

  /**
   * Synchronizes discovered OpenStreetMap markets with PostgreSQL PostGIS database without duplicating.
   */
  private async syncWithDatabase(discovered: DiscoveredMarket[]): Promise<void> {
    try {
      for (const item of discovered) {
        const wktPoint = `POINT(${item.lng} ${item.lat})`;

        // Check if a market with close proximity (< 75m) or exact same name already exists
        const [existing] = await db
          .select({ id: market.id, name: market.name })
          .from(market)
          .where(
            sql`
              ST_DWithin(
                ${market.location},
                ST_GeographyFromText(${wktPoint}),
                75
              )
              OR LOWER(TRIM(${market.name})) = LOWER(TRIM(${item.name}))
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
      console.warn("[OsmMarketDiscovery] Error syncing discovered markets to database:", err);
    }
  }

  /**
   * Cleans and normalizes supermarket names.
   */
  private normalizeMarketName(name: string): string {
    let clean = name.trim();
    // Remove unwanted street numbers or postal codes attached directly
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

export const OsmMarketDiscovery = new OsmMarketDiscoveryClass();
