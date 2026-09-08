/**
 * scripts/bootstrap.ts
 * One-shot environment bootstrap: verifies/installs required tooling, resolves
 * the backing services (native-first, Docker fallback, or install natively on
 * request), writes src/backend/.env, runs migrations + seed, and prints a
 * network diagnostic.
 *
 * Invoked by setup.sh / setup.ps1 after Node + npm + git are guaranteed.
 *
 *   npx tsx scripts/bootstrap.ts [--yes] [--force-docker|--force-native]
 *                                [--skip-services] [--skip-db-init]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  colors,
  bold,
  dim,
  info,
  ok,
  warn,
  err,
  step,
  detectOS,
  detectPkgManager,
  has,
  which,
  run,
  runLive,
  withSudo,
  promptYesNo,
  promptChoice,
  setAssumeYes,
  waitFor,
  fillTemplate,
  type PkgManager,
} from "./lib/system.ts";
import {
  TOOLS,
  SERVICES,
  ENV_DEFAULTS,
  BACKEND_ENV_PATH,
  type ServiceRequirement,
  type ToolRequirement,
} from "./requirements.ts";
import {
  getLocalLanIp,
  testTcpPort,
  runDiagnostics,
} from "./verify_connection.ts";

const ROOT = process.cwd();
const HOST = "127.0.0.1";

const ARGS = new Set(process.argv.slice(2));
const OPT = {
  yes: ARGS.has("--yes") || ARGS.has("-y"),
  forceDocker: ARGS.has("--force-docker"),
  forceNative: ARGS.has("--force-native"),
  skipServices: ARGS.has("--skip-services"),
  skipDbInit: ARGS.has("--skip-db-init"),
};
setAssumeYes(OPT.yes);

const OS = detectOS();
let PKG: PkgManager | null = null;

interface Resolved {
  id: string;
  label: string;
  envVar: string;
  mode: "native" | "docker" | "skipped";
  url: string;
  note: string;
}

async function main() {
  console.log(bold(`\n  Presco · bootstrap de ambiente  ${dim(`(${OS})`)}`));

  step("1. Sistema");
  PKG = detectPkgManager();
  ok(`SO: ${OS}${PKG ? ` · gerenciador de pacotes: ${PKG.id}` : ""}`);
  if (!PKG && OS !== "windows")
    warn("Nenhum gerenciador de pacotes conhecido — instalações automáticas ficam indisponíveis.");

  step("2. Ferramentas");
  for (const tool of TOOLS) await ensureTool(tool);
  const dockerReady = dockerAvailable();

  const resolved: Resolved[] = [];
  if (OPT.skipServices) {
    warn("--skip-services: pulando resolução de banco/cache.");
  } else {
    step("3. Serviços (banco de dados e cache)");
    for (const svc of SERVICES) resolved.push(await resolveService(svc, dockerReady));
  }

  step("4. Configuração do backend (.env)");
  writeBackendEnv(resolved);
  persistDiscovered(resolved);

  if (!OPT.skipDbInit && resolved.some((r) => r.id === "postgres" && r.mode !== "skipped")) {
    step("5. Migrations e seed");
    await runMigrationsAndSeed(resolved);
  }

  step("6. Diagnóstico de rede");
  await runDiagnostics().catch(() => {});
  networkHint();

  step("✅ Bootstrap concluído");
  summary(resolved);
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function toolVersionOk(tool: ToolRequirement): boolean {
  if (!has(tool.bin)) return false;
  if (!tool.versionArgs || tool.minMajor == null) return true;
  const out = run(tool.bin, tool.versionArgs).stdout;
  const m = out.match(/(\d+)\.\d+/);
  return m ? Number(m[1]) >= tool.minMajor : true;
}

async function ensureTool(tool: ToolRequirement) {
  if (toolVersionOk(tool)) {
    ok(`${tool.label} · ${which(tool.bin)}`);
    return;
  }
  if (tool.optional) {
    info(`${tool.label} não encontrado (opcional).`);
  } else {
    warn(`${tool.label} não encontrado.`);
  }

  const canAuto =
    (PKG && tool.packages?.[PKG.id]?.length) || tool.script?.[OS];
  if (!canAuto) {
    warn(`Instale manualmente: ${tool.docs || tool.note || tool.label}`);
    return;
  }

  const go = await promptYesNo(`Instalar ${tool.label} agora?`, !tool.optional);
  if (!go) {
    info(`Pulado. ${tool.note ? tool.note : ""}`);
    return;
  }

  const done = await installTool(tool);
  if (done && toolVersionOk(tool)) ok(`${tool.label} instalado.`);
  else warn(`Não consegui confirmar a instalação de ${tool.label}. ${tool.docs || ""}`);
}

async function installTool(tool: ToolRequirement): Promise<boolean> {
  if (PKG && tool.packages?.[PKG.id]?.length) {
    return installPackages(tool.packages[PKG.id]!);
  }
  const script = tool.script?.[OS];
  if (script) {
    info(`Executando: ${script}`);
    const [c, a] = withSudo(OS !== "windows", "sh", ["-c", script]);
    return (await runLive(c, a)) === 0;
  }
  return false;
}

async function installPackages(pkgs: string[]): Promise<boolean> {
  if (!PKG) return false;
  if (PKG.refresh) {
    const [rc, ra] = withSudo(PKG.needsSudo, PKG.refresh[0], PKG.refresh[1]);
    await runLive(rc, ra);
  }
  const [c, a] = PKG.install(pkgs);
  const [sc, sa] = withSudo(PKG.needsSudo, c, a);
  info(`Instalando: ${pkgs.join(", ")}`);
  return (await runLive(sc, sa)) === 0;
}

function dockerAvailable(): boolean {
  if (!has("docker")) return false;
  return run("docker", ["info"]).status === 0;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

async function resolveService(
  svc: ServiceRequirement,
  dockerReady: boolean,
): Promise<Resolved> {
  const base = { id: svc.id, label: svc.label, envVar: svc.envVar };

  // (1) already usable natively?
  const nat = await nativeUsable(svc);
  if (nat.usable) {
    ok(`${svc.label}: nativo pronto (${nat.reason})`);
    return { ...base, mode: "native", url: nativeUrl(svc), note: nat.reason };
  }

  // (2) choose a strategy — native-first: default to native when it's installed
  let strategy: "docker" | "native" | "skip";
  const installedNatively = has(svc.bin);
  if (OPT.forceDocker) strategy = "docker";
  else if (OPT.forceNative) strategy = "native";
  else {
    const choices: Array<{ label: string; value: "docker" | "native" | "skip" }> = [];
    if (dockerReady) choices.push({ label: "Subir via Docker", value: "docker" });
    choices.push({
      label: installedNatively
        ? `Usar o ${svc.label} nativo (configurar agora)`
        : `Instalar o ${svc.label} nativo agora`,
      value: "native",
    });
    if (!dockerReady)
      choices.push({ label: "Instalar Docker e subir por lá", value: "docker" });
    choices.push({ label: "Pular por enquanto", value: "skip" });

    const def = installedNatively
      ? choices.findIndex((c) => c.value === "native")
      : 0;

    info(
      `${svc.label}: ${
        installedNatively ? "instalado, mas não configurado para o projeto" : "não encontrado"
      } (${nat.reason}).`,
    );
    const pick = await promptChoice("Como quer prosseguir?", choices.map((c) => c.label), def);
    strategy = choices[pick].value;
  }

  // (3) execute
  if (strategy === "skip") {
    warn(`${svc.label}: pulado. Defina ${svc.envVar} manualmente ou rode o setup de novo.`);
    return { ...base, mode: "skipped", url: dockerUrl(svc), note: "pulado" };
  }

  if (strategy === "docker") {
    return startViaDocker(svc, base);
  }

  return setupNative(svc, base);
}

function nativeUrl(svc: ServiceRequirement) {
  return fillTemplate(svc.url.native, { host: HOST });
}
function dockerUrl(svc: ServiceRequirement) {
  return fillTemplate(svc.url.docker, { host: HOST });
}

async function nativeUsable(
  svc: ServiceRequirement,
): Promise<{ usable: boolean; reason: string }> {
  const up = await testTcpPort(HOST, svc.nativePort, 700);
  if (!up) return { usable: false, reason: `nada escutando em :${svc.nativePort}` };

  if (svc.kind === "redis") {
    if (!has("redis-cli"))
      return { usable: true, reason: `porta :${svc.nativePort} aberta` };
    const ping = run("redis-cli", ["-h", HOST, "-p", String(svc.nativePort), "ping"]);
    if (/PONG/i.test(ping.stdout)) return { usable: true, reason: "PING ok, sem auth" };
    return { usable: false, reason: "Redis nativo exige auth ou não respondeu" };
  }

  // postgres
  if (!has("psql"))
    return { usable: false, reason: "há Postgres na porta mas falta `psql` para validar" };
  const url = nativeUrl(svc);
  if (psql(url, "select 1").status !== 0)
    return { usable: false, reason: "sem o banco/role do projeto" };
  for (const ext of svc.extensions ?? []) {
    const q = psql(url, `select count(*) from pg_extension where extname='${ext}'`);
    if (q.stdout.trim() !== "1")
      return { usable: false, reason: `extensão "${ext}" não está ativa` };
  }
  return { usable: true, reason: "banco do projeto + extensões OK" };
}

async function startViaDocker(
  svc: ServiceRequirement,
  base: { id: string; label: string; envVar: string },
): Promise<Resolved> {
  if (!has("docker")) {
    const dockerTool = TOOLS.find((t) => t.id === "docker")!;
    await ensureTool({ ...dockerTool, optional: false });
  }
  if (!dockerAvailable()) {
    warn(`${svc.label}: Docker não está pronto. Pulado — inicie o Docker e rode 'npm run db:up'.`);
    return { ...base, mode: "skipped", url: dockerUrl(svc), note: "docker indisponível" };
  }
  info(`${svc.label}: docker compose up -d ${svc.dockerService}`);
  const code = await runLive("docker", ["compose", "up", "-d", svc.dockerService], { cwd: ROOT });
  if (code !== 0) {
    warn(`${svc.label}: 'docker compose up' falhou.`);
    return { ...base, mode: "skipped", url: dockerUrl(svc), note: "falha no compose" };
  }
  const healthy = await waitFor(() => testTcpPort(HOST, svc.dockerPort, 1000), {
    tries: 40,
    delayMs: 1000,
  });
  if (healthy) ok(`${svc.label}: container pronto em :${svc.dockerPort}`);
  else warn(`${svc.label}: container subiu mas :${svc.dockerPort} não respondeu a tempo.`);
  return { ...base, mode: "docker", url: dockerUrl(svc), note: `container :${svc.dockerPort}` };
}

async function setupNative(
  svc: ServiceRequirement,
  base: { id: string; label: string; envVar: string },
): Promise<Resolved> {
  // On any native failure, fall back to Docker when it's available.
  const fallback = async (why: string): Promise<Resolved> => {
    if (!OPT.forceNative && dockerAvailable()) {
      warn(`${svc.label}: nativo não deu (${why}) — usando Docker.`);
      return startViaDocker(svc, base);
    }
    warn(
      `${svc.label}: nativo não deu (${why})${OPT.forceNative ? "" : " e Docker indisponível"} — pulado.`,
    );
    return { ...base, mode: "skipped", url: dockerUrl(svc), note: why };
  };

  // install if the binary is missing
  if (!has(svc.bin)) {
    if (OS === "windows")
      return fallback(`nativo não suportado no Windows. ${svc.note ?? ""}`);
    const pkgs = PKG && svc.packages?.[PKG.id];
    if (!pkgs?.length) return fallback(`sem receita de instalação para ${PKG?.id ?? "este SO"}`);
    if (!(await installPackages(pkgs))) return fallback("instalação nativa falhou");
  }

  // start the service
  await startNativeService(svc);
  if (!(await waitFor(() => testTcpPort(HOST, svc.nativePort, 800), { tries: 15 })))
    return fallback(`serviço não subiu em :${svc.nativePort}`);

  if (svc.kind === "postgres") {
    const p = await provisionPostgres(svc);
    if (!p.ok) return fallback(p.note);
    ok(`${svc.label}: nativo provisionado (${p.note})`);
  } else {
    const again = await nativeUsable(svc);
    if (!again.usable) return fallback(again.reason);
    ok(`${svc.label}: nativo pronto`);
  }
  return { ...base, mode: "native", url: nativeUrl(svc), note: "nativo" };
}

function canSudoNonInteractive(): boolean {
  return has("sudo") && run("sudo", ["-n", "true"]).status === 0;
}

async function startNativeService(svc: ServiceRequirement) {
  // Already listening? nothing to do.
  if (await testTcpPort(HOST, svc.nativePort, 600)) return;

  if (OS === "macos" && PKG?.id === "brew") {
    const formula = svc.packages?.brew?.[0] ?? svc.bin;
    await runLive("brew", ["services", "start", formula]);
    return;
  }

  if (OS === "linux" && has("systemctl")) {
    const canSudo = canSudoNonInteractive() || process.stdin.isTTY;
    if (!canSudo) {
      warn(`${svc.label}: preciso de sudo para iniciar o serviço do SO. Inicie manualmente e rode o setup de novo.`);
      return;
    }
    const units =
      svc.kind === "postgres"
        ? ["postgresql", "postgresql.service"]
        : ["redis-server", "redis"];
    for (const u of units) {
      const active = run("systemctl", ["is-enabled", u]).status === 0;
      const [c, a] = withSudo(true, "systemctl", ["enable", "--now", u]);
      if ((await runLive(c, a)) === 0) {
        if (!active) ok(`serviço ${u} habilitado`);
        return;
      }
    }
    if (svc.kind === "postgres")
      warn("Postgres pode precisar de `initdb` manual (Arch/Fedora) — veja a doc da distro.");
  }
}

// ── Postgres provisioning ───────────────────────────────────────────────────

function psql(url: string, sql: string, db?: string) {
  return run(
    "psql",
    [url, "-v", "ON_ERROR_STOP=1", "-tAc", sql, ...(db ? ["-d", db] : [])],
    { env: { ...process.env, PGCONNECT_TIMEOUT: "5" } },
  );
}

/** `sudo -u postgres psql` capturing stdout while letting the password prompt through. */
function sudoPsql(sql: string, db?: string, noPrompt = false) {
  const args = [
    ...(noPrompt ? ["-n"] : []),
    "-u",
    "postgres",
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-tAc",
    sql,
    ...(db ? ["-d", db] : []),
  ];
  const r = spawnSync("sudo", args, {
    stdio: noPrompt ? ["ignore", "pipe", "pipe"] : ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });
  return { status: r.status ?? 1, stdout: (r.stdout || "").trim() };
}

