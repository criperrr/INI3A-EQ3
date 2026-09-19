import test from "node:test";
import assert from "node:assert/strict";
import { signAccessToken, verifyAccessToken, getTokenRemainingSeconds, ACCESS_TOKEN_EXPIRY } from "../src/shared/util/jwt.ts";

test("JWT Util - signAccessToken should produce valid token with expected claims", () => {
  process.env.JWT_SECRET = "test-secret-suite-key-1234567890123456";

  const payload = {
    id: 42,
    email: "test@presco.com",
    name: "Presco Tester",
    roleId: 2,
  };

  const token = signAccessToken(payload);
  assert.ok(typeof token === "string" && token.split(".").length === 3, "Token should be a valid 3-part JWT");

  const decoded = verifyAccessToken(token);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.name, payload.name);
  assert.equal(decoded.roleId, payload.roleId);
  assert.ok(decoded.jti && typeof decoded.jti === "string", "Token must contain a unique jti");
  assert.ok(decoded.exp && decoded.exp > Math.floor(Date.now() / 1000), "Token must have future expiration");
});

test("JWT Util - getTokenRemainingSeconds should return positive remaining time", () => {
  const decoded = {
    id: 1,
    email: "a@b.com",
    name: "A",
    roleId: 1,
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  const remaining = getTokenRemainingSeconds(decoded as any);
  assert.ok(remaining > 200 && remaining <= 300, "Remaining seconds should be around 300");
});

test("JWT Util - getTokenRemainingSeconds should return 0 for expired token", () => {
  const decoded = {
    id: 1,
    email: "a@b.com",
    name: "A",
    roleId: 1,
    exp: Math.floor(Date.now() / 1000) - 10,
  };

  const remaining = getTokenRemainingSeconds(decoded as any);
  assert.equal(remaining, 0);
});
