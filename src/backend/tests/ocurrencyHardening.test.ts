import test from "node:test";
import assert from "node:assert/strict";
import { ocurrencyService } from "../src/modules/ocurrency/ocurrency.service";
import { OcurrencyRepository } from "../src/shared/database/repositories/ocurrency.repository";
import { ProductRepository } from "../src/shared/database/repositories/product.repository";
import { MarketRepository } from "../src/shared/database/repositories/market.repository";
import { UserRepository } from "../src/shared/database/repositories/user.repository";
import { ValidationError } from "../src/shared/errors/errors";

test("Ocurrency Hardening - Validates price boundaries [0.10, 15000.00]", async () => {
  // 1. Below 0.10 (e.g. 0.05 or 0)
  await assert.rejects(
    async () => {
      await ocurrencyService.create({
        userId: 1,
        productId: 1,
        marketId: 1,
        value: 0.05,
      });
    },
    (err: any) => {
      assert(err instanceof ValidationError);
      assert.strictEqual(err.errors[0]?.field, "value");
      assert.match(err.errors[0]?.message, /entre R\$ 0,10 e R\$ 15\.000,00/);
      return true;
    }
  );

  // 2. Above 15000.00 (e.g. 15000.01)
  await assert.rejects(
    async () => {
      await ocurrencyService.create({
        userId: 1,
        productId: 1,
        marketId: 1,
        value: 15000.01,
      });
    },
    (err: any) => {
      assert(err instanceof ValidationError);
      assert.strictEqual(err.errors[0]?.field, "value");
      return true;
    }
  );
});

test("Ocurrency Hardening - Cold Start isolates unverified quotes", async () => {
  // Mock dependencies
  const origGetProduct = ProductRepository.getProductById;
  const origGetMarket = MarketRepository.getMarket;
  const origFindRecent = OcurrencyRepository.findRecentByUserAndProduct;
  const origGetStats = OcurrencyRepository.getAdaptivePriceStats;
  const origFindCorroboration = OcurrencyRepository.findPendingColdStartCorroboration;
  const origCreate = OcurrencyRepository.create;
  const origGetUser = UserRepository.getUserById;

  try {
    ProductRepository.getProductById = async () => ({ id: 99, name: "Produto Teste" } as any);
    MarketRepository.getMarket = async () => [{ id: 10, name: "Mercado Teste" } as any];
    OcurrencyRepository.findRecentByUserAndProduct = async () => null;
    OcurrencyRepository.findPendingColdStartCorroboration = async () => null;

    // Simulate Cold Start: count = 0
    OcurrencyRepository.getAdaptivePriceStats = async () => ({
      count: 0,
      distinctUsers: 0,
      avgPrice: null,
      stddevPrice: 0,
      minPrice: null,
      maxPrice: null,
      hasQuorumForCandidate: false,
      quorumCount: 0,
    });

    let createdPayload: any = null;
    OcurrencyRepository.create = async (dto) => {
      createdPayload = dto;
      return [{ id: 777, ...dto }] as any;
    };
    UserRepository.getUserById = async () => ({ id: 1, points: 50 } as any);

    const result = await ocurrencyService.create({
      userId: 1,
      productId: 99,
      marketId: 10,
      value: "25.50",
    });

    // Occurrence must be created with trustFlag: false and isSuspended: true
    assert.strictEqual(createdPayload.trustFlag, false);
    assert.strictEqual(createdPayload.isSuspended, true);
    assert.strictEqual(createdPayload.isResolved, false);

    // Response must mark provisional/pendingApproval and 0 XP
    assert.strictEqual(result.pointsEarned, 0);
    assert.strictEqual(result.isSuspended, true);
    assert.strictEqual(result.pendingApproval, true);
    assert.strictEqual(result.isColdStart, true);
  } finally {
    ProductRepository.getProductById = origGetProduct;
    MarketRepository.getMarket = origGetMarket;
    OcurrencyRepository.findRecentByUserAndProduct = origFindRecent;
    OcurrencyRepository.getAdaptivePriceStats = origGetStats;
    OcurrencyRepository.findPendingColdStartCorroboration = origFindCorroboration;
    OcurrencyRepository.create = origCreate;
    UserRepository.getUserById = origGetUser;
  }
});