async function provisionPostgres(
  svc: ServiceRequirement,
): Promise<{ ok: boolean; note: string }> {
  const c = svc.credentials!;
  const exts = [...(svc.extensions ?? [])];

  // admin runner
  let admin: ((sql: string, db?: string) => { status: number; stdout: string }) | null =
    null;
  if (has("sudo")) {
    if (sudoPsql("select 1", undefined, true).status === 0)
      admin = (sql, db) => sudoPsql(sql, db, true);
    else if (process.stdin.isTTY && sudoPsql("select 1").status === 0)
      admin = (sql, db) => sudoPsql(sql, db, true);
  }
  if (!admin) {
    const adminUrl = `postgres://postgres:postgres@${HOST}:${svc.nativePort}/postgres`;
    if (psql(adminUrl, "select 1").status === 0)
      admin = (sql, db) =>
        psql(db ? adminUrl.replace(/\/postgres$/, `/${db}`) : adminUrl, sql);
  }
  if (!admin) return { ok: false, note: "sem acesso admin ao Postgres" };

  // ensure required extensions are installable
  for (const ext of exts) {
    const avail = () =>
      admin!(`select 1 from pg_available_extensions where name='${ext}'`).stdout.trim() ===
      "1";
    if (avail()) continue;
    if (ext !== "postgis") continue; // pg_trgm/unaccent ship with contrib
    warn(`PostGIS não disponível no Postgres nativo — instalando pacote…`);
    const pgMajor =
      admin("show server_version_num").stdout.match(/^(\d\d)/)?.[1] ?? "";
    const pkgs =
      PKG?.id === "apt" && pgMajor
        ? [`postgresql-${pgMajor}-postgis-3`]
        : (PKG && svc.packages?.[PKG.id]) || [];
    if (!pkgs.length || !(await installPackages(pkgs)) || !avail())
      return { ok: false, note: "PostGIS indisponível" };
  }

  // role + database
  admin(
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${c.user}') THEN CREATE ROLE ${c.user} LOGIN PASSWORD '${c.password}'; END IF; END $$;`,
  );
  if (admin(`select 1 from pg_database where datname='${c.database}'`).stdout.trim() !== "1")
    admin(`CREATE DATABASE ${c.database} OWNER ${c.user}`);
  for (const ext of exts) admin(`CREATE EXTENSION IF NOT EXISTS ${ext}`, c.database);

  const okApp = psql(nativeUrl(svc), "select 1").status === 0;
  return okApp
    ? { ok: true, note: "role + db + extensões" }
    : { ok: false, note: "conexão da aplicação falhou após provisionar" };
}

