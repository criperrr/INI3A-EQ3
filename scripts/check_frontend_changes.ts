/**
 * scripts/check_frontend_changes.ts
 *
 * Analisa o histórico de commits do Git para determinar com precisão cirúrgica
 * se houve alterações reais no código, dependências ou configurações do Front-end (src/frontend/).
 *
 * Diferencia alterações reais de frontend de meros bumps de versão SemVer (version / versionCode).
 *
 * Uso:
 *   npx tsx scripts/check_frontend_changes.ts [baseRef] [headRef]
 *
 * Ambiente CI (GitHub Actions):
 *   Exporta `frontend_changed=true|false` para $GITHUB_OUTPUT quando disponível.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

export interface FrontendChangeResult {
  hasChanges: boolean;
  reasons: string[];
  baseRef: string;
  headRef: string;
}

export function isValidCommit(ref: string): boolean {
  if (!ref || ref.trim() === "" || /^0+$/.test(ref.trim())) {
    return false;
  }
  try {
    execSync(`git rev-parse --verify ${ref}^{commit}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function resolveBaseRef(candidateBase?: string): string {
  if (candidateBase && isValidCommit(candidateBase)) {
    return candidateBase.trim();
  }
  if (process.env.EVENT_BEFORE && isValidCommit(process.env.EVENT_BEFORE)) {
    return process.env.EVENT_BEFORE.trim();
  }
  if (process.env.GITHUB_BASE_REF && isValidCommit(`origin/${process.env.GITHUB_BASE_REF}`)) {
    return `origin/${process.env.GITHUB_BASE_REF.trim()}`;
  }
  if (isValidCommit("HEAD~1")) {
    return "HEAD~1";
  }
  return "HEAD";
}

export function checkFrontendChanges(
  rawBaseRef?: string,
  rawHeadRef: string = "HEAD"
): FrontendChangeResult {
  const baseRef = resolveBaseRef(rawBaseRef);
  const headRef = rawHeadRef && isValidCommit(rawHeadRef) ? rawHeadRef : "HEAD";

  const reasons: string[] = [];

  if (baseRef === headRef) {
    return { hasChanges: false, reasons: ["baseRef e headRef são idênticos"], baseRef, headRef };
  }

  let stdout = "";
  try {
    stdout = execSync(`git diff --name-only ${baseRef} ${headRef}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch (e: any) {
    return {
      hasChanges: true,
      reasons: [`Falha ao executar git diff (${e?.message || e}). Por segurança, assumindo alterações.`],
      baseRef,
      headRef,
    };
  }

  const changedFiles = stdout
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  // 1. Arquivos em src/frontend/ que não sejam manifestos de versão
  const codeFiles = changedFiles.filter(
    (f) =>
      f.startsWith("src/frontend/") &&
      f !== "src/frontend/package.json" &&
      f !== "src/frontend/app.json"
  );

  if (codeFiles.length > 0) {
    const preview = codeFiles.slice(0, 3).join(", ");
    const more = codeFiles.length > 3 ? ` e mais ${codeFiles.length - 3}` : "";
    reasons.push(`Arquivos de código ou assets modificados (${codeFiles.length}): ${preview}${more}`);
  }

  // 2. Modificações em src/frontend/package.json além do campo "version"
  if (changedFiles.includes("src/frontend/package.json")) {
    try {
      const oldRaw = execSync(`git show ${baseRef}:src/frontend/package.json`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const newRaw = execSync(`git show ${headRef}:src/frontend/package.json`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });

      const oldJson = JSON.parse(oldRaw);
      const newJson = JSON.parse(newRaw);
      delete oldJson.version;
      delete newJson.version;

      if (JSON.stringify(oldJson) !== JSON.stringify(newJson)) {
        reasons.push("src/frontend/package.json possui alterações estruturais (dependências/scripts além de 'version')");
      }
    } catch {
      reasons.push("src/frontend/package.json foi modificado ou adicionado");
    }
  }

  // 3. Modificações em src/frontend/app.json além de "version" e "versionCode"
  if (changedFiles.includes("src/frontend/app.json")) {
    try {
      const oldRaw = execSync(`git show ${baseRef}:src/frontend/app.json`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const newRaw = execSync(`git show ${headRef}:src/frontend/app.json`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });

      const oldJson = JSON.parse(oldRaw);
      const newJson = JSON.parse(newRaw);

      if (oldJson.expo) {
        delete oldJson.expo.version;
        if (oldJson.expo.android) delete oldJson.expo.android.versionCode;
      }
      if (newJson.expo) {
        delete newJson.expo.version;
        if (newJson.expo.android) delete newJson.expo.android.versionCode;
      }

      if (JSON.stringify(oldJson) !== JSON.stringify(newJson)) {
        reasons.push("src/frontend/app.json possui alterações estruturais além de version/versionCode");
      }
    } catch {
      reasons.push("src/frontend/app.json foi modificado ou adicionado");
    }
  }

  return {
    hasChanges: reasons.length > 0,
    reasons,
    baseRef,
    headRef,
  };
}

// Execução direta CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseArg = process.argv[2];
  const headArg = process.argv[3];

  const result = checkFrontendChanges(baseArg, headArg);

  console.log(`🔍 Análise de Alterações no Front-end:`);
  console.log(`   Base: ${result.baseRef}`);
  console.log(`   Head: ${result.headRef}`);
  console.log(`   Houve alterações no frontend: ${result.hasChanges ? "SIM" : "NÃO"}`);

  if (result.hasChanges) {
    console.log(`   Motivos detectados:`);
    for (const r of result.reasons) {
      console.log(`     • ${r}`);
    }
  } else {
    console.log(`   Nenhum arquivo de código, asset ou dependência de frontend foi alterado.`);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `frontend_changed=${result.hasChanges}\n`,
      "utf8"
    );
    console.log(`📤 GITHUB_OUTPUT atualizado: frontend_changed=${result.hasChanges}`);
  }
}
