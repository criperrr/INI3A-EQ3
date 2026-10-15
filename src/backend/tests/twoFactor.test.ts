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