// ---------------------------------------------------------------------------
// .env + persistence
// ---------------------------------------------------------------------------

function parseEnv(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    m.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  return m;
}

function writeBackendEnv(resolved: Resolved[]) {
  const file = path.join(ROOT, BACKEND_ENV_PATH);
  const existing = fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : new Map();

  for (const r of resolved) if (r.mode !== "skipped") existing.set(r.envVar, r.url);
  for (const [k, v] of Object.entries(ENV_DEFAULTS)) if (!existing.has(k)) existing.set(k, v);
  if (!existing.get("JWT_SECRET"))
    existing.set("JWT_SECRET", crypto.randomBytes(32).toString("hex"));
  // sensible fallbacks if a service was skipped and nothing was set before
  for (const svc of SERVICES) {
    if (!existing.get(svc.envVar)) existing.set(svc.envVar, dockerUrl(svc));
  }

  const order = [
    "DATABASE_URL",
    "REDIS_URL",
    "SERVER_PORT",
    "SERVER_HOST",
    "JWT_SECRET",
    "NODE_ENV",
  ];
  const keys = [...order.filter((k) => existing.has(k)), ...[...existing.keys()].filter((k) => !order.includes(k))];
  const body =
    "# Gerado por scripts/bootstrap.ts — ajuste à vontade.\n" +
    keys.map((k) => `${k}=${existing.get(k)}`).join("\n") +
    "\n";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  ok(`${BACKEND_ENV_PATH} escrito`);
  for (const r of resolved)
    info(`  ${r.envVar} → ${dim(r.url)} ${dim(`(${r.mode})`)}`);
}

