import test from "node:test";
import assert from "node:assert/strict";
import { AuthRepository } from "../src/shared/database/repositories/auth.repository";

test("2FA Repository - should store, retrieve and delete 2FA code", async () => {
  const testUserId = 9999;
  const code = "789123";

  // Store code
  await AuthRepository.storeTwoFactorCode(testUserId, code, 300);

  // Retrieve code
  const retrieved = await AuthRepository.getTwoFactorCode(testUserId);
  assert.equal(retrieved, code, "Retrieved 2FA code should match stored code");

  // Delete code
  await AuthRepository.deleteTwoFactorCode(testUserId);
  const afterDelete = await AuthRepository.getTwoFactorCode(testUserId);
  assert.equal(afterDelete, null, "Code should be null after deletion");
});

test("2FA Repository - cooldown should prevent immediate re-request", async () => {
  const testUserId = 8888;

  // Initially no cooldown
  const initialCooldown = await AuthRepository.isTwoFactorCooldown(testUserId);
  assert.equal(initialCooldown, false, "Should not be on cooldown initially");

  // Set cooldown
  await AuthRepository.setTwoFactorCooldown(testUserId, 60);
  const activeCooldown = await AuthRepository.isTwoFactorCooldown(testUserId);
  assert.equal(activeCooldown, true, "Should be on cooldown after setting");
});

test("2FA Validation - non-existent code returns null and validates expired", async () => {
  const nonExistentUser = 123456789;
  const code = await AuthRepository.getTwoFactorCode(nonExistentUser);
  assert.equal(code, null, "Code for user without 2FA request should be null");
});

test("2FA Product View Quota - allows 10 distinct products, re-views, and blocks 11th", async () => {
  const testUserId = 77771;

  for (let productId = 1; productId <= 10; productId++) {
    const res = await AuthRepository.trackAndCheckProductViewQuota(testUserId, productId);
    assert.deepEqual(res, { allowed: true, count: productId, limit: 10 });
  }

  // Re-viewing an already viewed product should still be allowed without increasing count
  const reviewRes = await AuthRepository.trackAndCheckProductViewQuota(testUserId, 5);
  assert.deepEqual(reviewRes, { allowed: true, count: 10, limit: 10 });

  // 11th distinct product should be blocked
  const blockedRes = await AuthRepository.trackAndCheckProductViewQuota(testUserId, 11);
  assert.deepEqual(blockedRes, { allowed: false, count: 10, limit: 10 });
});

test("2FA Price Views Quota - allows up to 20 distinct prices, re-views, and blocks 21st", async () => {
  const testUserId = 77772;

  // View first 15 prices
  const firstBatch = Array.from({ length: 15 }, (_, i) => i + 1);
  const firstRes = await AuthRepository.trackAndCheckPriceViewsQuota(testUserId, firstBatch);
  assert.deepEqual(firstRes, {
    allowedIds: firstBatch,
    quotaExceeded: false,
    count: 15,
    limit: 20,
  });

  // Re-view some existing prices + 5 new prices (16..20) + 2 over-limit prices (21, 22)
  const secondBatch = [1, 2, 16, 17, 18, 19, 20, 21, 22];
  const secondRes = await AuthRepository.trackAndCheckPriceViewsQuota(testUserId, secondBatch);
  assert.deepEqual(secondRes, {
    allowedIds: [1, 2, 16, 17, 18, 19, 20],
    quotaExceeded: true,
    count: 20,
    limit: 20,
  });

  // Re-viewing only existing prices when at limit should succeed with quotaExceeded: false
  const reviewRes = await AuthRepository.trackAndCheckPriceViewsQuota(testUserId, [1, 10, 20]);
  assert.deepEqual(reviewRes, {
    allowedIds: [1, 10, 20],
    quotaExceeded: false,
    count: 20,
    limit: 20,
  });

  // Viewing a 21st distinct price alone should be blocked
  const blockedRes = await AuthRepository.trackAndCheckPriceViewsQuota(testUserId, [21]);
  assert.deepEqual(blockedRes, {
    allowedIds: [],
    quotaExceeded: true,
    count: 20,
    limit: 20,
  });
});