test("Ocurrency Hardening - Cold Start multi-user corroboration unlocks trusted price", async () => {
  const origGetProduct = ProductRepository.getProductById;
  const origGetMarket = MarketRepository.getMarket;
  const origFindRecent = OcurrencyRepository.findRecentByUserAndProduct;
  const origGetStats = OcurrencyRepository.getAdaptivePriceStats;
  const origFindCorroboration = OcurrencyRepository.findPendingColdStartCorroboration;
  const origApprove = OcurrencyRepository.approveOccurrence;
  const origCreate = OcurrencyRepository.create;
  const origIncrPoints = UserRepository.incrementPoints;

  try {
    ProductRepository.getProductById = async () => ({ id: 99, name: "Produto Teste" } as any);
    MarketRepository.getMarket = async () => [{ id: 10, name: "Mercado Teste" } as any];
    OcurrencyRepository.findRecentByUserAndProduct = async () => null;

    // Simulate Cold Start: count = 0, but user 2 corroborates previous provisional quote from user 1
    OcurrencyRepository.getAdaptivePriceStats = async () => ({
      count: 0,
      distinctUsers: 0,
      avgPrice: null,
      stddevPrice: 0,
      minPrice: null,
      maxPrice: null,
      hasQuorumForCandidate: false,
      quorumCount: 0,
    });

    let approvedId: number | null = null;
    OcurrencyRepository.findPendingColdStartCorroboration = async () =>
      ({ id: 501, userId: 1, productId: 99, marketId: 10, value: "25.00", createdAt: new Date().toISOString() } as any);

    OcurrencyRepository.approveOccurrence = async (id) => {
      approvedId = id;
      return { id, isSuspended: false, isResolved: true, trustFlag: true } as any;
    };

    let createdPayload: any = null;
    OcurrencyRepository.create = async (dto) => {
      createdPayload = dto;
      return [{ id: 502, ...dto }] as any;
    };

    UserRepository.incrementPoints = async (uid, pts) => ({ id: uid, points: pts } as any);

    const result = await ocurrencyService.create({
      userId: 2,
      productId: 99,
      marketId: 10,
      value: "25.50",
    });

    // Prior quote was approved
    assert.strictEqual(approvedId, 501);

    // Current quote was created as active and trusted
    assert.strictEqual(createdPayload.trustFlag, true);
    assert.strictEqual(createdPayload.isSuspended, false);
    assert.strictEqual(createdPayload.isResolved, true);

    // Points awarded
    assert.strictEqual(result.pointsEarned, 15);
    assert.strictEqual(result.corroborated, true);
    assert.strictEqual(result.isSuspended, false);
  } finally {
    ProductRepository.getProductById = origGetProduct;
    MarketRepository.getMarket = origGetMarket;
    OcurrencyRepository.findRecentByUserAndProduct = origFindRecent;
    OcurrencyRepository.getAdaptivePriceStats = origGetStats;
    OcurrencyRepository.findPendingColdStartCorroboration = origFindCorroboration;
    OcurrencyRepository.approveOccurrence = origApprove;
    OcurrencyRepository.create = origCreate;
    UserRepository.incrementPoints = origIncrPoints;
  }
});

test("Ocurrency Hardening - Variance Floor prevents zero division and infinite Z-scores", async () => {
  // Mock db.execute to return identical prices (zero variance)
  const { db } = await import("../src/shared/database/database");
  const origDbExecute = db.execute;

  try {
    db.execute = (async () => {
      return {
        rows: [
          {
            recent_count: 5,
            distinct_users: 3,
            avg_price: "10.00",
            median_price: "10.00",
            stddev_price: "0",
            min_price: "10.00",
            max_price: "10.00",
            vals: ["10.00", "10.00", "10.00", "10.00", "10.00"],
          },
        ],
      } as any;
    }) as any;

    const stats = await OcurrencyRepository.getAdaptivePriceStats(1, 10.0);

    // Baseline median is 10.00. 5% variance floor = 0.50.
    const expectedFloor = 0.05 * 10.0;
    assert.strictEqual(stats.count, 5);
    assert.strictEqual(stats.avgPrice, 10.0);
    assert.strictEqual(stats.medianPrice, 10.0);
    assert.strictEqual(stats.stddevPrice, expectedFloor);
    assert.strictEqual(stats.madPrice, expectedFloor);
    assert(stats.stddevPrice > 0, "Variance floor must guarantee stddevPrice > 0");

    // Z-score calculation test: delta = 5, sigma = 0.5 -> zScore = 10 (not Infinity or NaN)
    const delta = Math.abs(15.0 - (stats.avgPrice || 0));
    const zScore = stats.stddevPrice > 0 ? delta / stats.stddevPrice : 0;
    assert.strictEqual(zScore, 10);
    assert(isFinite(zScore));
  } finally {
    db.execute = origDbExecute;
  }
});