/** Save what the host has so future runs / tooling can skip re-detection. */
function persistDiscovered(resolved: Resolved[]) {
  const file = path.join(ROOT, ".dev", "services.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        discoveredAt: new Date().toISOString(),
        os: OS,
        packageManager: PKG?.id ?? null,
        docker: dockerAvailable(),
        services: resolved,
      },
      null,
      2,
    ) + "\n",
  );
  info(`.dev/services.json atualizado`);
}

// ---------------------------------------------------------------------------
// Migrations + seed
// ---------------------------------------------------------------------------

async function runMigrationsAndSeed(_resolved: Resolved[]) {
  // O .env já foi escrito acima — migrate/seed leem dele. Não injetamos env
  // para evitar conflito de precedência com o dotenv do turbo.
  const npm = OS === "windows" ? "npm.cmd" : "npm";

  info("npm run db:migrate");
  if ((await runLive(npm, ["run", "db:migrate"], { cwd: ROOT })) !== 0)
    warn("Migrations falharam — rode `npm run db:migrate` manualmente.");
  else ok("Migrations aplicadas");

  info("npm run db:seed");
  const seed = run(npm, ["run", "db:seed"], { cwd: ROOT });
  if (seed.status !== 0) {
    warn("Seed não concluiu. Últimas linhas:");
    console.log(dim((seed.stdout + "\n" + seed.stderr).trim().split("\n").slice(-8).join("\n")));
    warn("O app sobe mesmo assim. Rode `npm run db:seed` para o erro completo.");
  } else ok("Seed aplicado");
}

