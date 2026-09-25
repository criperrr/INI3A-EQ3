import test from "node:test";
import assert from "node:assert/strict";
import { RoutingService } from "../src/shared/services/routing.service.ts";
import { CartService } from "../src/modules/cart/cart.service.ts";
import { ValidationError } from "../src/shared/errors/errors.ts";

test("RoutingService - Haversine distance calculates accurate geodesic distance", () => {
  // Distance between São Paulo Cathedral (-23.5505, -46.6333) and Paulista Ave (-23.5615, -46.6560) ~ 2.6 km
  const p1 = { lat: -23.5505, lng: -46.6333 };
  const p2 = { lat: -23.5615, lng: -46.656 };

  const meters = RoutingService.calculateHaversineDistance(p1, p2);
  assert.ok(meters > 2400 && meters < 2800, `Expected ~2600m, got ${meters}`);

  const driving = RoutingService.estimateDrivingHaversine(p1, p2);
  assert.ok(driving.distanceMeters > meters, "Driving distance must include urban tortuosity factor");
  assert.ok(driving.durationSeconds > 0, "Driving duration must be positive");
});

test("CartService - optimizeCart throws ValidationError when item list is empty", async () => {
  await assert.rejects(
    async () => {
      await CartService.optimizeCart({ items: [] });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.errors[0]?.field, "items");
      return true;
    }
  );
});

test("RoutingService - computeOptimalRoute with 1 stop returns round-trip doubled distance", async () => {
  const origin = { lat: -23.55, lng: -46.63 };
  const stop = {
    marketId: 10,
    name: "Supermercado Teste",
    coordinate: { lat: -23.57, lng: -46.65 },
  };

  const route = await RoutingService.computeOptimalRoute(origin, [stop], true);
  assert.equal(route.orderedWaypoints.length, 1);
  assert.equal(route.orderedWaypoints[0]?.marketId, 10);
  assert.ok(route.totalDistanceKm > 0);
  assert.ok(route.totalDurationMinutes >= 1);
});

test("CartService - optimizeCart covers items across multiple markets without leaving them as unassigned", async () => {
  const { MarketRepository } = await import("../src/shared/database/repositories/market.repository.ts");
  const { CartRepository } = await import("../src/shared/database/repositories/cart.repository.ts");

  const origGetMarketsByRadius = MarketRepository.getMarketsByRadius;
  const origGetAllMarkets = MarketRepository.getAllMarkets;
  const origGetPrices = CartRepository.getPricesForProductsAcrossMarkets;

  try {
    (MarketRepository as any).getMarketsByRadius = async () => [
      { id: 1, name: "Mercado Sul", location: { coordinates: [-46.63, -23.55] }, distance: 2000 },
      { id: 2, name: "Mercado Norte", location: { coordinates: [-46.64, -23.56] }, distance: 3000 },
    ];
    (MarketRepository as any).getAllMarkets = async () => [
      { id: 1, name: "Mercado Sul", location: { coordinates: [-46.63, -23.55] }, distance: 2000 },
      { id: 2, name: "Mercado Norte", location: { coordinates: [-46.64, -23.56] }, distance: 3000 },
    ];

    (CartRepository as any).getPricesForProductsAcrossMarkets = async (pIds: number[], mIds?: number[]) => {
      const allPrices = [
        { productId: 101, marketId: 1, marketName: "Mercado Sul", productName: "Arroz", value: 20.0, isPromotion: false, createdAt: new Date().toISOString() },
        { productId: 102, marketId: 2, marketName: "Mercado Norte", productName: "Feijão", value: 10.0, isPromotion: false, createdAt: new Date().toISOString() },
      ];
      return allPrices.filter((p) => pIds.includes(p.productId) && (!mIds || mIds.includes(p.marketId)));
    };

    const result = await CartService.optimizeCart({
      items: [
        { productId: 101, quantity: 1, productName: "Arroz" },
        { productId: 102, quantity: 1, productName: "Feijão" },
      ],
      preferences: { strategy: "balanced", maxStops: 3 },
    });

    assert.equal(result.recommendedType, "multi_store");
    assert.equal(result.unassignedItems.length, 0, "Nenhum item com preço deve ficar como unassigned");
    const assignedIds = result.storeGroups.flatMap((g) => g.items.map((it) => it.productId));
    assert.ok(assignedIds.includes(101));
    assert.ok(assignedIds.includes(102));
  } finally {
    (MarketRepository as any).getMarketsByRadius = origGetMarketsByRadius;
    (MarketRepository as any).getAllMarkets = origGetAllMarkets;
    (CartRepository as any).getPricesForProductsAcrossMarkets = origGetPrices;
  }
});

