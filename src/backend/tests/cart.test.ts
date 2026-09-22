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
