import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { InMemoryStore, inMemoryStore } from "../src/shared/redis/server";
import { createRateLimiter, isAuthorizedTestBypass } from "../src/shared/middlewares/rateLimiter";
import { cacheResponse, invalidateCachePattern } from "../src/shared/middlewares/cacheMiddleware";
import { productController } from "../src/modules/product/product.controller";
import { productService } from "../src/modules/product/product.service";
import { imageOptimizerController } from "../src/modules/image/image.controller";
import { TooManyRequestsError } from "../src/shared/errors/errors";

test("InMemoryStore - isolates auth and cache partitions and enforces LRU & 256 KiB single-entry cap", () => {
  const store = new InMemoryStore();

  // Fill auth partition with session key
  store.set("refresh:session-1", "user-42", 60);

  // Fill cache partition beyond 300 entries
  for (let i = 0; i < 350; i++) {
    if (i === 1) {
      // Touch entry 0 after adding 1 so entry 0 is promoted in LRU before eviction kicks in
      assert.equal(store.get("cache:http:products:v0:k0"), "v0");
    }
    store.set(`cache:http:products:v0:k${i}`, `v${i}`, 60);
  }

  const stats = store.getStats();
  assert.equal(stats.cache.entries, 300, "Cache partition must cap at 300 entries");
  assert.equal(store.get("refresh:session-1"), "user-42", "Cache churn must NEVER evict auth partition entries");

  // Entry exceeding 256 KiB must be rejected silently without crashing or bloating RAM
  const oversized = "x".repeat(260 * 1024);
  store.set("cache:http:products:v0:huge", oversized, 60);
  assert.equal(store.get("cache:http:products:v0:huge"), null);
});

test("rateLimiter - blocks spoofed headers and only allows NODE_ENV=test + matching X-K6-Test-Secret", async () => {
  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.K6_TEST_SECRET;

  try {
    process.env.NODE_ENV = "production";
    process.env.K6_TEST_SECRET = "super-secret";
    assert.equal(
      isAuthorizedTestBypass({
        headers: {
          "x-bypass-rate-limit": "true",
          "user-agent": "Presco-k6-PerformanceTest/1.0",
          "x-k6-test-secret": "super-secret",
        },
      } as any),
      false,
      "Production must NEVER allow rate-limit bypass",
    );

    process.env.NODE_ENV = "test";
    assert.equal(
      isAuthorizedTestBypass({
        headers: {
          "user-agent": "Presco-k6-PerformanceTest/1.0",
          "x-k6-test-secret": "wrong-secret",
        },
      } as any),
      false,
    );

    assert.equal(
      isAuthorizedTestBypass({
        headers: {
          "x-k6-test-secret": "super-secret",
        },
      } as any),
      true,
    );

    // Clear secret so limiter enforces bucket in test
    delete process.env.K6_TEST_SECRET;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
      keyPrefix: `unit_${Date.now()}`,
    });

    const mkReq = (ip: string) => ({ ip, headers: { "x-forwarded-for": "9.9.9.9" }, socket: {} } as any);
    const runLimiter = (req: any) =>
      new Promise<any>((resolve) => limiter(req, {} as any, (err?: any) => resolve(err)));

    assert.equal(await runLimiter(mkReq("198.51.100.1")), undefined);
    assert.equal(await runLimiter(mkReq("198.51.100.1")), undefined);
    const err3 = await runLimiter(mkReq("198.51.100.1"));
    assert.ok(err3 instanceof TooManyRequestsError);
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origSecret === undefined) delete process.env.K6_TEST_SECRET;
    else process.env.K6_TEST_SECRET = origSecret;
  }
});

