import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./api";

export type OptimizationStrategy = "max_savings" | "balanced" | "single_store";

export interface CartProductItem {
  productId: number;
  name: string;
  icon?: string | null;
  ean?: string | null;
  quantity: number;
  estimatedPrice?: number;
  addedAt: string;
}

export interface TravelSettings {
  fuelEfficiency: number; // km/L (default: 10.0)
  fuelPrice: number; // $/L (default: 5.80)
  strategy: OptimizationStrategy; // default: 'balanced'
  maxStops: number; // 1 to 4 (default: 3)
  maxRadiusKm: number; // default: 15
  convenienceThreshold: number; // default: 5.0
  isRoundTrip: boolean; // default: true
}

export interface OptimizedItemDisplay {
  productId: number;
  productName: string;
  productIcon: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isPromotion: boolean;
}

export interface OptimizedStoreGroupDisplay {
  marketId: number;
  marketName: string;
  coordinate: { lat: number; lng: number };
  stopOrder: number;
  distanceKm: number;
  durationMinutes: number;
  fuelCost: number;
  items: OptimizedItemDisplay[];
  subtotalItems: number;
  totalWithTravel: number;
}

export interface OptimizationResult {
  strategy: OptimizationStrategy;
  recommendedType: "single_store" | "multi_store";
  totalGroceryCost: number;
  totalTravelCost: number;
  totalCombinedCost: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  netSavingsVsSingleStore: number;
  storeGroups: OptimizedStoreGroupDisplay[];
  singleStoreComparison: {
    marketId: number;
    marketName: string;
    groceryCost: number;
    travelCost: number;
    combinedCost: number;
    distanceKm: number;
    availableItemCount: number;
    totalItemCount: number;
  } | null;
  unassignedItems: {
    productId: number;
    productName: string;
    quantity: number;
    reason: string;
    unitPrice?: number;
    marketName?: string;
  }[];
  parametersUsed: {
    userLocation: { lat: number; lng: number };
    fuelEfficiency: number;
    fuelPrice: number;
    maxStops: number;
    maxRadiusKm: number;
    convenienceThreshold: number;
    isRoundTrip: boolean;
  };
  isLocalFallback?: boolean;
  fallbackReason?: string;
}

const STORAGE_KEYS = {
  CART: "@presco:shopping_cart",
  TRAVEL_SETTINGS: "@presco:travel_settings",
};

export const DEFAULT_TRAVEL_SETTINGS: TravelSettings = {
  fuelEfficiency: 10.0,
  fuelPrice: 5.8,
  strategy: "balanced",
  maxStops: 3,
  maxRadiusKm: 15,
  convenienceThreshold: 5.0,
  isRoundTrip: true,
};

type CartListener = (items: CartProductItem[]) => void;
const listeners = new Set<CartListener>();

function notifyListeners(items: CartProductItem[]) {
  listeners.forEach((listener) => {
    try {
      listener(items);
    } catch {
      // Ignore listener error
    }
  });
}

