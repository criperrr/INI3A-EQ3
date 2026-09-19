import * as Location from "expo-location";
import { Platform } from "react-native";

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

// Module-level session memory cache for 0ms instant UI responses
let sessionLocationCache: { coords: UserCoordinates; timestamp: number } | null = null;
const CACHE_TTL_MS = 45000; // 45 seconds

export async function getUserLocation(): Promise<UserCoordinates | null> {
  const now = Date.now();
  if (sessionLocationCache && now - sessionLocationCache.timestamp < CACHE_TTL_MS) {
    return sessionLocationCache.coords;
  }

  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
      finalStatus = requestedStatus;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // 1. Try instant last known position first
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords) {
      const coords: UserCoordinates = {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
      sessionLocationCache = { coords, timestamp: now };
    }

    // 2. Fetch fresh balanced accuracy location with a 3.5s timeout
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Platform.OS === "android" ? Location.Accuracy.Balanced : Location.Accuracy.Low,
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const freshLocation: any = await Promise.race([locationPromise, timeoutPromise]);

    if (freshLocation?.coords) {
      const freshCoords: UserCoordinates = {
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
      };
      sessionLocationCache = { coords: freshCoords, timestamp: Date.now() };
      return freshCoords;
    }

    if (sessionLocationCache) {
      return sessionLocationCache.coords;
    }

    return null;
  } catch (err) {
    console.warn("[userLocation] Não foi possível obter localização:", err);
    return sessionLocationCache?.coords || null;
  }
}
