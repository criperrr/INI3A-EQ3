/**
 * scripts/android.ts
 * Build e instalação do app Android de forma autônoma, em qualquer máquina.
 *
 * Corrige, sem intervenção manual, os problemas encontrados em 2026-09-09:
 *  1. JRE sem `javac` / JDK novo demais → resolve ou baixa um JDK 17–21.
 *  2. Android SDK fora da PATH → localiza e exporta ANDROID_HOME.
 *  3. Build de 4 ABIs quando o aparelho usa uma → detecta a ABI e compila só ela.
 *  4. Gradle com heap de 2 GB e sem cache → dimensiona pela RAM da máquina.
 *  5. `.env` do frontend sem EXPO_PUBLIC_HERE_API_KEY → semeia a partir do backend.
 *
 * Os ajustes do Gradle vão por variável de ambiente (ORG_GRADLE_PROJECT_* e
 * GRADLE_OPTS), de propósito: `expo prebuild` regenera `android/` e apagaria
 * qualquer edição feita em `gradle.properties`.
 *
 * Uso: npm run android [-- --debug] [--device <serial>] [--no-install]
 */
import { spawn } from "node:child_process";
import readline from "node:readline";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectOS, run, runLive, which, info, ok, warn, err, dim, bold, step, colors,
} from "./lib/system.ts";
import { ensureJdk, jdkEnv } from "./lib/jdk.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = path.join(ROOT, "src", "frontend");
const HOME = os.homedir();

// ── Android SDK ──────────────────────────────────────────────────────────────

function findAndroidSdk(): string | null {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(HOME, "Android", "Sdk"),
    path.join(HOME, "Android", "sdk"),
    "/opt/android-sdk",
    "/usr/lib/android-sdk",
    path.join(HOME, "Library", "Android", "sdk"),
    path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
  ].filter(Boolean) as string[];

  return candidates.find((c) => fs.existsSync(path.join(c, "platform-tools"))) ?? null;
}

function resolveAdb(sdk: string | null): string | null {
  const exe = detectOS() === "windows" ? "adb.exe" : "adb";
  if (sdk) {
    const p = path.join(sdk, "platform-tools", exe);
    if (fs.existsSync(p)) return p;
  }
  return which("adb");
}

// ── Aparelho e ABI ───────────────────────────────────────────────────────────

interface Device { serial: string; abi: string }

function listDevices(adb: string): string[] {
  const res = run(adb, ["devices"]);
  return res.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && /\bdevice$/.test(l))
    .map((l) => l.split(/\s+/)[0]!);
}

function deviceAbi(adb: string, serial: string): string {
  const res = run(adb, ["-s", serial, "shell", "getprop", "ro.product.cpu.abi"]);
  return res.stdout.trim() || "arm64-v8a";
}

function pickDevice(adb: string, wanted?: string): Device | null {
  const serials = listDevices(adb);
  if (!serials.length) return null;
  const serial = wanted && serials.includes(wanted) ? wanted : serials[0]!;
  if (wanted && serial !== wanted) warn(`Aparelho '${wanted}' não encontrado; usando ${serial}.`);
  return { serial, abi: deviceAbi(adb, serial) };
}

// ── .env do frontend ─────────────────────────────────────────────────────────