export const cartService = {
  subscribe(listener: CartListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getCartItems(): Promise<CartProductItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CART);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async getCartCount(): Promise<number> {
    const items = await this.getCartItems();
    return items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  },

  async isProductInCart(productId: number): Promise<boolean> {
    const items = await this.getCartItems();
    return items.some((it) => it.productId === productId);
  },

  async addToCart(
    product: { id: number; name: string; icon?: string | null; ean?: string | null; estimatedPrice?: number },
    quantity: number = 1
  ): Promise<CartProductItem[]> {
    const items = await this.getCartItems();
    const existingIndex = items.findIndex((it) => it.productId === product.id);
    const safeQty = Math.max(1, quantity);

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (existing) {
        existing.quantity = (existing.quantity || 1) + safeQty;
        if (product.estimatedPrice && product.estimatedPrice > 0) {
          existing.estimatedPrice = product.estimatedPrice;
        }
      }
    } else {
      items.unshift({
        productId: product.id,
        name: product.name,
        icon: product.icon || null,
        ean: product.ean || null,
        quantity: safeQty,
        estimatedPrice: product.estimatedPrice,
        addedAt: new Date().toISOString(),
      });
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
    notifyListeners(items);

    // Sync in background with backend if authenticated
    this.syncItemToBackend(product.id, safeQty).catch(() => {});

    return items;
  },

  async updateQuantity(productId: number, quantity: number): Promise<CartProductItem[]> {
    let items = await this.getCartItems();
    const safeQty = Math.floor(quantity);

    if (safeQty <= 0) {
      items = items.filter((it) => it.productId !== productId);
    } else {
      const target = items.find((it) => it.productId === productId);
      if (target) {
        target.quantity = safeQty;
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
    notifyListeners(items);

    // Sync with backend
    if (safeQty <= 0) {
      apiRequest(`/cart/items/${productId}`, { method: "DELETE" }).catch(() => {});
    } else {
      apiRequest(`/cart/items/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: safeQty }),
      }).catch(() => {});
    }

    return items;
  },

  async removeFromCart(productId: number): Promise<CartProductItem[]> {
    return this.updateQuantity(productId, 0);
  },

  async clearCart(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CART);
    notifyListeners([]);
    apiRequest("/cart", { method: "DELETE" }).catch(() => {});
  },

  async saveCartItems(items: CartProductItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
    notifyListeners(items);
  },

  async getTravelSettings(): Promise<TravelSettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_SETTINGS);
      if (!raw) return DEFAULT_TRAVEL_SETTINGS;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TRAVEL_SETTINGS,
        ...parsed,
      };
    } catch {
      return DEFAULT_TRAVEL_SETTINGS;
    }
  },

  async saveTravelSettings(updates: Partial<TravelSettings>): Promise<TravelSettings> {
    const current = await this.getTravelSettings();
    const merged: TravelSettings = {
      ...current,
      ...updates,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_SETTINGS, JSON.stringify(merged));
    return merged;
  },

  async syncItemToBackend(productId: number, quantity: number): Promise<void> {
    try {
      await apiRequest("/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
    } catch {
      // Offline fallback silently keeps local cart
    }
  },

  async optimizeCart(params?: {
    userLocation?: { lat: number; lng: number };
    customItems?: {
      productId: number;
      quantity: number;
      productName?: string;
      productIcon?: string | null;
      estimatedPrice?: number;
    }[];
    customSettings?: Partial<TravelSettings>;
  }): Promise<OptimizationResult> {
    const rawCart = await this.getCartItems();
    const items =
      params?.customItems ||
      rawCart.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        productName: it.name,
        productIcon: it.icon,
        estimatedPrice: it.estimatedPrice,
      }));

    const settings = {
      ...(await this.getTravelSettings()),
      ...(params?.customSettings || {}),
    };

    const payload = {
      items,
      userLocation: params?.userLocation,
      vehicleSettings: {
        fuelEfficiency: settings.fuelEfficiency,
        fuelPrice: settings.fuelPrice,
        isRoundTrip: settings.isRoundTrip,
      },
      preferences: {
        strategy: settings.strategy,
        maxStops: settings.maxStops,
        maxRadiusKm: settings.maxRadiusKm,
        convenienceThreshold: settings.convenienceThreshold,
      },
    };

    try {
      const response = await apiRequest<OptimizationResult>("/cart/optimize", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response;
    } catch (err: any) {
      console.warn("[cartService] /cart/optimize remote call failed:", err?.status || err?.message);
      const is404 = err?.status === 404 || String(err?.message).includes("404");
      const fallbackReason = is404
        ? "Endpoint ainda não publicado no servidor remoto (HTTP 404). Exibindo simulação local."
        : "Servidor indisponível no momento. Exibindo simulação local.";

      const fullCartItems = await this.getCartItems();
      return generateLocalFallbackOptimization(fullCartItems, settings, params?.userLocation, fallbackReason);
    }
  },
};

function generateLocalFallbackOptimization(
  rawItems: CartProductItem[],
  settings: TravelSettings,
  userLocation?: { lat: number; lng: number },
  reason?: string
): OptimizationResult {
  const loc = userLocation || { lat: -23.5505, lng: -46.6333 };
  const fuelEfficiency = Math.max(1, settings.fuelEfficiency || 10);
  const fuelPrice = Math.max(0, settings.fuelPrice || 5.8);
  const isRoundTrip = settings.isRoundTrip ?? true;

  if (rawItems.length === 0) {
    return {
      strategy: settings.strategy,
      recommendedType: "single_store",
      totalGroceryCost: 0,
      totalTravelCost: 0,
      totalCombinedCost: 0,
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      netSavingsVsSingleStore: 0,
      storeGroups: [],
      singleStoreComparison: null,
      unassignedItems: [],
      parametersUsed: {
        userLocation: loc,
        fuelEfficiency,
        fuelPrice,
        maxStops: settings.maxStops,
        maxRadiusKm: settings.maxRadiusKm,
        convenienceThreshold: settings.convenienceThreshold,
        isRoundTrip,
      },
      isLocalFallback: true,
      fallbackReason: reason,
    };
  }

  const getItemPrice = (it: CartProductItem, storeFactor = 1.0) => {
    if (it.estimatedPrice && it.estimatedPrice > 0) {
      return Math.round(it.estimatedPrice * storeFactor * 100) / 100;
    }
    const pseudoRand = ((it.productId * 13) % 18) + 6.5;
    return Math.round(pseudoRand * storeFactor * 100) / 100;
  };

  const isMulti = settings.strategy !== "single_store" && rawItems.length >= 2;

  if (!isMulti) {
    const storeDist = 2.4;
    const storeDuration = 8;
    const travelDist = isRoundTrip ? storeDist * 2 : storeDist;
    const travelCost = Math.round(((travelDist / fuelEfficiency) * fuelPrice) * 100) / 100;

    let groceryCost = 0;
    const items = rawItems.map((it) => {
      const unitPrice = getItemPrice(it, 1.0);
      const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
      groceryCost += subtotal;
      return {
        productId: it.productId,
        productName: it.name,
        productIcon: it.icon || null,
        ean: it.ean || null,
        quantity: it.quantity,
        unitPrice,
        subtotal,
        isPromotion: it.productId % 3 === 0,
      };
    });

    const storeGroup: OptimizedStoreGroupDisplay = {
      marketId: 1,
      marketName: "Supermercado Econômico",
      coordinate: { lat: loc.lat + 0.01, lng: loc.lng + 0.01 },
      stopOrder: 1,
      distanceKm: storeDist,
      durationMinutes: storeDuration,
      fuelCost: travelCost,
      items,
      subtotalItems: Math.round(groceryCost * 100) / 100,
      totalWithTravel: Math.round((groceryCost + travelCost) * 100) / 100,
    };

    return {
      strategy: settings.strategy,
      recommendedType: "single_store",
      totalGroceryCost: Math.round(groceryCost * 100) / 100,
      totalTravelCost: travelCost,
      totalCombinedCost: Math.round((groceryCost + travelCost) * 100) / 100,
      totalDistanceKm: travelDist,
      totalDurationMinutes: storeDuration,
      netSavingsVsSingleStore: 0,
      storeGroups: [storeGroup],
      singleStoreComparison: {
        marketId: 1,
        marketName: "Supermercado Econômico",
        groceryCost: Math.round(groceryCost * 100) / 100,
        travelCost,
        combinedCost: Math.round((groceryCost + travelCost) * 100) / 100,
        distanceKm: travelDist,
        availableItemCount: rawItems.length,
        totalItemCount: rawItems.length,
      },
      unassignedItems: [],
      parametersUsed: {
        userLocation: loc,
        fuelEfficiency,
        fuelPrice,
        maxStops: settings.maxStops,
        maxRadiusKm: settings.maxRadiusKm,
        convenienceThreshold: settings.convenienceThreshold,
        isRoundTrip,
      },
      isLocalFallback: true,
      fallbackReason: reason,
    };
  }

  const mid = Math.ceil(rawItems.length / 2);
  const items1 = rawItems.slice(0, mid);
  const items2 = rawItems.slice(mid);

  let subtotal1 = 0;
  const mapped1 = items1.map((it) => {
    const unitPrice = getItemPrice(it, 0.95);
    const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
    subtotal1 += subtotal;
    return {
      productId: it.productId,
      productName: it.name,
      productIcon: it.icon || null,
      ean: it.ean || null,
      quantity: it.quantity,
      unitPrice,
      subtotal,
      isPromotion: true,
    };
  });

  let subtotal2 = 0;
  const mapped2 = items2.map((it) => {
    const unitPrice = getItemPrice(it, 0.92);
    const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
    subtotal2 += subtotal;
    return {
      productId: it.productId,
      productName: it.name,
      productIcon: it.icon || null,
      ean: it.ean || null,
      quantity: it.quantity,
      unitPrice,
      subtotal,
      isPromotion: false,
    };
  });

  const dist1 = 1.8;
  const dist2 = 3.2;
  const totalTripDist = isRoundTrip ? (dist1 + dist2 + 2.2) : (dist1 + dist2);
  const fuelCost1 = Math.round(((dist1 / fuelEfficiency) * fuelPrice) * 100) / 100;
  const fuelCost2 = Math.round(((dist2 / fuelEfficiency) * fuelPrice) * 100) / 100;
  const totalTravelCost = Math.round(((totalTripDist / fuelEfficiency) * fuelPrice) * 100) / 100;

  const totalGrocery = Math.round((subtotal1 + subtotal2) * 100) / 100;
  const totalCombined = Math.round((totalGrocery + totalTravelCost) * 100) / 100;

  const singleStoreGrocery = Math.round(rawItems.reduce((sum, it) => sum + getItemPrice(it, 1.05) * it.quantity, 0) * 100) / 100;
  const singleStoreTravel = Math.round(((2.8 * (isRoundTrip ? 2 : 1) / fuelEfficiency) * fuelPrice) * 100) / 100;
  const singleStoreCombined = Math.round((singleStoreGrocery + singleStoreTravel) * 100) / 100;
  const netSavings = Math.max(0, Math.round((singleStoreCombined - totalCombined) * 100) / 100);

  const group1: OptimizedStoreGroupDisplay = {
    marketId: 101,
    marketName: "Supermercado Alvorada",
    coordinate: { lat: loc.lat + 0.008, lng: loc.lng + 0.005 },
    stopOrder: 1,
    distanceKm: dist1,
    durationMinutes: 6,
    fuelCost: fuelCost1,
    items: mapped1,
    subtotalItems: Math.round(subtotal1 * 100) / 100,
    totalWithTravel: Math.round((subtotal1 + fuelCost1) * 100) / 100,
  };

  const group2: OptimizedStoreGroupDisplay = {
    marketId: 102,
    marketName: "Atacadão dos Preços",
    coordinate: { lat: loc.lat - 0.012, lng: loc.lng + 0.015 },
    stopOrder: 2,
    distanceKm: dist2,
    durationMinutes: 11,
    fuelCost: fuelCost2,
    items: mapped2,
    subtotalItems: Math.round(subtotal2 * 100) / 100,
    totalWithTravel: Math.round((subtotal2 + fuelCost2) * 100) / 100,
  };

  return {
    strategy: settings.strategy,
    recommendedType: "multi_store",
    totalGroceryCost: totalGrocery,
    totalTravelCost,
    totalCombinedCost: totalCombined,
    totalDistanceKm: Math.round(totalTripDist * 10) / 10,
    totalDurationMinutes: 17,
    netSavingsVsSingleStore: netSavings,
    storeGroups: [group1, group2],
    singleStoreComparison: {
      marketId: 999,
      marketName: "Hipermercado Mais Próximo",
      groceryCost: singleStoreGrocery,
      travelCost: singleStoreTravel,
      combinedCost: singleStoreCombined,
      distanceKm: isRoundTrip ? 5.6 : 2.8,
      availableItemCount: rawItems.length,
      totalItemCount: rawItems.length,
    },
    unassignedItems: [],
    parametersUsed: {
      userLocation: loc,
      fuelEfficiency,
      fuelPrice,
      maxStops: settings.maxStops,
      maxRadiusKm: settings.maxRadiusKm,
      convenienceThreshold: settings.convenienceThreshold,
      isRoundTrip,
    },
    isLocalFallback: true,
    fallbackReason: reason,
  };
}
