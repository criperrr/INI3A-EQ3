import { env } from "../config/env";

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface RouteSegmentSummary {
  from: GeoCoordinate;
  to: GeoCoordinate;
  distanceMeters: number;
  durationSeconds: number;
}

export interface OptimizedRouteResult {
  orderedWaypoints: {
    marketId?: number;
    name?: string;
    coordinate: GeoCoordinate;
    stopIndex: number;
  }[];
  totalDistanceMeters: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  totalDurationMinutes: number;
  polyline?: string;
  source: "here_routing_v8" | "haversine_fallback";
}

class RoutingServiceClass {
  private distanceCache = new Map<string, { distanceMeters: number; durationSeconds: number; timestamp: number }>();
  private CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Calculates straight-line Haversine distance in meters between two coordinates.
   */
  calculateHaversineDistance(c1: GeoCoordinate, c2: GeoCoordinate): number {
    const toRadians = Math.PI / 180;
    const dLat = (c2.lat - c1.lat) * toRadians;
    const dLng = (c2.lng - c1.lng) * toRadians;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c1.lat * toRadians) * Math.cos(c2.lat * toRadians) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(6371000 * c); // Earth radius in meters
  }

  /**
   * Estimates driving distance and duration via Haversine multiplied by a typical urban tortuosity factor (1.35)
   * and average urban speed of 32 km/h.
   */
  estimateDrivingHaversine(c1: GeoCoordinate, c2: GeoCoordinate): { distanceMeters: number; durationSeconds: number } {
    const straightMeters = this.calculateHaversineDistance(c1, c2);
    const drivingMeters = Math.round(straightMeters * 1.35);
    const speedMps = (32 * 1000) / 3600; // 32 km/h in m/s
    const durationSeconds = Math.max(60, Math.round(drivingMeters / speedMps));
    return { distanceMeters: drivingMeters, durationSeconds };
  }

  /**
   * Fetches driving distance and duration between two points using HERE Routing API v8,
   * falling back gracefully to Haversine on timeout or error.
   */
  async getDrivingPair(
    from: GeoCoordinate,
    to: GeoCoordinate
  ): Promise<{ distanceMeters: number; durationSeconds: number; source: "here_routing_v8" | "haversine_fallback" }> {
    const cacheKey = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    const cached = this.distanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        distanceMeters: cached.distanceMeters,
        durationSeconds: cached.durationSeconds,
        source: "here_routing_v8",
      };
    }

    const apiKey = env.HERE_API_KEY || process.env.HERE_API_KEY || "";
    if (!apiKey) {
      const estimate = this.estimateDrivingHaversine(from, to);
      return { ...estimate, source: "haversine_fallback" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&return=summary&apiKey=${apiKey}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        const summary = data.routes?.[0]?.sections?.[0]?.summary;
        if (summary && typeof summary.length === "number") {
          const distanceMeters = summary.length;
          const durationSeconds = summary.duration || Math.round(distanceMeters / 9); // default ~32km/h
          this.distanceCache.set(cacheKey, { distanceMeters, durationSeconds, timestamp: Date.now() });
          return { distanceMeters, durationSeconds, source: "here_routing_v8" };
        }
      }
    } catch {
      // Fallback on network error or abort
    }

    const fallback = this.estimateDrivingHaversine(from, to);
    return { ...fallback, source: "haversine_fallback" };
  }

  /**
   * Computes the optimal multi-stop round-trip route starting at user origin,
   * visiting all specified candidate stops in optimal sequence (TSP), and returning to origin.
   */
  async computeOptimalRoute(
    origin: GeoCoordinate,
    stops: { marketId: number; name: string; coordinate: GeoCoordinate }[],
    isRoundTrip: boolean = true
  ): Promise<OptimizedRouteResult> {
    if (stops.length === 0) {
      return {
        orderedWaypoints: [],
        totalDistanceMeters: 0,
        totalDistanceKm: 0,
        totalDurationSeconds: 0,
        totalDurationMinutes: 0,
        source: "haversine_fallback",
      };
    }

    // Single stop
    if (stops.length === 1) {
      const single = stops[0];
      if (!single) {
        return {
          orderedWaypoints: [],
          totalDistanceMeters: 0,
          totalDistanceKm: 0,
          totalDurationSeconds: 0,
          totalDurationMinutes: 0,
          source: "haversine_fallback",
        };
      }
      const pair = await this.getDrivingPair(origin, single.coordinate);
      const mult = isRoundTrip ? 2 : 1;
      const totalDistanceMeters = pair.distanceMeters * mult;
      const totalDurationSeconds = pair.durationSeconds * mult;

      return {
        orderedWaypoints: [
          {
            marketId: single.marketId,
            name: single.name,
            coordinate: single.coordinate,
            stopIndex: 1,
          },
        ],
        totalDistanceMeters,
        totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2)),
        totalDurationSeconds,
        totalDurationMinutes: Math.round(totalDurationSeconds / 60),
        source: pair.source,
      };
    }

    // For 2 to 4 stops, evaluate all permutations to find the minimal distance route
    const permutations = this.getPermutations(stops);
    let bestPermutation = permutations[0] || stops;
    let minDistance = Infinity;
    let bestDuration = Infinity;
    let dominantSource: "here_routing_v8" | "haversine_fallback" = "haversine_fallback";

    for (const perm of permutations) {
      let currentDistance = 0;
      let currentDuration = 0;
      let currentCoord = origin;

      for (const stop of perm) {
        const pair = await this.getDrivingPair(currentCoord, stop.coordinate);
        currentDistance += pair.distanceMeters;
        currentDuration += pair.durationSeconds;
        currentCoord = stop.coordinate;
        if (pair.source === "here_routing_v8") {
          dominantSource = "here_routing_v8";
        }
      }

      // Return trip back to origin if round-trip enabled
      if (isRoundTrip) {
        const returnPair = await this.getDrivingPair(currentCoord, origin);
        currentDistance += returnPair.distanceMeters;
        currentDuration += returnPair.durationSeconds;
      }

      if (currentDistance < minDistance) {
        minDistance = currentDistance;
        bestDuration = currentDuration;
        bestPermutation = perm;
      }
    }

    return {
      orderedWaypoints: bestPermutation.map((stop, idx) => ({
        marketId: stop.marketId,
        name: stop.name,
        coordinate: stop.coordinate,
        stopIndex: idx + 1,
      })),
      totalDistanceMeters: minDistance,
      totalDistanceKm: Number((minDistance / 1000).toFixed(2)),
      totalDurationSeconds: bestDuration,
      totalDurationMinutes: Math.round(bestDuration / 60),
      source: dominantSource,
    };
  }

  private getPermutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      if (current === undefined) continue;
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const subPerms = this.getPermutations(remaining);
      for (const sub of subPerms) {
        result.push([current, ...sub]);
      }
    }
    return result;
  }
}

export const RoutingService = new RoutingServiceClass();