function readEnvFile(file: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    map.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim().replace(/^["']|["']$/g, ""));
  }
  return map;
}

/**
 * Garante que o `.env` do frontend tem tudo que é inlinado no bundle.
 * EXPO_PUBLIC_* é embutido em build time: faltando aqui, o APK sai quebrado
 * em silêncio (foi o que aconteceu com a chave da HERE).
 */
function ensureFrontendEnv(): boolean {
  const file = path.join(FRONTEND, ".env");
  const env = readEnvFile(file);
  const backend = readEnvFile(path.join(ROOT, "src", "backend", ".env"));
  const lines: string[] = [];
  let changed = false;

  if (!env.get("EXPO_PUBLIC_API_URL")) {
    warn("EXPO_PUBLIC_API_URL ausente — rode 'npm run env' para escolher o backend.");
    return false;
  }

  if (!env.get("EXPO_PUBLIC_HERE_API_KEY")) {
    const fromBackend = backend.get("HERE_API_KEY");
    if (fromBackend) {
      env.set("EXPO_PUBLIC_HERE_API_KEY", fromBackend);
      changed = true;
      ok("EXPO_PUBLIC_HERE_API_KEY semeada a partir de src/backend/.env");
    } else {
      warn("EXPO_PUBLIC_HERE_API_KEY ausente e não encontrada no backend — o mapa não vai descobrir mercados.");
    }
  }

  if (changed) {
    lines.push("# Configuração do Ambiente do Frontend Presco (INI3A-EQ3)");
    for (const [k, v] of env) lines.push(`${k}=${v}`);
    fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  }

  if (!env.get("GOOGLE_MAPS_API_KEY")) {
    warn("GOOGLE_MAPS_API_KEY ausente — sem ela o app CRASHA ao abrir o mapa");
    warn("  (IllegalStateException em MapView.onCreate). Crie a chave no Google Cloud Console,");
    warn("  restrinja por pacote (com.presco.app) + SHA-1, e coloque em src/frontend/.env.");
  }

  const url = env.get("EXPO_PUBLIC_API_URL")!;
  info(`Backend embutido no APK: ${bold(url)}`);
  if (url.startsWith("http://") && !url.includes("localhost")) {
    warn("URL em HTTP puro: o Android bloqueia cleartext em release. Prefira HTTPS.");
  }
  return true;
}

// ── Gradle ───────────────────────────────────────────────────────────────────

/**
 * Ajustes de performance passados por ambiente para sobreviverem ao prebuild.
 * O ganho dominante é `reactNativeArchitectures`: compilar as 4 ABIs padrão
 * multiplica por ~4 o trabalho nativo, e o aparelho usa exatamente uma.
 */
function gradleEnv(abi: string): NodeJS.ProcessEnv {
  const totalGb = Math.round(os.totalmem() / 1024 ** 3);
  const heapMb = Math.min(6144, Math.max(2048, Math.floor(totalGb / 4) * 1024));
  const workers = Math.max(2, os.cpus().length);

  const opts = [
    `-Dorg.gradle.jvmargs=-Xmx${heapMb}m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC`,
    "-Dorg.gradle.caching=true",
    "-Dorg.gradle.parallel=true",
    `-Dorg.gradle.workers.max=${workers}`,
  ].join(" ");

  info(`Gradle: ABI ${bold(abi)} · heap ${heapMb} MB · ${workers} workers · build cache ligado`);

  return {
    ORG_GRADLE_PROJECT_reactNativeArchitectures: abi,
    GRADLE_OPTS: `${process.env.GRADLE_OPTS ?? ""} ${opts}`.trim(),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const variant = argv.includes("--debug") ? "debug" : "release";
  const wantedDevice = argv[argv.indexOf("--device") + 1];
  const noInstall = argv.includes("--no-install");

  console.log(`\n${bold("📱 Presco — build Android")} ${dim(`(${variant})`)}\n`);

  step("Ambiente do frontend");
  if (!ensureFrontendEnv()) process.exit(1);

  step("Java");
  const javaHome = await ensureJdk();
  if (!javaHome) {
    err("Nenhum JDK utilizável e a instalação automática falhou.");
    info("Instale um JDK 17 manualmente e reexecute, ou defina JAVA_HOME apontando para ele.");
    process.exit(1);
  }

  step("Android SDK");
  const sdk = findAndroidSdk();
  if (!sdk) {
    err("Android SDK não encontrado.");
    info("Instale o Android Studio (ou o commandline-tools) e defina ANDROID_HOME.");
    process.exit(1);
  }
  ok(`SDK · ${dim(sdk)}`);

  const adb = resolveAdb(sdk);
  if (!adb) {
    err("adb não encontrado — instale o pacote 'platform-tools' do SDK.");
    process.exit(1);
  }

  step("Aparelho");
  const device = pickDevice(adb, wantedDevice);
  let abi = "arm64-v8a";
  if (device) {
    abi = device.abi;
    ok(`${device.serial} · ABI ${device.abi}`);
  } else {
    warn(`Nenhum aparelho conectado; compilando para ${abi} sem instalar.`);
    info("Conecte por USB com a depuração USB ativa, ou inicie um emulador.");
  }

  step("Compilando");
  const sep = detectOS() === "windows" ? ";" : ":";
  const env: NodeJS.ProcessEnv = {
    ...jdkEnv(javaHome),
    ...gradleEnv(abi),
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    PATH: `${path.join(sdk, "platform-tools")}${sep}${jdkEnv(javaHome).PATH}`,
  };

  // `android/` é gitignored: em máquina nova ele não existe ainda.
  if (!fs.existsSync(path.join(FRONTEND, "android"))) {
    info("Pasta android/ ausente — gerando com 'expo prebuild'…");
    const pre = await runLive("npx", ["expo", "prebuild", "--platform", "android"], { cwd: FRONTEND, env });
    if (pre !== 0) {
      err("Falha no prebuild.");
      process.exit(pre);
    }
  }

  const buildOnly = !device || noInstall;
  const started = Date.now();

  let status = 0;
  if (buildOnly) {
    status = await new Promise<number>((resolve) => {
      const gradlewBin = detectOS() === "windows" ? "gradlew.bat" : "./gradlew";
      const gradleArgs = [
        `app:assemble${variant[0]!.toUpperCase()}${variant.slice(1)}`,
        "-x", "lint",
        "-x", "test",
        "--console=plain",
      ];

      const child = spawn(gradlewBin, gradleArgs, {
        cwd: path.join(FRONTEND, "android"),
        env,
        stdio: ["inherit", "pipe", "pipe"],
      });

      const totalTasks = variant === "release" ? 1021 : 980;
      let completedTasks = 0;
      let lastPrintedPct = -1;
      const isTTY = Boolean(process.stdout.isTTY);

      const updateProgress = (taskName: string) => {
        completedTasks++;
        const pct = Math.min(99, Math.round((completedTasks / totalTasks) * 100));
        const elapsedSec = Math.max(1, (Date.now() - started) / 1000);
        const tasksPerSec = completedTasks / elapsedSec;
        const remainingTasks = Math.max(0, totalTasks - completedTasks);
        const remainingSec = tasksPerSec > 0 ? Math.round(remainingTasks / tasksPerSec) : 0;
        const remFmt = remainingSec >= 60
          ? `${Math.floor(remainingSec / 60)}m${(remainingSec % 60).toString().padStart(2, "0")}s`
          : `${remainingSec}s`;

        const barWidth = 20;
        const filled = Math.min(barWidth, Math.round((pct / 100) * barWidth));
        const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

        const shortTask = taskName.length > 38 ? `…${taskName.slice(-37)}` : taskName;

        if (isTTY) {
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(
            `${colors.cyan}[${pct.toString().padStart(2, " ")}%]${colors.reset} ` +
            `${colors.bold}[${completedTasks}/${totalTasks}]${colors.reset} ` +
            `${colors.yellow}[ETA ${remFmt}]${colors.reset} ` +
            `${colors.green}[${bar}]${colors.reset} ` +
            `${dim(shortTask)}`
          );
          readline.clearLine(process.stdout, 1);
        } else {
          // Em ambientes sem TTY / logs lineares, atualiza a cada 5% para não poluir
          if (pct >= lastPrintedPct + 5 || completedTasks === totalTasks) {
            lastPrintedPct = pct;
            console.log(
              `[${pct.toString().padStart(2, " ")}%] [${completedTasks}/${totalTasks}] [ETA ${remFmt}] [${bar}] ${shortTask}`
            );
          }
        }
      };

      const handleChunk = (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Detecta tarefas do Gradle executadas (ex: > Task :app:compileReleaseJavaWithJavac)
          const taskMatch = trimmed.match(/> Task (:[a-zA-Z0-9_:-]+)/);
          if (taskMatch && taskMatch[1]) {
            updateProgress(taskMatch[1]);
          } else if (
            trimmed.includes("FAILED") ||
            trimmed.includes("Error:") ||
            trimmed.includes("Exception:")
          ) {
            if (isTTY) process.stdout.write("\n");
            console.log(trimmed);
          }
        }
      };

      child.stdout.on("data", handleChunk);
      child.stderr.on("data", handleChunk);

      child.on("close", (code) => {
        if (isTTY) {
          readline.cursorTo(process.stdout, 0);
          readline.clearLine(process.stdout, 0);
        }
        resolve(code ?? 0);
      });

      child.on("error", (e) => {
        err(`Falha ao iniciar Gradle: ${e.message}`);
        resolve(1);
      });
    });
  } else {
    status = await runLive("npx", ["expo", "run:android", "--variant", variant], { cwd: FRONTEND, env });
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);

  if (status !== 0) {
    err(`Build falhou após ${mins} min.`);
    info("Se o erro citar 'jlink', 'JdkImageTransform' ou 'restricted method', o JDK está incompatível:");
    info(dim(`  JAVA_HOME usado: ${javaHome}`));
    process.exit(status);
  }

  ok(`Build concluído em ${mins} min.`);
  if (!buildOnly) {
    ok(`Instalado em ${device.serial}. O APK aponta para o backend configurado no .env.`);
  } else {
    info(`APK em ${dim("src/frontend/android/app/build/outputs/apk/" + variant)}`);
  }
}

main().catch((e) => {
  err(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
