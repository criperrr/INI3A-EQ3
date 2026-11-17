import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const distDir = path.join(backendDir, "dist");
const tsconfigPath = path.join(backendDir, "tsconfig.json");

const entrySpecs = [
  { in: "src/server.ts", out: "dist/server.mjs" },
  { in: "src/shared/database/migrate.ts", out: "dist/cli/migrate.mjs" },
  { in: "src/shared/database/seed.ts", out: "dist/cli/seed.mjs" },
  { in: "src/shared/database/reallocateMarkets.ts", out: "dist/cli/reallocateMarkets.mjs" },
  { in: "src/shared/database/healthCheck.ts", out: "dist/cli/healthCheck.mjs" },
];

async function runBuild() {
  fs.rmSync(distDir, { recursive: true, force: true });

  for (const spec of entrySpecs) {
    await build({
      entryPoints: [path.join(backendDir, spec.in)],
      outfile: path.join(backendDir, spec.out),
      bundle: true,
      platform: "node",
      target: "node24",
      format: "esm",
      packages: "external",
      tsconfig: tsconfigPath,
      sourcemap: true,
    });
  }

  const srcDrizzleDir = path.join(backendDir, "src/shared/database/drizzle");
  const distDrizzleDir = path.join(distDir, "shared/database/drizzle");
  fs.mkdirSync(path.dirname(distDrizzleDir), { recursive: true });
  fs.cpSync(srcDrizzleDir, distDrizzleDir, { recursive: true });

  const requiredOutputs = [
    ...entrySpecs.map((s) => s.out),
    "dist/shared/database/drizzle/meta/_journal.json",
  ];
  for (const rel of requiredOutputs) {
    const abs = path.join(backendDir, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(`[BUILD] Missing expected bundle artifact: ${rel}`);
    }
  }

  console.log(`[OK] Backend ESM bundle built cleanly (${entrySpecs.length} entrypoints + drizzle migrations).`);
}

runBuild().catch((err) => {
  console.error("[FAIL] Backend bundle build error:", err);
  process.exit(1);
});
