export interface OpenMapOptions {
  marketName?: string | null;
  address?: string | null;
  coordinate?: {
    latitude: number;
    longitude: number;
  } | null;
  mode?: "search" | "directions";
}

/**
 * Normalizes and formats address components into a clean string.
 */
export function formatAddressParts(parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Builds a search query that searches Google Maps' place database by establishment name and nominal address,
 * preventing Google Maps from dropping an anonymous "Dropped Pin" (alfinete inserido).
 */
export function buildGoogleMapsQueryText(options: OpenMapOptions): string {
  const { marketName, address, coordinate } = options;

  const cleanName = marketName?.trim() || "";
  const cleanAddress = address?.trim() || "";

  if (cleanName && cleanAddress) {
    // Both market name and address available: e.g. "Supermercado Tauste, Av. Tiradentes, 100, Bauru, SP"
    return `${cleanName}, ${cleanAddress}`;
  }

  if (cleanName) {
    return cleanName;
  }

  if (cleanAddress) {
    return cleanAddress;
  }

  if (coordinate && !isNaN(coordinate.latitude) && !isNaN(coordinate.longitude)) {
    // Final fallback if no name or nominal address could be extracted
    return `${coordinate.latitude},${coordinate.longitude}`;
  }

  return "";
}

/**
 * Builds the complete Google Maps Universal Link URL for search or directions.
 */
export function buildGoogleMapsUrl(options: OpenMapOptions): string {
  const query = buildGoogleMapsQueryText(options);
  if (!query) return "";

  if (options.mode === "directions") {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface RouteOptions {
  origin?: { latitude: number; longitude: number } | string | null;
  destination: string;
  waypoints?: string[];
  travelmode?: "driving" | "walking" | "bicycling" | "transit";
}

/**
 * Builds a multi-stop navigation route URL for Google Maps.
 * In RFC 3986 and Google Maps API specifications, waypoints separated by pipe (|)
 * must have the pipe character encoded as %7C to avoid broken URLs and intent parser crashes.
 */
export function buildGoogleMapsRouteUrl(options: RouteOptions): string {
  const { origin, destination, waypoints, travelmode = "driving" } = options;
  if (!destination) return "";

  const params: string[] = ["api=1"];

  if (origin) {
    const originStr =
      typeof origin === "string"
        ? origin
        : `${origin.latitude},${origin.longitude}`;
    params.push(`origin=${encodeURIComponent(originStr)}`);
  }

  params.push(`destination=${encodeURIComponent(destination)}`);

  if (waypoints && waypoints.length > 0) {
    const validWaypoints = waypoints.filter(Boolean);
    if (validWaypoints.length > 0) {
      // Multiple waypoints are joined with pipe (|), and encoded as %7C in URLs
      const waypointsEncoded = validWaypoints.map((w) => encodeURIComponent(w)).join("%7C");
      params.push(`waypoints=${waypointsEncoded}`);
    }
  }

  if (travelmode) {
    params.push(`travelmode=${travelmode}`);
  }

  return `https://www.google.com/maps/dir/?${params.join("&")}`;
}

export interface CartShareStoreItem {
  quantity: number;
  productName: string;
  unitPrice?: number | null;
  subtotal: number;
}

export interface CartShareStoreGroup {
  marketName: string;
  items: CartShareStoreItem[];
  subtotalItems: number;
}

export interface FormatCartShareOptions {
  storeGroups: CartShareStoreGroup[];
  netSavings?: number | null;
  returnAddress?: string | null;
  routeUrl?: string | null;
}

/**
 * Formats a shopping list message for sharing without fuel cost or the word 'Otimizada',
 * appending the universal Google Maps route link for the recipient.
 */
export function formatCartShareMessage(options: FormatCartShareOptions): string {
  const { storeGroups, netSavings = 0, returnAddress, routeUrl } = options;

  let message = `🛒 *Minha Lista de Compras (Presco)*\n\n`;

  storeGroups.forEach((g) => {
    message += `🏪 *${g.marketName}*\n`;
    g.items.forEach((it) => {
      const unit = it.unitPrice ? ` — R$ ${it.unitPrice.toFixed(2).replace(".", ",")} un` : "";
      message += `   • ${it.quantity}x ${it.productName}${unit} (R$ ${it.subtotal.toFixed(2).replace(".", ",")})\n`;
    });
    message += `   Subtotal: R$ ${g.subtotalItems.toFixed(2).replace(".", ",")}\n\n`;
  });

  const totalGrocery = storeGroups.reduce((acc, g) => acc + g.subtotalItems, 0);
  message += `💰 *Total dos Produtos:* R$ ${totalGrocery.toFixed(2).replace(".", ",")}\n`;

  if (netSavings && netSavings > 0) {
    message += `✨ *Economia:* R$ ${netSavings.toFixed(2).replace(".", ",")}\n`;
  }

  if (returnAddress) {
    message += `🏁 *Local de Retorno:* ${returnAddress}\n`;
  }

  if (routeUrl) {
    message += `\n📍 *Trajeto no Google Maps:*\n${routeUrl}\n`;
  }

  return message;
}
