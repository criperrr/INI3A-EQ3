import { CartRepository } from "@/shared/database/repositories/cart.repository";
import type { CartItemEntity } from "@/shared/database/repositories/cart.repository";
import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { ProductRepository } from "@/shared/database/repositories/product.repository";
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
  selectedMarketId?: number; // manual selection of single store
  prioritizedProductId?: number; // manual prioritization of a product for single store search
}

export interface OptimizationItemInputDTO {
  productId: number;
  quantity?: number;
  productName?: string;
  productIcon?: string | null;
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
  availableMarkets?: {
    marketId: number;
    marketName?: string | undefined;
    unitPrice: number;
    isPromotion?: boolean | undefined;
  }[];
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

export interface SingleStoreOptionDTO {
  marketId: number;
  marketName: string;
  coordinate: GeoCoordinate;
  coveredCount: number;
  totalCount: number;
  distanceKm: number;
  groceryCost: number;
  travelCost: number;
  combinedCost: number;
  coveredProductIds: number[];
  missingProductIds: number[];
}

export interface SingleStoreOptionsSummaryDTO {
  hasCompleteStore: boolean;
  bestStoreCoveredCount: number;
  totalCartItemsCount: number;
  stores: SingleStoreOptionDTO[];
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
  singleStoreOptions?: SingleStoreOptionsSummaryDTO;
  unassignedItems: {
    productId: number;
    productName: string;
    quantity: number;
    reason: string;
    unitPrice?: number | undefined;
    marketName?: string | undefined;
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
    let cartItems: {
      productId: number;
      quantity: number;
      productName?: string | undefined;
      productIcon?: string | null | undefined;
    }[] = [];

    if (params.items && params.items.length > 0) {
      cartItems = params.items.map((it) => ({
        productId: it.productId,
        quantity: Math.max(1, it.quantity || 1),
        productName: it.productName,
        productIcon: it.productIcon,
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

    // Enrich any missing product name/icon from ProductRepository
    const missingProductIds = cartItems
      .filter((c) => !c.productName || c.productName.trim() === "" || c.productName.startsWith("Produto #"))
      .map((c) => c.productId);
    if (missingProductIds.length > 0) {
      try {
        const dbProducts = await ProductRepository.getProductsBasicInfo(missingProductIds);
        const productMap = new Map(dbProducts.map((p) => [p.id, p]));
        for (const c of cartItems) {
          if (!c.productName || c.productName.trim() === "" || c.productName.startsWith("Produto #")) {
            const p = productMap.get(c.productId);
            if (p && p.name) {
              c.productName = p.name;
              if (!c.productIcon && p.icon) c.productIcon = p.icon;
            }
          }
        }
      } catch (err) {
        console.warn("[CartService] Non-critical: could not enrich product details from DB:", err);
      }
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
    const rawMaxStops = params.preferences?.maxStops ?? 3;
    const maxStops = Math.min(4, Math.max(1, rawMaxStops));
    const maxRadiusKm = Math.max(1, params.preferences?.maxRadiusKm ?? 15);
    const convenienceThreshold = Math.max(0, params.preferences?.convenienceThreshold ?? 5.0);
    const selectedMarketId = params.preferences?.selectedMarketId;
    const prioritizedProductId = params.preferences?.prioritizedProductId;

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
    let rawPrices = await CartRepository.getPricesForProductsAcrossMarkets(productIds, marketIds);

    const marketsMap = new Map<number, { id: number; name: string; coordinate: GeoCoordinate; distanceMeters?: number }>();
    for (const m of candidateMarkets) {
      marketsMap.set(m.id, m);
    }

    // Identify which products in the cart are missing prices from candidateMarkets
    const coveredInCandidateMarkets = new Set(rawPrices.map((p) => p.productId));
    const unpricedProductIds = productIds.filter((id) => !coveredInCandidateMarkets.has(id));

    // If some or all products are missing prices in candidate markets, expand search across all markets
    if (unpricedProductIds.length > 0) {
      const extraProductPrices = await CartRepository.getPricesForProductsAcrossMarkets(unpricedProductIds);
      if (extraProductPrices.length > 0) {
        const extraMarketIds = Array.from(new Set(extraProductPrices.map((p) => p.marketId))).filter(
          (mId) => !marketsMap.has(mId)
        );

        if (extraMarketIds.length > 0) {
          const allMarkets = await MarketRepository.getAllMarkets({ lat: userLocation.lat, lng: userLocation.lng });
          const matchedMarkets = allMarkets.filter((m) => extraMarketIds.includes(Number(m.id)));
          if (matchedMarkets.length > 0) {
            const extraCandidates = matchedMarkets.map((m: any) => {
              const loc = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
              const coords = loc?.coordinates || [0, 0];
              return {
                id: Number(m.id),
                name: String(m.name),
                coordinate: { lat: Number(coords[1]), lng: Number(coords[0]) } as GeoCoordinate,
                distanceMeters: Number(m.distance) || 0,
              };
            });
            for (const m of extraCandidates) {
              candidateMarkets.push(m);
              marketsMap.set(m.id, m);
            }
          }
        }
        rawPrices = [...rawPrices, ...extraProductPrices];
      }
    }

    // Map: productId -> marketId -> { value, isPromotion, productName, productIcon }
    const pricesByProduct = new Map<
      number,
      Map<
        number,
        {
          value: number;
          isPromotion: boolean;
          productName?: string | undefined;
          productIcon?: string | null | undefined;
        }
      >
    >();
    for (const item of rawPrices) {
      if (!pricesByProduct.has(item.productId)) {
        pricesByProduct.set(item.productId, new Map());
      }
      pricesByProduct.get(item.productId)!.set(item.marketId, {
        value: item.value,
        isPromotion: item.isPromotion,
        productName: item.productName,
        productIcon: item.productIcon,
      });
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
          const availableMarkets: {
            marketId: number;
            marketName?: string | undefined;
            unitPrice: number;
            isPromotion?: boolean | undefined;
          }[] = [];
          if (pMap) {
            for (const [mId, price] of pMap.entries()) {
              availableMarkets.push({
                marketId: mId,
                marketName: marketsMap.get(mId)?.name || `Mercado #${mId}`,
                unitPrice: price.value,
                isPromotion: price.isPromotion,
              });
            }
          }
          assigned.push({
            productId: cartItem.productId,
            productName: cartItem.productName || priceInfo.productName || `Produto #${cartItem.productId}`,
            productIcon: cartItem.productIcon || priceInfo.productIcon || null,
            quantity: cartItem.quantity,
            unitPrice: priceInfo.value,
            subtotal: sub,
            isPromotion: priceInfo.isPromotion,
            availableMarkets,
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

    const hasCompleteStore = singleStoreEvals.some((s) => s.coveredCount === cartItems.length);

    // Build rich singleStoreOptions summary for all candidate single stores
    const singleStoreOptionsList: SingleStoreOptionDTO[] = singleStoreEvals.map((s) => {
      const coveredIds = s.assignedItems.map((it) => it.productId);
      const coveredSet = new Set(coveredIds);
      const missingIds = cartItems.filter((c) => !coveredSet.has(c.productId)).map((c) => c.productId);
      return {
        marketId: s.marketId,
        marketName: s.marketName,
        coordinate: s.coordinate,
        coveredCount: s.coveredCount,
        totalCount: cartItems.length,
        distanceKm: s.distanceKm,
        groceryCost: s.groceryCost,
        travelCost: s.travelCost,
        combinedCost: s.combinedCost,
        coveredProductIds: coveredIds,
        missingProductIds: missingIds,
      };
    });

    let bestSingle: SingleStoreEvaluation | null = null;
    if (selectedMarketId) {
      const explicit = singleStoreEvals.find((s) => s.marketId === selectedMarketId);
      if (explicit) bestSingle = explicit;
    }
    if (!bestSingle && prioritizedProductId) {
      const prioritized = singleStoreEvals.filter((s) =>
        s.assignedItems.some((it) => it.productId === prioritizedProductId)
      );
      if (prioritized.length > 0) bestSingle = prioritized[0] ?? null;
    }
    if (!bestSingle) {
      bestSingle = singleStoreEvals[0] ?? null;
    }

    // 6. Evaluate Multi-Store Candidates (up to maxStops, max 4 stops)
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
    const effectiveMultiStops = strategy !== "single_store" ? Math.max(2, maxStops) : maxStops;

    // Only compute multi-store combinations if effectiveMultiStops > 1 and candidate markets > 1
    if (effectiveMultiStops > 1 && candidateMarkets.length > 1) {
      // Prioritize markets that carry unique products to ensure full cart coverage
      const activeMarkets = candidateMarkets.filter((m) => {
        return Array.from(pricesByProduct.values()).some((pMap) => pMap.has(m.id));
      });

      const essentialMarketIds = new Set<number>();
      for (const [, pMap] of pricesByProduct.entries()) {
        const sortedMarketsForProd = Array.from(pMap.keys())
          .map((mId) => marketsMap.get(mId))
          .filter(Boolean)
          .sort((a, b) => (a!.distanceMeters || 0) - (b!.distanceMeters || 0));
        if (sortedMarketsForProd[0]) {
          essentialMarketIds.add(sortedMarketsForProd[0]!.id);
        }
        if (sortedMarketsForProd[1]) {
          essentialMarketIds.add(sortedMarketsForProd[1]!.id);
        }
      }

      const essentialList = activeMarkets.filter((m) => essentialMarketIds.has(m.id));
      const nonEssentialList = activeMarkets.filter((m) => !essentialMarketIds.has(m.id));
      const relevantMarkets = [...essentialList, ...nonEssentialList].slice(0, 12);

      const combinations: number[][] = [];
      const stopLimits = Math.min(effectiveMultiStops, 4);

      // Greedy combination to maximize distinct items covered across markets
      const greedyCoverMarketIds: number[] = [];
      const uncoveredProductIds = new Set(cartItems.map((c) => c.productId));
      while (uncoveredProductIds.size > 0 && greedyCoverMarketIds.length < stopLimits) {
        let bestMarketForGreedy: { id: number; coversCount: number } | null = null;
        for (const m of activeMarkets) {
          if (greedyCoverMarketIds.includes(m.id)) continue;
          let count = 0;
          for (const pId of uncoveredProductIds) {
            if (pricesByProduct.get(pId)?.has(m.id)) count++;
          }
          if (!bestMarketForGreedy || count > bestMarketForGreedy.coversCount) {
            bestMarketForGreedy = { id: m.id, coversCount: count };
          }
        }
        if (bestMarketForGreedy && bestMarketForGreedy.coversCount > 0) {
          greedyCoverMarketIds.push(bestMarketForGreedy.id);
          for (const pId of Array.from(uncoveredProductIds)) {
            if (pricesByProduct.get(pId)?.has(bestMarketForGreedy.id)) {
              uncoveredProductIds.delete(pId);
            }
          }
        } else {
          break;
        }
      }

      if (greedyCoverMarketIds.length >= 2) {
        combinations.push(greedyCoverMarketIds);
      }

      // Generate 2-store, 3-store, and 4-store combinations
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
                if (stopLimits >= 4) {
                  for (let l = k + 1; l < relevantMarkets.length; l++) {
                    const mL = relevantMarkets[l];
                    if (mL) {
                      combinations.push([mI.id, mJ.id, mK.id, mL.id]);
                    }
                  }
                }
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
          let lowestPrice: {
            marketId: number;
            value: number;
            isPromotion: boolean;
            productName?: string | undefined;
            productIcon?: string | null | undefined;
          } | null = null;
          for (const mId of comb) {
            const p = pMap.get(mId);
            if (p) {
              if (!lowestPrice || p.value < lowestPrice.value) {
                lowestPrice = {
                  marketId: mId,
                  value: p.value,
                  isPromotion: p.isPromotion,
                  productName: p.productName,
                  productIcon: p.productIcon,
                };
              }
            }
          }

          if (lowestPrice) {
            combCovered++;
            const sub = Number((lowestPrice.value * cartItem.quantity).toFixed(2));
            combGroceryCost += sub;
            const availableMarkets: {
              marketId: number;
              marketName?: string | undefined;
              unitPrice: number;
              isPromotion?: boolean | undefined;
            }[] = [];
            if (pMap) {
              for (const [mId, price] of pMap.entries()) {
                availableMarkets.push({
                  marketId: mId,
                  marketName: marketsMap.get(mId)?.name || `Mercado #${mId}`,
                  unitPrice: price.value,
                  isPromotion: price.isPromotion,
                });
              }
            }
            assignedByStore.get(lowestPrice.marketId)!.push({
              productId: cartItem.productId,
              productName: cartItem.productName || lowestPrice.productName || `Produto #${cartItem.productId}`,
              productIcon: cartItem.productIcon || lowestPrice.productIcon || null,
              quantity: cartItem.quantity,
              unitPrice: lowestPrice.value,
              subtotal: sub,
              isPromotion: lowestPrice.isPromotion,
              availableMarkets,
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

        let netSavings = 0;
        if (bestSingle) {
          if (combCovered === bestSingle.coveredCount) {
            netSavings = Number((bestSingle.combinedCost - combinedCost).toFixed(2));
          } else if (combCovered > bestSingle.coveredCount) {
            // Covers more items than single store: calculate savings on shared items minus extra travel
            let candidateCostForSharedItems = 0;
            const singleCoveredItemIds = new Set(bestSingle.assignedItems.map((it) => it.productId));
            for (const [, itemsList] of assignedByStore.entries()) {
              for (const it of itemsList) {
                if (singleCoveredItemIds.has(it.productId)) {
                  candidateCostForSharedItems += it.subtotal;
                }
              }
            }
            const extraTravel = Math.max(0, travelCost - bestSingle.travelCost);
            const grocerySavingsOnShared = bestSingle.groceryCost - candidateCostForSharedItems;
            netSavings = Number((grocerySavingsOnShared - extraTravel).toFixed(2));
          } else {
            netSavings = Number((bestSingle.combinedCost - combinedCost).toFixed(2));
          }
        } else {
          netSavings = 0;
        }

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
          // Prefer higher item coverage, then higher net savings, then lower combined cost
          if (candidateEval.coveredCount > bestMulti.coveredCount) {
            bestMulti = candidateEval;
          } else if (candidateEval.coveredCount === bestMulti.coveredCount) {
            if (candidateEval.netSavingsVsSingle > bestMulti.netSavingsVsSingle) {
              bestMulti = candidateEval;
            } else if (candidateEval.netSavingsVsSingle === bestMulti.netSavingsVsSingle) {
              if (candidateEval.combinedCost < bestMulti.combinedCost) {
                bestMulti = candidateEval;
              }
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
      const multiCoversMore = bestMulti.coveredCount > bestSingle.coveredCount;
      const singleIsComplete = bestSingle.coveredCount === cartItems.length;

      if (strategy === "single_store") {
        recommendedType = "single_store";
        chosenPlan = bestSingle;
      } else if (strategy === "balanced") {
        // Multi-store split permitted if:
        // 1) Multi-store covers MORE items than single store (fulfills more of the shopping list)
        // 2) OR single store is incomplete (single store doesn't have all products) and multi-store exists
        // 3) OR net savings per extra stop exceeds convenience threshold
        if (multiCoversMore) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else if (!singleIsComplete) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else if (netSavings >= convenienceThreshold * extraStops && bestMulti.coveredCount >= bestSingle.coveredCount) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else {
          recommendedType = "single_store";
          chosenPlan = bestSingle;
        }
      } else {
        // max_savings: split whenever multi-store covers more items OR single store is incomplete OR net savings > 0
        if (multiCoversMore || !singleIsComplete) {
          recommendedType = "multi_store";
          chosenPlan = bestMulti;
        } else if (netSavings > 0 && bestMulti.coveredCount >= bestSingle.coveredCount) {
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
      .map((c) => {
        const pMap = pricesByProduct.get(c.productId);
        let bestPriceInfo: { marketName: string; value: number } | null = null;
        if (pMap && pMap.size > 0) {
          for (const [mId, p] of pMap.entries()) {
            if (!bestPriceInfo || p.value < bestPriceInfo.value) {
              const mName = marketsMap.get(mId)?.name || `Mercado #${mId}`;
              bestPriceInfo = { marketName: mName, value: p.value };
            }
          }
        }

        let reason = "Sem preço recente nos mercados candidatos.";
        if (bestPriceInfo) {
          reason = `Disponível no ${bestPriceInfo.marketName} por R$ ${bestPriceInfo.value.toFixed(2).replace(".", ",")}`;
        }

        return {
          productId: c.productId,
          productName: c.productName || `Produto #${c.productId}`,
          quantity: c.quantity,
          reason,
          unitPrice: bestPriceInfo ? bestPriceInfo.value : undefined,
          marketName: bestPriceInfo ? bestPriceInfo.marketName : undefined,
        };
      });

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
      singleStoreOptions: {
        hasCompleteStore,
        bestStoreCoveredCount: bestSingle?.coveredCount || 0,
        totalCartItemsCount: cartItems.length,
        stores: singleStoreOptionsList.slice(0, 10),
      },
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