test("cacheMiddleware - ignores unknown query params (?cb=), respects ENABLE_HTTP_CACHE, caps at 64 KiB, and bumps O(1) version", async () => {
  inMemoryStore.flush();
  const origFlag = process.env.ENABLE_HTTP_CACHE;

  try {
    const mw = cacheResponse({ ttlSeconds: 60 });

    const invoke = async (urlPath: string, query: Record<string, string>, payload: unknown) => {
      const headers: Record<string, string> = {};
      let statusCode = 200;
      let sentBody: any = null;
      const req: any = {
        method: "GET",
        baseUrl: "/products",
        path: urlPath,
        query,
        headers: {},
      };
      const res: any = {
        statusCode: 200,
        setHeader(k: string, v: string) {
          headers[k.toLowerCase()] = v;
        },
        getHeader(k: string) {
          return headers[k.toLowerCase()];
        },
        status(code: number) {
          statusCode = code;
          this.statusCode = code;
          return this;
        },
        send(body: any) {
          sentBody = body;
          return this;
        },
        end() {
          return this;
        },
      };

      let nextCalled = false;
      await mw(req, res, () => {
        nextCalled = true;
      });
      if (nextCalled) {
        res.status(200).send(payload);
      }
      return { headers, statusCode, sentBody, nextCalled };
    };

    // First request -> MISS
    const r1 = await invoke("/", { search: "cafe", cb: "111" }, { items: ["cafe"] });
    assert.equal(r1.headers["x-cache"], "MISS");
    await new Promise((r) => setTimeout(r, 15));

    // Second request with different ?cb= -> MUST HIT (cache-buster ignored)
    const r2 = await invoke("/", { search: "cafe", cb: "999" }, { items: ["should-not-run"] });
    assert.equal(r2.headers["x-cache"], "HIT");
    assert.equal(r2.nextCalled, false);

    // O(1) invalidation bumps version without KEYS *
    await invalidateCachePattern("products");
    const r3 = await invoke("/", { search: "cafe" }, { items: ["cafe-v2"] });
    assert.equal(r3.headers["x-cache"], "MISS");

    // Oversized > 64 KiB must NOT be cached
    const hugePayload = { big: "a".repeat(70_000) };
    const rBig1 = await invoke("/huge", {}, hugePayload);
    assert.equal(rBig1.headers["x-cache"], "MISS");
    await new Promise((r) => setTimeout(r, 15));
    const rBig2 = await invoke("/huge", {}, hugePayload);
    assert.equal(rBig2.headers["x-cache"], "MISS");

    // ENABLE_HTTP_CACHE=false bypasses middleware
    process.env.ENABLE_HTTP_CACHE = "false";
    const rDisabled = await invoke("/", { search: "cafe" }, { items: ["direct"] });
    assert.equal(rDisabled.nextCalled, true);
    assert.equal(rDisabled.headers["x-cache"], undefined);
  } finally {
    if (origFlag === undefined) delete process.env.ENABLE_HTTP_CACHE;
    else process.env.ENABLE_HTTP_CACHE = origFlag;
    inMemoryStore.flush();
  }
});

test("ProductController.createCustomProduct - ignores client strictExistenceCheck=false and User-Agent bypass", async () => {
  const origServiceCreate = productService.createCustomProduct;
  const origEnv = process.env.NODE_ENV;
  let capturedStrictCheck: boolean | undefined;

  try {
    process.env.NODE_ENV = "production";
    (productService as any).createCustomProduct = async (data: any) => {
      capturedStrictCheck = data.strictExistenceCheck;
      return { id: 1, name: data.name };
    };

    const req: any = {
      headers: {
        "user-agent": "Presco-k6-PerformanceTest/1.0",
        "x-bypass-rate-limit": "true",
      },
      body: {
        name: "Produto Spoofed",
        strictExistenceCheck: false,
      },
      user: { id: 10, email: "u@test.com", name: "U", roleId: 1 },
    };
    const res: any = {
      statusCode: 0,
      status(c: number) {
        this.statusCode = c;
        return this;
      },
      json() {
        return this;
      },
    };

    await productController.createCustomProduct(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStrictCheck, true, "Quarantine strictExistenceCheck must remain true");
  } finally {
    process.env.NODE_ENV = origEnv;
    (productService as any).createCustomProduct = origServiceCreate;
  }
});

test("ImageOptimizerController - blocks private IPv4/IPv6 SSRF addresses", async () => {
  const blockedUrls = [
    "http://127.0.0.1/test.png",
    "http://localhost/test.png",
    "http://172.16.0.5/test.png",
    "http://169.254.169.254/latest/meta-data",
    "http://0.0.0.0/test.png",
    "http://[::1]/test.png",
    "http://[fc00::1]/test.png",
    "file:///etc/passwd",
  ];

  for (const url of blockedUrls) {
    let statusCode = 0;
    const req: any = { query: { url }, headers: {} };
    const res: any = {
      status(c: number) {
        statusCode = c;
        return this;
      },
      json() {
        return this;
      },
      setHeader() {},
      send() {
        return this;
      },
    };

    await imageOptimizerController.optimize(req, res, (err) => {
      if (err) throw err;
    });
    assert.ok(statusCode === 400 || statusCode === 403, `Expected 400/403 for SSRF URL ${url}, got ${statusCode}`);
  }
});

