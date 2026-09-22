import { CartRepository } from "@/shared/database/repositories/cart.repository";
import type { CartItemEntity } from "@/shared/database/repositories/cart.repository";
import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { RoutingService } from "@/shared/services/routing.service";
import type { GeoCoordinate } from "@/shared/services/routing.service";
import { ValidationError, NotFoundError } from "@/shared/errors/errors";

export type OptimizationStrategy = "max_savings" | "balanced" | "single_store";

export interface VehicleSettingsDTO {
  fuelEfficiency?: number; // km/L (default 10)
  fuelPrice?: number; // $/L (default 5.80)
  isRoundTrip?: boolean; // default true
}

export interface OptimizationPreferencesDTO {
  strategy?: OptimizationStrategy; // default 'balanced'
  maxStops?: number; // 1 to 4 (default 3)
  maxRadiusKm?: number; // default 15
  convenienceThreshold?: number; // default 5.00
}

export interface OptimizationItemInputDTO {
  productId: number;
  quantity?: number;
}

export interface OptimizationRequestDTO {
  userId?: number;
  items?: OptimizationItemInputDTO[];
  userLocation?: GeoCoordinate;
  vehicleSettings?: VehicleSettingsDTO;
  preferences?: OptimizationPreferencesDTO;
}

export interface OptimizedStoreItem {
  productId: number;
  productName: string;
  productIcon: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isPromotion: boolean;
}

export interface OptimizedStoreGroup {
  marketId: number;
  marketName: string;
  coordinate: GeoCoordinate;
  stopOrder: number;
  distanceKm: number;
  durationMinutes: number;
  fuelCost: number;
  items: OptimizedStoreItem[];
  subtotalItems: number;
  totalWithTravel: number;
}

export interface OptimizationResponseDTO {
  strategy: OptimizationStrategy;
  recommendedType: "single_store" | "multi_store";
  totalGroceryCost: number;
  totalTravelCost: number;
  totalCombinedCost: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  netSavingsVsSingleStore: number;
  storeGroups: OptimizedStoreGroup[];
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
  }[];
  parametersUsed: {
    userLocation: GeoCoordinate;
    fuelEfficiency: number;
    fuelPrice: number;
    maxStops: number;
    maxRadiusKm: number;
    convenienceThreshold: number;
    isRoundTrip: boolean;
  };
}

class CartServiceClass {
  async getCart(userId: number) {
    if (!userId) {
      throw new ValidationError([{ field: "userId", message: "User ID is required." }]);
    }
    return CartRepository.getCartWithItems(userId);
  }

  async addItem(userId: number, productId: number, quantity: number = 1) {
    if (!productId || productId <= 0) {
      throw new ValidationError([{ field: "productId", message: "Valid productId is required." }]);
    }
    const safeQty = Math.max(1, Number(quantity) || 1);
    const userCart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.addItem(userCart.id, productId, safeQty);
    return CartRepository.getCartWithItems(userId);
  }

  async updateQuantity(userId: number, productId: number, quantity: number) {
    if (!productId || productId <= 0) {
      throw new ValidationError([{ field: "productId", message: "Valid productId is required." }]);
    }
    const userCart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.updateItemQuantity(userCart.id, productId, quantity);
    return CartRepository.getCartWithItems(userId);
  }

  async removeItem(userId: number, productId: number) {
    if (!productId || productId <= 0) {
      throw new ValidationError([{ field: "productId", message: "Valid productId is required." }]);
    }
    const userCart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.removeItem(userCart.id, productId);
    return CartRepository.getCartWithItems(userId);
  }

  async clearCart(userId: number) {
    const userCart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.clearCart(userCart.id);
    return { success: true, message: "Cart cleared successfully." };
  }

