import test from "node:test";
import assert from "node:assert/strict";
import { fetchOpenFoodFactsStatus } from "../src/frontend/services/upptimeService";

test("upptimeService - fetchOpenFoodFactsStatus fetches and parses OpenFoodFacts Upptime summary", async () => {
  const result = await fetchOpenFoodFactsStatus(true);

  assert.ok(result, "Result should not be null");
  assert.ok(
    result.overallStatus === "all_up" || result.overallStatus === "has_issues",
    `Expected overallStatus to be all_up or has_issues, got: ${result.overallStatus}`
  );
  assert.ok(result.totalCount > 0, "Should have more than 0 services");
  assert.ok(result.essentialServices.length > 0, "Should have essential services mapped");

  // Check presence of EAN service
  const eanService = result.essentialServices.find((s) => s.prescoUsageType === "ean");
  assert.ok(eanService, "Should have mapped an EAN service (API v2 or API v3)");
  assert.ok(typeof eanService?.name === "string");
  assert.ok(typeof eanService?.uptime === "string");

  // Check presence of Images service
  const imgService = result.essentialServices.find((s) => s.prescoUsageType === "images");
  assert.ok(imgService, "Should have mapped Images CDN service");
  assert.ok(imgService?.slug === "open-food-facts-images");
  assert.ok(typeof imgService?.status === "string");

  // Check in-memory caching
  const cached = await fetchOpenFoodFactsStatus(false);
  assert.equal(cached.fromCache, true, "Subsequent call within TTL should return fromCache: true");
});
