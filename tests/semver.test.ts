import test from "node:test";
import assert from "node:assert/strict";
import { parseSemver, computeNextVersion } from "../scripts/bump_version.ts";

test("Semver - parseSemver valid versions", () => {
  assert.deepEqual(parseSemver("1.0.0"), { major: 1, minor: 0, patch: 0 });
  assert.deepEqual(parseSemver("v2.15.3"), { major: 2, minor: 15, patch: 3 });
  assert.deepEqual(parseSemver(" 0.9.12 "), { major: 0, minor: 9, patch: 12 });
});

test("Semver - parseSemver invalid versions throws", () => {
  assert.throws(() => parseSemver("invalid"), /Versão inválida/);
  assert.throws(() => parseSemver("1.0"), /Versão inválida/);
});

test("Semver - computeNextVersion patch, minor, major", () => {
  assert.equal(computeNextVersion("1.0.0", "patch"), "1.0.1");
  assert.equal(computeNextVersion("1.0.9", "patch"), "1.0.10");

  assert.equal(computeNextVersion("1.0.4", "minor"), "1.1.0");
  assert.equal(computeNextVersion("1.5.9", "minor"), "1.6.0");

  assert.equal(computeNextVersion("1.2.3", "major"), "2.0.0");
});
