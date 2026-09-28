import * as Location from "expo-location";
import { Linking, Share } from "react-native";
import { getUserLocation } from "./userLocation";
import type { OptimizationResult } from "../services/cartService";
import {
  OpenMapOptions,
  buildGoogleMapsQueryText,
  buildGoogleMapsUrl,
  buildGoogleMapsRouteUrl,
  formatAddressParts,
  formatCartShareMessage,
} from "./mapQueryBuilder";

export * from "./mapQueryBuilder";

// In-memory cache for reverse-geocoded addresses to avoid duplicate queries
const geocodeCache = new Map<string, string>();

/**
 * Resolves a readable street address from GPS coordinates using Expo's native reverse geocoder.
 */
export async function resolveAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const item = results[0]!;
      const streetPart = item.street
        ? item.streetNumber ? `${item.street}, ${item.streetNumber}` : item.street
        : (item.name && item.name !== item.street ? item.name : "");

      const formatted = formatAddressParts([
        streetPart,
        item.district,
        item.city || item.subregion,
        item.region,
      ]);

      if (formatted) {
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (err) {
    // Reverse geocoding can fail if device is offline or permissions are restricted
  }

  return null;
}

/**
 * Builds a search query that searches Google Maps' place database by establishment name and nominal address,
 * resolving GPS coordinates via reverse geocoding if nominal address is not yet known.
 */
export async function buildGoogleMapsQuery(options: OpenMapOptions): Promise<string> {
  const { marketName, address, coordinate } = options;

  let resolvedAddress = address?.trim() || "";

  // If no nominal address is provided, resolve from coordinates using reverse geocoding
  if (!resolvedAddress && coordinate && !isNaN(coordinate.latitude) && !isNaN(coordinate.longitude)) {
    const geo = await resolveAddressFromCoordinates(coordinate.latitude, coordinate.longitude);
    if (geo) {
      resolvedAddress = geo;
    }
  }

  const cleanName = marketName?.trim() || "";

  if (cleanName && resolvedAddress) {
    return `${cleanName}, ${resolvedAddress}`;
  }

  if (cleanName) {
    // Only market name available: attempt to suffix with user's current city for local disambiguation
    let userCitySuffix = "";
    try {
      const userLoc = await getUserLocation();
      if (userLoc) {
        const userAddress = await resolveAddressFromCoordinates(userLoc.latitude, userLoc.longitude);
        if (userAddress) {
          const parts = userAddress.split(",").map((s) => s.trim());
          userCitySuffix = parts.slice(-2).join(", ");
        }
      }
    } catch {}

    return userCitySuffix ? `${cleanName}, ${userCitySuffix}` : cleanName;
  }

  return buildGoogleMapsQueryText({ marketName, address: resolvedAddress, coordinate });
}

/**
 * Opens Google Maps searching for the place by name and address.
 * If mode === "search" (default), opens Google Maps Search (/search/?api=1&query=...),
 * displaying Google's official place profile and place list instead of a dropped pin.
 * If mode === "directions", opens directions (/dir/?api=1&destination=...) using the resolved place query.
 */
export async function openMarketInGoogleMaps(options: OpenMapOptions): Promise<boolean> {
  try {
    const query = await buildGoogleMapsQuery(options);
    if (!query) return false;

    let url: string;
    if (options.mode === "directions") {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn("[MapNavigation] Error opening Google Maps:", error);
    return false;
  }
}

/**
 * Builds a universal Google Maps navigation route URL across all stores in the cart itinerary,
 * returning to the user's current location address.
 * Omits 'origin' so Google Maps automatically starts from the live device GPS ("Sua localização").
 */
export async function buildCartRouteShareUrl(optimization: OptimizationResult): Promise<string> {
  const stores = optimization.storeGroups;
  if (!stores || stores.length === 0) return "";

  const storeQueries = await Promise.all(
    stores.map((s) =>
      buildGoogleMapsQuery({
        marketName: s.marketName,
        coordinate: { latitude: s.coordinate.lat, longitude: s.coordinate.lng },
      })
    )
  );

  const validQueries = storeQueries.filter(Boolean);
  if (validQueries.length === 0) return "";

  const { userLocation } = optimization.parametersUsed;
  let returnDestination = "";
  if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
    returnDestination = (await resolveAddressFromCoordinates(userLocation.lat, userLocation.lng)) || "";
    if (!returnDestination) {
      returnDestination = `${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`;
    }
  }

  if (returnDestination) {
    return buildGoogleMapsRouteUrl({
      destination: returnDestination,
      waypoints: validQueries,
      travelmode: "driving",
    });
  }

  if (validQueries.length === 1) {
    return buildGoogleMapsRouteUrl({
      destination: validQueries[0]!,
      travelmode: "driving",
    });
  }

  const destination = validQueries[validQueries.length - 1]!;
  const waypoints = validQueries.slice(0, -1);

  return buildGoogleMapsRouteUrl({
    destination,
    waypoints,
    travelmode: "driving",
  });
}

/**
 * Builds the complete shareable text message for the cart items and route.
 * Excludes fuel and personal distance, but includes precise return address and Google Maps route link.
 */
export async function buildCartShareText(optimization: OptimizationResult): Promise<string> {
  const { userLocation } = optimization.parametersUsed;
  let returnAddress = "";
  if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
    returnAddress = (await resolveAddressFromCoordinates(userLocation.lat, userLocation.lng)) || "";
    if (!returnAddress) {
      returnAddress = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
    }
  }

  const routeUrl = await buildCartRouteShareUrl(optimization);
  const storeGroups = optimization.storeGroups.map((g) => ({
    marketName: g.marketName,
    items: g.items.map((it) => ({
      quantity: it.quantity,
      productName: it.productName,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
    })),
    subtotalItems: g.subtotalItems,
  }));

  return formatCartShareMessage({
    storeGroups,
    netSavings: optimization.netSavingsVsSingleStore,
    returnAddress: returnAddress || undefined,
    routeUrl: routeUrl || undefined,
  });
}

/**
 * Shares the cart list and universal route via native OS share sheet.
 */
export async function shareCartList(optimization: OptimizationResult): Promise<boolean> {
  try {
    const message = await buildCartShareText(optimization);
    if (!message) return false;
    await Share.share({ message });
    return true;
  } catch (error) {
    console.warn("[MapNavigation] Error sharing cart list:", error);
    return false;
  }
}