test("Ocurrency Hardening - parseCurrencyValue accurately handles pt-BR thousands and decimal separators", async () => {
  const { parseCurrencyValue } = await import("../src/modules/ocurrency/ocurrency.service");

  assert.strictEqual(parseCurrencyValue("1.500,00"), 1500.00);
  assert.strictEqual(parseCurrencyValue("15.000,00"), 15000.00);
  assert.strictEqual(parseCurrencyValue("0,10"), 0.10);
  assert.strictEqual(parseCurrencyValue("25,50"), 25.50);
  assert.strictEqual(parseCurrencyValue("1500.00"), 1500.00);
  assert.strictEqual(parseCurrencyValue("R$ 1.250,50"), 1250.50);
  assert.strictEqual(parseCurrencyValue(99.9), 99.9);
  assert.ok(isNaN(parseCurrencyValue("not_a_number")));
  assert.ok(isNaN(parseCurrencyValue("")));
});

test("Ocurrency Hardening - update method re-evaluates outliers and suspends abnormal price shifts", async () => {
  const origFind = OcurrencyRepository.findById;
  const origStats = OcurrencyRepository.getAdaptivePriceStats;
  const origUpdate = OcurrencyRepository.update;

  try {
    OcurrencyRepository.findById = async () => ({
      id: 10,
      userId: 42,
      productId: 5,
      marketId: 2,
      value: "10.00",
      isSuspended: false,
      isResolved: true,
      trustFlag: true,
    } as any);

    // Existing baseline for product is R$ 10.00 with small stddev
    OcurrencyRepository.getAdaptivePriceStats = async () => ({
      count: 10,
      distinctUsers: 5,
      avgPrice: 10.00,
      stddevPrice: 1.00,
      minPrice: 8.00,
      maxPrice: 12.00,
      hasQuorumForCandidate: false,
      quorumCount: 0,
    });

    let capturedUpdatePayload: any = null;
    OcurrencyRepository.update = async (id, data) => {
      capturedUpdatePayload = data;
      return [{ id, ...data }] as any;
    };

    // User attempts to edit price to R$ 500.00 (extreme outlier)
    await ocurrencyService.update(42, 1, 10, {
      value: "500,00",
    });

    // The update MUST suspend the occurrence and strip trusted flag
    assert.ok(capturedUpdatePayload);
    assert.strictEqual(capturedUpdatePayload.value, 500.00);
    assert.strictEqual(capturedUpdatePayload.isSuspended, true);
    assert.strictEqual(capturedUpdatePayload.isResolved, false);
    assert.strictEqual(capturedUpdatePayload.trustFlag, false);
  } finally {
    OcurrencyRepository.findById = origFind;
    OcurrencyRepository.getAdaptivePriceStats = origStats;
    OcurrencyRepository.update = origUpdate;
  }
});

test("Ocurrency Hardening - approve is idempotent and prevents infinite XP farming", async () => {
  const origFind = OcurrencyRepository.findById;
  const origApprove = OcurrencyRepository.approveOccurrence;
  const origIncrPoints = UserRepository.incrementPoints;

  let pointsIncrementCount = 0;

  try {
    // 1. First approval: unresolved occurrence
    OcurrencyRepository.findById = async () => ({
      id: 33,
      userId: 10,
      productId: 1,
      marketId: 1,
      value: "15.00",
      isSuspended: true,
      isResolved: false,
      trustFlag: false,
    } as any);

    OcurrencyRepository.approveOccurrence = async (id) => ({
      id,
      isSuspended: false,
      isResolved: true,
      trustFlag: true,
    } as any);

    UserRepository.incrementPoints = async (uid, pts) => {
      pointsIncrementCount += pts;
      return { id: uid, points: pointsIncrementCount } as any;
    };

    const firstResult = await ocurrencyService.approve(999, 33);
    assert.ok(firstResult.approved);
    assert.strictEqual(pointsIncrementCount, 15);

    // 2. Second approval attempt: occurrence is already resolved and active
    OcurrencyRepository.findById = async () => ({
      id: 33,
      userId: 10,
      productId: 1,
      marketId: 1,
      value: "15.00",
      isSuspended: false,
      isResolved: true,
      trustFlag: true,
    } as any);

    const secondResult = await ocurrencyService.approve(999, 33);
    assert.ok(secondResult.approved);
    // Points must NOT have been incremented a second time!
    assert.strictEqual(pointsIncrementCount, 15);
  } finally {
    OcurrencyRepository.findById = origFind;
    OcurrencyRepository.approveOccurrence = origApprove;
    UserRepository.incrementPoints = origIncrPoints;
  }
});
