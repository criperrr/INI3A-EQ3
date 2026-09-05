import { spawn, execSync, ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import readline from "node:readline";
import { getLocalLanIp, testTcpPort, testHttpHealth } from "./verify_connection.ts";
import { startApiTunnel } from "./start_api_tunnel.ts";

// ANSI Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};

const ROOT_DIR = process.cwd();
const BACKEND_DIR = path.resolve(ROOT_DIR, "src/backend");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "src/frontend");
const IS_WINDOWS = process.platform === "win32";

let backendProcess: ChildProcess | null = null;
let expoProcess: ChildProcess | null = null;
let activeTunnelClose: (() => void) | null = null;

// Clean exit on Ctrl+C / SIGINT
function killProcessTree(proc: ChildProcess | null) {
  if (!proc || !proc.pid) return;
  try {
    if (IS_WINDOWS) {
      execSync(`taskkill /pid ${proc.pid} /T /F 2>nul`, { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGTERM");
    }
  } catch {
    try {
      proc.kill("SIGTERM");
    } catch {}
  }
}

function cleanupAndExit(code = 0) {
  console.log(`\n${colors.cyan}Encerrando servidores do Presco...${colors.reset}`);
  if (activeTunnelClose) {
    try { activeTunnelClose(); } catch {}
  }
  killProcessTree(backendProcess);
  killProcessTree(expoProcess);

  const tunnelFile = path.resolve(ROOT_DIR, ".tunnel_url");
  try { fs.unlinkSync(tunnelFile); } catch {}

  process.exit(code);
}

process.on("SIGINT", () => cleanupAndExit(0));
process.on("SIGTERM", () => cleanupAndExit(0));
process.on("exit", () => {
  if (activeTunnelClose) {
    try { activeTunnelClose(); } catch {}
  }
});

// Helper to ask question in terminal
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

// Kill lingering process on port 3333 if any
async function ensurePortFree(port: number) {
  const inUse = await testTcpPort("127.0.0.1", port, 500);
  if (!inUse) return;

  try {
    if (IS_WINDOWS) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const lines = out.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && Number(pid) > 0) {
          execSync(`taskkill /pid ${pid} /F 2>nul`, { stdio: "ignore" });
        }
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
    }
  } catch {}
}

// Check and start Docker containers if needed
async function checkDatabaseInfrastructure() {
  const pgDocker = await testTcpPort("127.0.0.1", 5433, 800);
  const pgNative = await testTcpPort("127.0.0.1", 5432, 800);

  if (pgDocker || pgNative) {
    return; // DB is up
  }

  // Check if docker is available
  try {
    execSync("docker info", { stdio: "ignore" });
    console.log(`${colors.cyan}[Docker] Iniciando containers do PostgreSQL e Redis (docker compose up -d)...${colors.reset}`);
    execSync("docker compose up -d", { cwd: ROOT_DIR, stdio: "inherit" });
  } catch {
    console.log(`${colors.yellow}⚠️  Aviso: Docker ou PostgreSQL não estão ativos no momento.${colors.reset}`);
    console.log(`${colors.gray}   O backend subirá em modo resiliente (sessões em cache de memória).${colors.reset}`);
    console.log(`${colors.gray}   Para subir o banco: 'npm run db:up'${colors.reset}\n`);
  }
}