test("env.ts - fails fast in production when JWT_SECRET is missing or dev fallback, and defaults SERVER_HOST to 127.0.0.1", () => {
  const backendDir = path.resolve(import.meta.dirname, "..");
  const rootNodeModules = fs.existsSync(path.join(backendDir, "node_modules"))
    ? path.join(backendDir, "node_modules")
    : path.resolve(backendDir, "../../node_modules");
  const envSrcPath = path.resolve(backendDir, "src/shared/config/env.ts");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "presco-env-test-"));
  const isolatedEnvTs = path.join(tmpDir, "env.ts");
  fs.copyFileSync(envSrcPath, isolatedEnvTs);
  fs.symlinkSync(rootNodeModules, path.join(tmpDir, "node_modules"), "dir");

  const runEnvSnippet = (snippet: string, extraEnv: Record<string, string | undefined>) => {
    const childEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) childEnv[k] = v;
    }
    for (const [k, v] of Object.entries(extraEnv)) {
      if (v === undefined) delete childEnv[k];
      else childEnv[k] = v;
    }
    return execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", snippet],
      { cwd: tmpDir, env: childEnv, encoding: "utf8", stdio: "pipe" },
    );
  };

  try {
    // Missing JWT_SECRET in production must throw FATAL: JWT_SECRET
    assert.throws(
      () =>
        runEnvSnippet(`await import(${JSON.stringify(isolatedEnvTs)});`, {
          NODE_ENV: "production",
          JWT_SECRET: undefined,
        }),
      (err: any) => String(err?.stderr || "").includes("FATAL: JWT_SECRET"),
    );

    // Dev fallback JWT_SECRET in staging must throw FATAL: JWT_SECRET
    assert.throws(
      () =>
        runEnvSnippet(`await import(${JSON.stringify(isolatedEnvTs)});`, {
          NODE_ENV: "development",
          PRESCO_ENV: "staging",
          JWT_SECRET: "4d281923e13a7357f829fe54fe4229e57aaf415989dc18f93f629bc8876e9f3f",
        }),
      (err: any) => String(err?.stderr || "").includes("FATAL: JWT_SECRET"),
    );

    // Staging with strong JWT_SECRET defaults SERVER_HOST to 127.0.0.1
    const out = runEnvSnippet(
      `const mod = await import(${JSON.stringify(isolatedEnvTs)}); const env = mod.env ?? mod.default?.env; console.log(env.SERVER_HOST);`,
      {
        NODE_ENV: "development",
        PRESCO_ENV: "staging",
        SERVER_HOST: undefined,
        JWT_SECRET: "strong-isolated-staging-secret-value-2026",
      },
    );
    assert.equal(out.trim().split("\n").pop(), "127.0.0.1");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("database.ts resolveMigrationsFolder - creates temp dir under ~/.presco-tmp, rewrites quoted public only, and cleans up", () => {
  const backendDir = path.resolve(import.meta.dirname, "..");
  const dbFileUrl = new URL("../src/shared/database/database.ts", import.meta.url).href;
  const drizzleDir = path.resolve(backendDir, "src/shared/database/drizzle");

  const out = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
      import fs from "node:fs";
      import os from "node:os";
      import path from "node:path";
      const { resolveMigrationsFolder } = await import(${JSON.stringify(dbFileUrl)});
      const { folder, cleanup } = resolveMigrationsFolder(${JSON.stringify(drizzleDir)});
      const sql0 = fs.readFileSync(path.join(folder, "0000_wide_hitman.sql"), "utf8");
      const sql6 = fs.readFileSync(path.join(folder, "0006_consolidate_runtime_ddl.sql"), "utf8");
      const existsBeforeCleanup = fs.existsSync(folder);
      cleanup();
      const existsAfterCleanup = fs.existsSync(folder);
      console.log(JSON.stringify({
        underHomeTmp: folder.startsWith(path.join(os.homedir(), ".presco-tmp")),
        notInOsTmp: !folder.startsWith("/tmp/"),
        rewroteQuotedType: sql0.includes('CREATE TYPE "staging".'),
        keptPublicGeography: sql0.includes("public.geography"),
        keptPublicTrgm: sql0.includes("public.gin_trgm_ops"),
        rewroteSql6Fk: sql6.includes('REFERENCES "staging"."user"'),
        existsBeforeCleanup,
        existsAfterCleanup,
      }));
      `,
    ],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        DB_SCHEMA: "staging",
      },
      encoding: "utf8",
    },
  );

  const parsed = JSON.parse(out.trim().split("\n").pop()!);
  assert.equal(parsed.underHomeTmp, true);
  assert.equal(parsed.notInOsTmp, true);
  assert.equal(parsed.rewroteQuotedType, true);
  assert.equal(parsed.keptPublicGeography, true);
  assert.equal(parsed.keptPublicTrgm, true);
  assert.equal(parsed.rewroteSql6Fk, true);
  assert.equal(parsed.existsBeforeCleanup, true);
  assert.equal(parsed.existsAfterCleanup, false);
});

test("CLI scripts - importing seed.ts or reallocateMarkets.ts does NOT auto-execute", async () => {
  const seedMod = await import("../src/shared/database/seed");
  const reallocMod = await import("../src/shared/database/reallocateMarkets");
  assert.equal(typeof seedMod.seedDatabase, "function");
  assert.equal(typeof reallocMod.executeReallocation, "function");
});