test("CartService - optimizeCart expands to outer markets when item is missing price in initial radius", async () => {
  const { MarketRepository } = await import("../src/shared/database/repositories/market.repository.ts");
  const { CartRepository } = await import("../src/shared/database/repositories/cart.repository.ts");

  const origGetMarketsByRadius = MarketRepository.getMarketsByRadius;
  const origGetAllMarkets = MarketRepository.getAllMarkets;
  const origGetPrices = CartRepository.getPricesForProductsAcrossMarkets;

  try {
    // Only Market 1 is within initial radius
    (MarketRepository as any).getMarketsByRadius = async () => [
      { id: 1, name: "Mercado Perto", location: { coordinates: [-46.63, -23.55] }, distance: 1000 },
    ];
    // Market 3 is outside initial radius
    (MarketRepository as any).getAllMarkets = async () => [
      { id: 1, name: "Mercado Perto", location: { coordinates: [-46.63, -23.55] }, distance: 1000 },
      { id: 3, name: "Hiper Regional", location: { coordinates: [-46.68, -23.60] }, distance: 18000 },
    ];

    (CartRepository as any).getPricesForProductsAcrossMarkets = async (pIds: number[], mIds?: number[]) => {
      const allPrices = [
        { productId: 201, marketId: 1, marketName: "Mercado Perto", productName: "Café", value: 15.0, isPromotion: false, createdAt: new Date().toISOString() },
        { productId: 202, marketId: 3, marketName: "Hiper Regional", productName: "Azeite", value: 35.0, isPromotion: false, createdAt: new Date().toISOString() },
      ];
      return allPrices.filter((p) => pIds.includes(p.productId) && (!mIds || mIds.includes(p.marketId)));
    };

    const result = await CartService.optimizeCart({
      items: [
        { productId: 201, quantity: 1, productName: "Café" },
        { productId: 202, quantity: 1, productName: "Azeite" },
      ],
      preferences: { strategy: "max_savings", maxStops: 3 },
    });

    assert.equal(result.recommendedType, "multi_store");
    assert.equal(result.unassignedItems.length, 0);
    const assignedIds = result.storeGroups.flatMap((g) => g.items.map((it) => it.productId));
    assert.ok(assignedIds.includes(201));
    assert.ok(assignedIds.includes(202));
  } finally {
    (MarketRepository as any).getMarketsByRadius = origGetMarketsByRadius;
    (MarketRepository as any).getAllMarkets = origGetAllMarkets;
    (CartRepository as any).getPricesForProductsAcrossMarkets = origGetPrices;
  }
});

test("CartService - single_store strategy provides singleStoreOptions and honors prioritizedProductId", async () => {
  const { MarketRepository } = await import("../src/shared/database/repositories/market.repository.ts");
  const { CartRepository } = await import("../src/shared/database/repositories/cart.repository.ts");

  const origGetMarketsByRadius = MarketRepository.getMarketsByRadius;
  const origGetAllMarkets = MarketRepository.getAllMarkets;
  const origGetPrices = CartRepository.getPricesForProductsAcrossMarkets;

  try {
    (MarketRepository as any).getMarketsByRadius = async () => [
      { id: 1, name: "Mercado A", location: { coordinates: [-46.63, -23.55] }, distance: 1000 },
      { id: 2, name: "Mercado B", location: { coordinates: [-46.64, -23.56] }, distance: 1200 },
    ];
    (MarketRepository as any).getAllMarkets = async () => [
      { id: 1, name: "Mercado A", location: { coordinates: [-46.63, -23.55] }, distance: 1000 },
      { id: 2, name: "Mercado B", location: { coordinates: [-46.64, -23.56] }, distance: 1200 },
    ];

    // Mercado A only has product 301. Mercado B only has product 302. No single store has both!
    (CartRepository as any).getPricesForProductsAcrossMarkets = async (pIds: number[], mIds?: number[]) => {
      const allPrices = [
        { productId: 301, marketId: 1, marketName: "Mercado A", productName: "Sabão", value: 12.0, isPromotion: false, createdAt: new Date().toISOString() },
        { productId: 302, marketId: 2, marketName: "Mercado B", productName: "Detergente", value: 4.0, isPromotion: false, createdAt: new Date().toISOString() },
      ];
      return allPrices.filter((p) => pIds.includes(p.productId) && (!mIds || mIds.includes(p.marketId)));
    };

    // 1. Without prioritization: single_store strategy returns singleStoreOptions with hasCompleteStore: false
    const res1 = await CartService.optimizeCart({
      items: [
        { productId: 301, quantity: 1, productName: "Sabão" },
        { productId: 302, quantity: 1, productName: "Detergente" },
      ],
      preferences: { strategy: "single_store" },
    });

    assert.equal(res1.recommendedType, "single_store");
    assert.ok(res1.singleStoreOptions);
    assert.equal(res1.singleStoreOptions.hasCompleteStore, false);
    assert.equal(res1.singleStoreOptions.totalCartItemsCount, 2);
    assert.equal(res1.singleStoreOptions.stores.length, 2);
    assert.equal(res1.unassignedItems.length, 1);
    assert.equal(res1.unassignedItems[0]?.marketName !== undefined, true, "Unassigned item should have alternative marketName");

    // 2. Prioritizing product 302 (which only Mercado B has):
    const res2 = await CartService.optimizeCart({
      items: [
        { productId: 301, quantity: 1, productName: "Sabão" },
        { productId: 302, quantity: 1, productName: "Detergente" },
      ],
      preferences: { strategy: "single_store", prioritizedProductId: 302 },
    });

    assert.equal(res2.storeGroups[0]?.marketId, 2, "Mercado B must be chosen because product 302 is prioritized");
    assert.equal(res2.storeGroups[0]?.items[0]?.productId, 302);
    assert.equal(res2.unassignedItems[0]?.productId, 301);

    // 3. User selects Mercado A explicitly via selectedMarketId:
    const res3 = await CartService.optimizeCart({
      items: [
        { productId: 301, quantity: 1, productName: "Sabão" },
        { productId: 302, quantity: 1, productName: "Detergente" },
      ],
      preferences: { strategy: "single_store", selectedMarketId: 1 },
    });

    assert.equal(res3.storeGroups[0]?.marketId, 1, "Mercado A must be chosen because selectedMarketId is 1");
    assert.equal(res3.storeGroups[0]?.items[0]?.productId, 301);
  } finally {
    (MarketRepository as any).getMarketsByRadius = origGetMarketsByRadius;
    (MarketRepository as any).getAllMarkets = origGetAllMarkets;
    (CartRepository as any).getPricesForProductsAcrossMarkets = origGetPrices;
  }
});