// ---------------------------------------------------------------------------
// Diagnostics + summary
// ---------------------------------------------------------------------------

function networkHint() {
  const ip = getLocalLanIp();
  if (/^10\./.test(ip)) {
    warn(
      `Rede corporativa/campus (${ip}). Roteadores costumam bloquear celular↔PC (AP isolation).`,
    );
    info("Para device físico: `npm run dev:corp` (túnel) ou hotspot do celular.");
  } else if (/^(172\.20\.10\.|192\.168\.43\.)/.test(ip)) {
    ok(`Hotspot móvel detectado (${ip}) — latência mínima.`);
  } else {
    ok(`Rede local (${ip}) — `.concat("`npm run dev:lan` recomendado."));
  }
}

function summary(resolved: Resolved[]) {
  console.log("");
  for (const r of resolved) {
    const tag =
      r.mode === "native"
        ? colors.green + "nativo" + colors.reset
        : r.mode === "docker"
          ? colors.cyan + "docker" + colors.reset
          : colors.yellow + "pulado" + colors.reset;
    console.log(`  ${r.label.padEnd(22)} ${tag}  ${dim(r.url)}`);
  }
  console.log("");
  console.log(`  ${bold("Iniciar:")}  ${colors.cyan}npm run dev${colors.reset}   ${dim("(ou dev:lan / dev:corp)")}`);
  console.log(`  ${bold("Checar:")}   ${colors.cyan}npm run dev:check${colors.reset}`);
  console.log("");
}

const invokedDirectly =
  !!process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((e) => {
    err(String(e?.stack || e));
    process.exit(1);
  });
}

export { main as runBootstrap };