  /**
   * Main Optimizer Engine:
   * Evaluates single-store vs multi-store splits, real driving distance & travel costs,
   * applying user convenience trade-off constraints.
   */
  async optimizeCart(params: OptimizationRequestDTO): Promise<OptimizationResponseDTO> {
    // 1. Resolve Cart Items (from payload or user's database cart)
    let cartItems: { productId: number; quantity: number; productName?: string; productIcon?: string | null }[] = [];

    if (params.items && params.items.length > 0) {
      cartItems = params.items.map((it) => ({
        productId: it.productId,
        quantity: Math.max(1, it.quantity || 1),
      }));
    } else if (params.userId) {
      const dbCart = await CartRepository.getCartWithItems(params.userId);
      cartItems = dbCart.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        productName: it.productName,
        productIcon: it.productIcon,
      }));
    }

    if (cartItems.length === 0) {
      throw new ValidationError([{ field: "items", message: "Shopping list is empty." }]);
    }

    // 2. Resolve Parameters & Defaults
    const userLocation: GeoCoordinate = {
      lat: params.userLocation?.lat ?? -23.55052,
      lng: params.userLocation?.lng ?? -46.633308,
    };

    const fuelEfficiency = Math.max(1, params.vehicleSettings?.fuelEfficiency ?? 10.0); // km/L
    const fuelPrice = Math.max(0.1, params.vehicleSettings?.fuelPrice ?? 5.8); // $/L
    const isRoundTrip = params.vehicleSettings?.isRoundTrip ?? true;

    const strategy = params.preferences?.strategy ?? "balanced";
    const maxStops = Math.min(4, Math.max(1, params.preferences?.maxStops ?? 3));
    const maxRadiusKm = Math.max(1, params.preferences?.maxRadiusKm ?? 15);
    const convenienceThreshold = Math.max(0, params.preferences?.convenienceThreshold ?? 5.0);

    const calcTravelCost = (distanceKm: number) => {
      return Number(((distanceKm / fuelEfficiency) * fuelPrice).toFixed(2));
    };

    // 3. Find Candidate Supermarkets
    const candidateMarketsRaw = await MarketRepository.getMarketsByRadius(
      { lat: userLocation.lat, lng: userLocation.lng },
      maxRadiusKm * 1000
    );

    let candidateMarkets = candidateMarketsRaw.map((m: any) => {
      const loc = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
      const coords = loc?.coordinates || [0, 0];
      return {
        id: Number(m.id),
        name: String(m.name),
        coordinate: { lat: Number(coords[1]), lng: Number(coords[0]) } as GeoCoordinate,
        distanceMeters: Number(m.distance) || 0,
      };
    });

    // Fallback if no markets inside strict radius: expand to all nearby markets up to 10
    if (candidateMarkets.length === 0) {
      const allMarkets = await MarketRepository.getAllMarkets({ lat: userLocation.lat, lng: userLocation.lng });
      candidateMarkets = allMarkets.slice(0, 10).map((m: any) => {
        const loc = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
        const coords = loc?.coordinates || [0, 0];
        return {
          id: Number(m.id),
          name: String(m.name),
          coordinate: { lat: Number(coords[1]), lng: Number(coords[0]) } as GeoCoordinate,
          distanceMeters: Number(m.distance) || 0,
        };
      });
    }

    const marketIds = candidateMarkets.map((m) => m.id);
    const productIds = cartItems.map((c) => c.productId);

    // 4. Fetch Active Prices Across Candidate Markets
    const rawPrices = await CartRepository.getPricesForProductsAcrossMarkets(productIds, marketIds);

    // Map: productId -> marketId -> { value, isPromotion, marketName, coordinate }
    const pricesByProduct = new Map<number, Map<number, { value: number; isPromotion: boolean }>>();
    for (const item of rawPrices) {
      if (!pricesByProduct.has(item.productId)) {
        pricesByProduct.set(item.productId, new Map());
      }
      pricesByProduct.get(item.productId)!.set(item.marketId, {
        value: item.value,
        isPromotion: item.isPromotion,
      });
    }

    const marketsMap = new Map<number, { id: number; name: string; coordinate: GeoCoordinate }>();
    for (const m of candidateMarkets) {
      marketsMap.set(m.id, m);
    }

    // 5. Evaluate Single-Store Candidates
    interface SingleStoreEvaluation {
      marketId: number;
      marketName: string;
      coordinate: GeoCoordinate;
      coveredCount: number;
      groceryCost: number;
      distanceKm: number;
      travelCost: number;
      combinedCost: number;
      assignedItems: OptimizedStoreItem[];
    }

    const singleStoreEvals: SingleStoreEvaluation[] = [];

    for (const market of candidateMarkets) {
      let coveredCount = 0;
      let groceryCost = 0;
      const assigned: OptimizedStoreItem[] = [];

      for (const cartItem of cartItems) {
        const pMap = pricesByProduct.get(cartItem.productId);
        const priceInfo = pMap?.get(market.id);
        if (priceInfo) {
          coveredCount++;
          const sub = Number((priceInfo.value * cartItem.quantity).toFixed(2));
          groceryCost += sub;
          assigned.push({
            productId: cartItem.productId,
            productName: cartItem.productName || `Produto #${cartItem.productId}`,
            productIcon: cartItem.productIcon || null,
            quantity: cartItem.quantity,
            unitPrice: priceInfo.value,
            subtotal: sub,
            isPromotion: priceInfo.isPromotion,
          });
        }
      }

      if (coveredCount > 0) {
        const pair = await RoutingService.getDrivingPair(userLocation, market.coordinate);
        const distKm = Number(((pair.distanceMeters * (isRoundTrip ? 2 : 1)) / 1000).toFixed(2));
        const travel = calcTravelCost(distKm);
        const combined = Number((groceryCost + travel).toFixed(2));

        singleStoreEvals.push({
          marketId: market.id,
          marketName: market.name,
          coordinate: market.coordinate,
          coveredCount,
          groceryCost: Number(groceryCost.toFixed(2)),
          distanceKm: distKm,
          travelCost: travel,
          combinedCost: combined,
          assignedItems: assigned,
        });
      }
    }

    // Rank single stores: first by maximum covered items, second by lowest combined cost
    singleStoreEvals.sort((a, b) => {
      if (b.coveredCount !== a.coveredCount) {
        return b.coveredCount - a.coveredCount;
      }
      return a.combinedCost - b.combinedCost;
    });

    const bestSingle = singleStoreEvals.length > 0 ? singleStoreEvals[0] : null;

    // 6. Evaluate Multi-Store Candidates (up to maxStops, max 3 stops)
    interface MultiStoreEvaluation {
      marketIds: number[];
      coveredCount: number;
      groceryCost: number;
      route: any;
      travelCost: number;
      combinedCost: number;
      netSavingsVsSingle: number;
      assignedByStore: Map<number, OptimizedStoreItem[]>;
    }

    let bestMulti: MultiStoreEvaluation | null = null;

    // Only compute multi-store combinations if maxStops > 1 and candidate markets > 1
    if (maxStops > 1 && candidateMarkets.length > 1) {
      // Filter markets that carry at least one item with a competitive price
      const relevantMarkets = candidateMarkets.filter((m) => {
        return Array.from(pricesByProduct.values()).some((pMap) => pMap.has(m.id));
      }).slice(0, 8); // top 8 relevant markets to keep combinatorial search fast

      const combinations: number[][] = [];
      const stopLimits = Math.min(maxStops, 3);

      // Generate 2-store and 3-store combinations
      for (let i = 0; i < relevantMarkets.length; i++) {
        const mI = relevantMarkets[i];
        if (!mI) continue;
        for (let j = i + 1; j < relevantMarkets.length; j++) {
          const mJ = relevantMarkets[j];
          if (!mJ) continue;
          combinations.push([mI.id, mJ.id]);
          if (stopLimits >= 3) {
            for (let k = j + 1; k < relevantMarkets.length; k++) {
              const mK = relevantMarkets[k];
              if (mK) {
                combinations.push([mI.id, mJ.id, mK.id]);
              }
            }
          }
        }
      }

      for (const comb of combinations) {
        const assignedByStore = new Map<number, OptimizedStoreItem[]>();
        comb.forEach((mId) => assignedByStore.set(mId, []));

        let combCovered = 0;
        let combGroceryCost = 0;

        for (const cartItem of cartItems) {
          const pMap = pricesByProduct.get(cartItem.productId);
          if (!pMap) continue;

          // Find the store in this combination with the lowest price for this item
          let lowestPrice: { marketId: number; value: number; isPromotion: boolean } | null = null;
          for (const mId of comb) {
            const p = pMap.get(mId);
            if (p) {
              if (!lowestPrice || p.value < lowestPrice.value) {
                lowestPrice = { marketId: mId, value: p.value, isPromotion: p.isPromotion };
              }
            }
          }

          if (lowestPrice) {
            combCovered++;
            const sub = Number((lowestPrice.value * cartItem.quantity).toFixed(2));
            combGroceryCost += sub;
            assignedByStore.get(lowestPrice.marketId)!.push({
              productId: cartItem.productId,
              productName: cartItem.productName || `Produto #${cartItem.productId}`,
              productIcon: cartItem.productIcon || null,
              quantity: cartItem.quantity,
              unitPrice: lowestPrice.value,
              subtotal: sub,
              isPromotion: lowestPrice.isPromotion,
            });
          }
        }

        // Exclude stores that ended up with 0 items assigned
        const activeMarketIds = comb.filter((mId) => (assignedByStore.get(mId)?.length || 0) > 0);
        if (activeMarketIds.length <= 1) {
          // If only 1 store got items, this is a single store, skip
          continue;
        }

        const activeStops = activeMarketIds.map((mId) => ({
          marketId: mId,
          name: marketsMap.get(mId)?.name || `Mercado #${mId}`,
          coordinate: marketsMap.get(mId)?.coordinate || userLocation,
        }));

        const route = await RoutingService.computeOptimalRoute(userLocation, activeStops, isRoundTrip);
        const travelCost = calcTravelCost(route.totalDistanceKm);
        const combinedCost = Number((combGroceryCost + travelCost).toFixed(2));

        const singleRefCost = bestSingle ? bestSingle.combinedCost : combGroceryCost;
        const netSavings = Number((singleRefCost - combinedCost).toFixed(2));

        const candidateEval: MultiStoreEvaluation = {
          marketIds: activeMarketIds,
          coveredCount: combCovered,
          groceryCost: Number(combGroceryCost.toFixed(2)),
          route,
          travelCost,
          combinedCost,
          netSavingsVsSingle: netSavings,
          assignedByStore,
        };

        // Check if this candidate is better than current best
        if (!bestMulti) {
          bestMulti = candidateEval;
        } else {
          // Prefer higher item coverage, then higher net savings
          if (candidateEval.coveredCount > bestMulti.coveredCount) {
            bestMulti = candidateEval;
          } else if (candidateEval.coveredCount === bestMulti.coveredCount) {
            if (candidateEval.netSavingsVsSingle > bestMulti.netSavingsVsSingle) {
              bestMulti = candidateEval;
            }
          }
        }
      }
    }

    // 7. Decide Strategy Trade-offs
    let recommendedType: "single_store" | "multi_store" = "single_store";
    let chosenPlan: any = null;

    if (!bestSingle && !bestMulti) {
      throw new NotFoundError("Nenhum preço registrado encontrado para os itens nos mercados próximos.");
    }

    if (!bestMulti) {
      recommendedType = "single_store";
      chosenPlan = bestSingle;
    } else if (!bestSingle) {
      recommendedType = "multi_store";
      chosenPlan = bestMulti;
    } else {
      const extraStops = bestMulti.marketIds.length - 1;
      const netSavings = bestMulti.netSavingsVsSingle;

      if (strategy === "single_store") {
        // Only split if net savings beat convenience penalty threshold by more than double
        if (netSavings > convenienceThreshold * extraStops * 2 && bestMulti.coveredCount >= bestSingle.coveredCount) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else {
          recommendedType = "single_store";
          chosenPlan = bestSingle;
        }
      } else if (strategy === "balanced") {
        // Multi-store split permitted only if net savings per extra stop exceeds convenience threshold
        if (netSavings >= convenienceThreshold * extraStops && bestMulti.coveredCount >= bestSingle.coveredCount) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else {
          recommendedType = "single_store";
          chosenPlan = bestSingle;
        }
      } else {
        // max_savings: split whenever net savings > 0 and coverage is at least as good
        if (netSavings > 0 && bestMulti.coveredCount >= bestSingle.coveredCount) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else {
          recommendedType = "single_store";
          chosenPlan = bestSingle;
        }
      }
    }

    // 8. Build Store Groups for Response
    const storeGroups: OptimizedStoreGroup[] = [];

    if (recommendedType === "single_store" && bestSingle) {
      const m = marketsMap.get(bestSingle.marketId);
      storeGroups.push({
        marketId: bestSingle.marketId,
        marketName: bestSingle.marketName,
        coordinate: bestSingle.coordinate,
        stopOrder: 1,
        distanceKm: bestSingle.distanceKm,
        durationMinutes: Math.max(1, Math.round(bestSingle.distanceKm * 2)),
        fuelCost: bestSingle.travelCost,
        items: bestSingle.assignedItems,
        subtotalItems: bestSingle.groceryCost,
        totalWithTravel: bestSingle.combinedCost,
      });
    } else if (recommendedType === "multi_store" && bestMulti) {
      const orderedWaypoints = bestMulti.route.orderedWaypoints;
      for (const wp of orderedWaypoints) {
        const mId = wp.marketId!;
        const m = marketsMap.get(mId);
        const items = bestMulti.assignedByStore.get(mId) || [];
        const itemsSubtotal = Number(items.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2));

        storeGroups.push({
          marketId: mId,
          marketName: wp.name || m?.name || `Mercado #${mId}`,
          coordinate: wp.coordinate,
          stopOrder: wp.stopIndex,
          distanceKm: Number((bestMulti.route.totalDistanceKm / orderedWaypoints.length).toFixed(1)),
          durationMinutes: Math.max(1, Math.round(bestMulti.route.totalDurationMinutes / orderedWaypoints.length)),
          fuelCost: Number((bestMulti.travelCost / orderedWaypoints.length).toFixed(2)),
          items,
          subtotalItems: itemsSubtotal,
          totalWithTravel: Number((itemsSubtotal + bestMulti.travelCost / orderedWaypoints.length).toFixed(2)),
        });
      }
    }

    // 9. Unassigned Items
    const assignedProductIds = new Set<number>();
    storeGroups.forEach((sg) => sg.items.forEach((it) => assignedProductIds.add(it.productId)));

    const unassignedItems = cartItems
      .filter((c) => !assignedProductIds.has(c.productId))
      .map((c) => ({
        productId: c.productId,
        productName: c.productName || `Produto #${c.productId}`,
        quantity: c.quantity,
        reason: "Sem preço recente nos mercados candidatos dentro do raio.",
      }));

    const totalGroceryCost = Number(storeGroups.reduce((sum, g) => sum + g.subtotalItems, 0).toFixed(2));
    const totalTravelCost =
      recommendedType === "single_store"
        ? (bestSingle?.travelCost ?? 0)
        : (bestMulti?.travelCost ?? 0);
    const totalCombinedCost = Number((totalGroceryCost + totalTravelCost).toFixed(2));
    const totalDistanceKm =
      recommendedType === "single_store"
        ? (bestSingle?.distanceKm ?? 0)
        : (bestMulti?.route.totalDistanceKm ?? 0);
    const totalDurationMinutes =
      recommendedType === "single_store"
        ? Math.max(1, Math.round(totalDistanceKm * 2))
        : (bestMulti?.route.totalDurationMinutes ?? 0);

    const netSavings =
      recommendedType === "multi_store" && bestSingle
        ? Number((bestSingle.combinedCost - totalCombinedCost).toFixed(2))
        : 0;

    return {
      strategy,
      recommendedType,
      totalGroceryCost,
      totalTravelCost,
      totalCombinedCost,
      totalDistanceKm,
      totalDurationMinutes,
      netSavingsVsSingleStore: Math.max(0, netSavings),
      storeGroups,
      singleStoreComparison: bestSingle
        ? {
            marketId: bestSingle.marketId,
            marketName: bestSingle.marketName,
            groceryCost: bestSingle.groceryCost,
            travelCost: bestSingle.travelCost,
            combinedCost: bestSingle.combinedCost,
            distanceKm: bestSingle.distanceKm,
            availableItemCount: bestSingle.coveredCount,
            totalItemCount: cartItems.length,
          }
        : null,
      unassignedItems,
      parametersUsed: {
        userLocation,
        fuelEfficiency,
        fuelPrice,
        maxStops,
        maxRadiusKm,
        convenienceThreshold,
        isRoundTrip,
      },
    };
  }
}

export const CartService = new CartServiceClass();