async function main() {
  const tunnelFile = path.resolve(ROOT_DIR, ".tunnel_url");
  try { fs.unlinkSync(tunnelFile); } catch {}

  const args = process.argv.slice(2);

  let mode: "lan" | "corp" | "localhost" | null = null;
  let customUrl: string | undefined;
  let customIp: string | undefined;

  // Parse CLI flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--lan" || arg === "--local" || arg === "--local-nat") {
      mode = "lan";
    } else if (arg === "--corp" || arg === "--tunnel" || arg === "--fechada") {
      mode = "corp";
    } else if (arg === "--localhost" || arg === "--web") {
      mode = "localhost";
    } else if (arg === "--url" && args[i + 1]) {
      customUrl = args[++i];
      mode = "corp";
    } else if (arg === "--ip" && args[i + 1]) {
      customIp = args[++i];
    }
  }

  const detectedLanIp = customIp || getLocalLanIp();
  const isClassA = detectedLanIp.startsWith("10.");
  const isTailscale = detectedLanIp.startsWith("100.");
  const isHotspot = detectedLanIp.startsWith("172.20.10.") || detectedLanIp.startsWith("192.168.43.");

  // Interactive Menu if mode not chosen by CLI flag
  if (!mode) {
    console.log(`\n${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
    console.log(`${colors.bold}                🚀 PRESCO (INI3A-EQ3) — DEV LAUNCHER${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
    console.log(`💻 Sistema: ${colors.bold}${IS_WINDOWS ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux"}${colors.reset} | 📍 IP Detectado: ${colors.bold}${colors.cyan}${detectedLanIp}${colors.reset}`);

    if (isClassA) {
      console.log(`${colors.yellow}ℹ️  Rede corporativa/acadêmica detectada (10.x.x.x - ex: UNESP/eduroam).${colors.reset}`);
      console.log(`${colors.yellow}   Roteadores corporativos costumam bloquear conexão direta entre dispositivos (AP Isolation).${colors.reset}`);
    } else if (isHotspot) {
      console.log(`${colors.green}✓ Hotspot móvel detectado! Conexão direta com menor latência recomendada.${colors.reset}`);
    }

    console.log(`\n${colors.bold}Escolha o modo de rede para iniciar:${colors.reset}\n`);

    console.log(`  ${colors.bold}${colors.green}[1] ⚡ REDE LOCAL (LAN / Wi-Fi / Hotspot)${colors.reset}`);
    console.log(`      • ${colors.bold}Tempo de Resposta:${colors.reset} ${colors.green}MÍNIMO (0 a 5ms — Resposta Instantânea)${colors.reset}`);
    console.log(`      • ${colors.bold}Como funciona:${colors.reset} Celular conecta direto no IP local: ${colors.cyan}http://${detectedLanIp}:3333${colors.reset}`);
    console.log(`      • ${colors.bold}Indicado para:${colors.reset} Wi-Fi residencial, Hotspot 4G/5G do celular ou redes sem bloqueio de AP.\n`);

    console.log(`  ${colors.bold}${colors.magenta}[2] 🏢 REDE CORPORATIVA / FECHADA (Túnel Cloud)${colors.reset}`);
    console.log(`      • ${colors.bold}Tempo de Resposta:${colors.reset} ${colors.magenta}Rápido (<50ms dentro dos limites de túnel seguro)${colors.reset}`);
    console.log(`      • ${colors.bold}Como funciona:${colors.reset} Túnel HTTPS automático que contorna firewalls e isolamento de AP.`);
    console.log(`      • ${colors.bold}Indicado para:${colors.reset} Redes corporativas/universitárias (UNESP, empresas) e clientes 4G remotos.\n`);

    console.log(`  ${colors.bold}${colors.cyan}[3] 💻 LOCALHOST (Simulador iOS / Emulador Android / Web)${colors.reset}`);
    console.log(`      • ${colors.bold}Tempo de Resposta:${colors.reset} ${colors.cyan}0ms (Local)${colors.reset}`);
    console.log(`      • ${colors.bold}Indicado para:${colors.reset} Desenvolvimento no mesmo computador (sem celular físico).\n`);

    const defaultChoice = isClassA ? "2" : "1";
    const answer = await askQuestion(`${colors.bold}Opção desejada [1, 2 ou 3] (Padrão: ${defaultChoice}): ${colors.reset}`);
    const choice = answer.trim() || defaultChoice;

    if (choice === "2") {
      mode = "corp";
    } else if (choice === "3") {
      mode = "localhost";
    } else {
      mode = "lan";
    }
  }

  // Pre-flight port & db checks
  await ensurePortFree(3333);
  await ensurePortFree(4040);
  await checkDatabaseInfrastructure();

  // Determine URLs & flags
  let backendApiUrl = `http://${detectedLanIp}:3333`;
  let expoFlags: string[] = ["--lan", "--clear"];
  let packagerHostname = detectedLanIp;

  if (mode === "localhost") {
    backendApiUrl = "http://localhost:3333";
    packagerHostname = "localhost";
    expoFlags = ["--localhost", "--clear"];
    console.log(`\n🚀 ${colors.bold}Modo LOCALHOST ativado!${colors.reset} (API: ${backendApiUrl})`);
  } else if (mode === "lan") {
    backendApiUrl = `http://${detectedLanIp}:3333`;
    packagerHostname = detectedLanIp;
    expoFlags = ["--lan", "--clear"];
    console.log(`\n🚀 ${colors.bold}Modo REDE LOCAL ativado!${colors.reset}`);
    console.log(`⚡ ${colors.green}${colors.bold}Latência Mínima:${colors.reset} Conexão direta em ${colors.cyan}${backendApiUrl}${colors.reset}`);
    console.log(`📱 Expo Bundler servindo na rede: ${colors.cyan}exp://${detectedLanIp}:8081${colors.reset}`);
    if (isClassA) {
      console.log(`${colors.yellow}💡 Dica: Se o celular não carregar nesta rede corporativa (10.x.x.x), reinicie com a Opção 2 (Túnel) ou use o Hotspot do celular.${colors.reset}`);
    }
  } else {
    // Modo corporativo inicializará o túnel após o backend estar pronto
    expoFlags = ["--tunnel", "--clear"];
  }

  // 1. Launch Backend Server in background (deve subir antes do túnel para validação de saúde)
  console.log(`\n${colors.cyan}[1/2] Iniciando Backend API Presco na porta 3333...${colors.reset}`);

  backendProcess = spawn(
    IS_WINDOWS ? "npx.cmd" : "npx",
    ["tsx", "--watch", "./src/server.ts"],
    {
      cwd: BACKEND_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        SERVER_PORT: "3333",
        SERVER_HOST: "0.0.0.0",
      },
      detached: !IS_WINDOWS,
      shell: IS_WINDOWS,
    }
  );

  backendProcess.stdout?.on("data", (data) => {
    const str = data.toString();
    // Only forward essential messages or errors to keep screen clean for Expo QR
    if (str.includes("SERVER RUNNING") || str.includes("In-memory fallback") || str.includes("Database connected")) {
      process.stdout.write(`${colors.gray}[Backend] ${str.trim()}${colors.reset}\n`);
    }
  });

  backendProcess.stderr?.on("data", (data) => {
    process.stderr.write(`${colors.red}[Backend Erro] ${data.toString()}${colors.reset}`);
  });

  backendProcess.on("error", (err) => {
    console.error(`${colors.red}[Backend] Falha ao iniciar processo:${colors.reset}`, err);
  });

  // Wait for Backend to respond on /health
  console.log(`⏳ Aguardando Backend inicializar...`);
  let attempts = 0;
  let backendReady = false;
  while (attempts < 20) {
    const health = await testHttpHealth("http://127.0.0.1:3333/health", 1000);
    if (health.ok) {
      backendReady = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 600));
    attempts++;
  }

  if (backendReady) {
    console.log(`${colors.green}✓ Backend operacional na porta 3333!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Backend demorou a responder, mas continuaremos a inicialização...${colors.reset}`);
  }

  // Inicializar túnel se modo corporativo (agora que a porta 3333 está ativa e respondendo /health)
  if (mode === "corp") {
    console.log(`\n🚀 ${colors.bold}Modo REDE CORPORATIVA / FECHADA ativado!${colors.reset}`);
    console.log(`🏢 Inicializando túnel seguro para contornar isolamento de rede...`);

    try {
      const tunnel = await startApiTunnel(customUrl);
      backendApiUrl = tunnel.url;
      activeTunnelClose = tunnel.close;
      expoFlags = ["--tunnel", "--clear"];
      console.log(`✅ ${colors.green}Túnel estabelecido com sucesso:${colors.reset} ${colors.cyan}${backendApiUrl}${colors.reset}`);
    } catch (err: any) {
      console.error(`${colors.red}❌ Falha ao abrir túnel (${err.message}). Revertendo para Rede Local.${colors.reset}`);
      backendApiUrl = `http://${detectedLanIp}:3333`;
      expoFlags = ["--lan", "--clear"];
    }
  }

  // 2. Launch Expo in foreground with full interactive terminal (QR Code + key commands)
  console.log(`\n${colors.cyan}[2/2] Iniciando Frontend Expo (${expoFlags.join(" ")})...${colors.reset}`);
  console.log(`${colors.bold}🔗 API configurada no Frontend:${colors.reset} ${colors.green}${backendApiUrl}${colors.reset}\n`);

  // Sincronizar src/frontend/.env para garantir que o bundler do Metro sempre use a URL ativa
  try {
    const frontendEnvPath = path.resolve(FRONTEND_DIR, ".env");
    fs.writeFileSync(
      frontendEnvPath,
      `# Gerado automaticamente pelo Dev Launcher do Presco\nEXPO_PUBLIC_API_URL=${backendApiUrl}\n`,
      "utf8"
    );
  } catch {}

  expoProcess = spawn(
    IS_WINDOWS ? "npx.cmd" : "npx",
    ["expo", "start", ...expoFlags],
    {
      cwd: FRONTEND_DIR,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: backendApiUrl,
        REACT_NATIVE_PACKAGER_HOSTNAME: packagerHostname,
      },
      detached: !IS_WINDOWS,
      shell: IS_WINDOWS,
    }
  );

  expoProcess.on("error", (err) => {
    console.error(`${colors.red}[Frontend] Falha ao iniciar processo do Expo:${colors.reset}`, err);
  });

  expoProcess.on("exit", (code) => {
    cleanupAndExit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(`${colors.red}Erro fatal:${colors.reset}`, err);
  cleanupAndExit(1);
});
