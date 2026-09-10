import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryStore } from "../src/shared/redis/server.ts";

test("InMemoryStore - set, get, exists and del operations", () => {
  const store = new InMemoryStore();
  store.set("foo", "bar");
  assert.equal(store.get("foo"), "bar");
  assert.equal(store.exists("foo"), 1);

  assert.equal(store.del("foo"), 1);
  assert.equal(store.get("foo"), null);
  assert.equal(store.exists("foo"), 0);
});

test("InMemoryStore - incr operation", () => {
  const store = new InMemoryStore();
  assert.equal(store.incr("counter"), 1);
  assert.equal(store.incr("counter"), 2);
  assert.equal(store.incr("counter"), 3);
  assert.equal(store.get("counter"), "3");
});

test("InMemoryStore - ttl expiration logic", async () => {
  const store = new InMemoryStore();
  store.set("expiring", "value", 1); // 1 sec
  assert.equal(store.get("expiring"), "value");

  await new Promise((res) => setTimeout(res, 1100));
  assert.equal(store.get("expiring"), null);
  assert.equal(store.exists("expiring"), 0);
});

test("InMemoryStore - pattern matching keys", () => {
  const store = new InMemoryStore();
  store.set("products:1", "apple");
  store.set("products:2", "banana");
  store.set("users:1", "alice");

  const productKeys = store.keys("products:*");
  assert.equal(productKeys.length, 2);
  assert.ok(productKeys.includes("products:1"));
  assert.ok(productKeys.includes("products:2"));
});
