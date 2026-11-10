/**
 * scripts/bump_version.ts
 *
 * Gerencia a atualização semântica de versões no Presco (INI3A-EQ3).
 * Sincroniza package.json raiz, src/backend/package.json, src/frontend/package.json,
 * src/frontend/app.json (version e versionCode).
 *
 * Uso:
 *   npx tsx scripts/bump_version.ts [major|minor|patch] [--dry-run]
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export type BumpType = "major" | "minor" | "patch";

export interface VersionInfo {
  currentVersion: string;
  nextVersion: string;
  currentVersionCode: number;
  nextVersionCode: number;
}

export interface BumpOptions {
  dryRun?: boolean;
  force?: boolean;
  skipScopeCheck?: boolean;
}

export function checkAppChanges(): {
  hasAppChanges: boolean;
  frontend: boolean;
  backend: boolean;
  files: string[];
} {
  try {
    const statusOut = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const statusFiles = statusOut
      .split("\n")
      .map((l) => l.slice(3).trim())
      .filter(Boolean);

    let diffBranchFiles: string[] = [];
    try {
      const baseBranch = execSync(
        "git rev-parse --verify origin/dev 2>/dev/null || git rev-parse --verify dev 2>/dev/null",
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      )
        .trim()
        .split("\n")[0];

      if (baseBranch) {
        const branchDiff = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "ignore"],
        });
        diffBranchFiles = branchDiff.split("\n").map((f) => f.trim()).filter(Boolean);
      }
    } catch {
      // Ignora erro de branch
    }

    const allFiles = Array.from(new Set([...statusFiles, ...diffBranchFiles]));

    const frontendFiles = allFiles.filter(
      (f) =>
        f.startsWith("src/frontend/") &&
        f !== "src/frontend/package.json" &&
        f !== "src/frontend/app.json"
    );

    const backendFiles = allFiles.filter(
      (f) => f.startsWith("src/backend/") && f !== "src/backend/package.json"
    );

    return {
      hasAppChanges: frontendFiles.length > 0 || backendFiles.length > 0,
      frontend: frontendFiles.length > 0,
      backend: backendFiles.length > 0,
      files: [...frontendFiles, ...backendFiles],
    };
  } catch {
    return { hasAppChanges: true, frontend: true, backend: true, files: [] };
  }
}

export function parseSemver(v: string): { major: number; minor: number; patch: number } {
  const clean = v.trim().replace(/^v/, "");
  const parts = clean.split(".").map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(isNaN)) {
    throw new Error(`Versão inválida: "${v}"`);
  }
  return { major: parts[0]!, minor: parts[1]!, patch: parts[2]! };
}

export function computeNextVersion(current: string, type: BumpType): string {
  const { major, minor, patch } = parseSemver(current);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Tipo de bump desconhecido: ${type}`);
  }
}

export function applyVersionBump(
  type: BumpType = "patch",
  optionsInput: boolean | BumpOptions = false
): VersionInfo {
  const opts: BumpOptions =
    typeof optionsInput === "boolean"
      ? { dryRun: optionsInput, skipScopeCheck: true }
      : optionsInput;

  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);
  const skipScopeCheck = Boolean(opts.skipScopeCheck);

  if (!force && !skipScopeCheck) {
    const scope = checkAppChanges();
    if (!scope.hasAppChanges) {
      throw new Error(
        "SemVer bump abortado: Nenhuma modificação detectada em 'src/frontend/' ou 'src/backend/'.\n" +
          "A política do Presco exige que o SemVer seja alterado SOMENTE quando o front ou o back forem alterados.\n" +
          "Use a flag --force para aplicar o bump manualmente caso necessário."
      );
    }
  }

  const rootPkgPath = path.join(ROOT, "package.json");
  const backendPkgPath = path.join(ROOT, "src", "backend", "package.json");
  const frontendPkgPath = path.join(ROOT, "src", "frontend", "package.json");
  const appJsonPath = path.join(ROOT, "src", "frontend", "app.json");

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const currentVersion = rootPkg.version || "1.0.0";
  const nextVersion = computeNextVersion(currentVersion, type);

  let currentVersionCode = 1;
  let nextVersionCode = 2;

  let appJson: any = null;
  if (fs.existsSync(appJsonPath)) {
    appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    currentVersionCode = appJson.expo?.android?.versionCode ?? 1;
    nextVersionCode = currentVersionCode + 1;
  }

  if (!dryRun) {
    // 1. Root package.json
    rootPkg.version = nextVersion;
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n", "utf8");

    // 2. Backend package.json
    if (fs.existsSync(backendPkgPath)) {
      const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, "utf8"));
      backendPkg.version = nextVersion;
      fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2) + "\n", "utf8");
    }

    // 3. Frontend package.json
    if (fs.existsSync(frontendPkgPath)) {
      const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, "utf8"));
      frontendPkg.version = nextVersion;
      fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2) + "\n", "utf8");
    }

    // 4. Frontend app.json
    if (appJson) {
      if (!appJson.expo) appJson.expo = {};
      appJson.expo.version = nextVersion;
      if (!appJson.expo.android) appJson.expo.android = {};
      appJson.expo.android.versionCode = nextVersionCode;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n", "utf8");
    }
  }

  return {
    currentVersion,
    nextVersion,
    currentVersionCode,
    nextVersionCode,
  };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const typeArg = (args.find((a) => !a.startsWith("--")) || "patch") as BumpType;
  const isDryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  if (!["major", "minor", "patch"].includes(typeArg)) {
    console.error(`Uso: npx tsx scripts/bump_version.ts [major|minor|patch] [--dry-run] [--force]`);
    process.exit(1);
  }

  try {
    const res = applyVersionBump(typeArg, { dryRun: isDryRun, force });
    console.log(`\nPresco Version Bump ${isDryRun ? "(DRY RUN)" : ""}`);
    console.log(`Versao: ${res.currentVersion} -> ${res.nextVersion}`);
    console.log(`Android versionCode: ${res.currentVersionCode} -> ${res.nextVersionCode}\n`);
  } catch (err: any) {
    console.error(`\n${err?.message || err}\n`);
    process.exit(1);
  }
}
