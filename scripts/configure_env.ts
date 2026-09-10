import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { getLocalLanIp, testHttpHealth } from "./verify_connection.ts";

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
const FRONTEND_DIR = path.resolve(ROOT_DIR, "src/frontend");
const FRONTEND_ENV_PATH = path.resolve(FRONTEND_DIR, ".env");
const REMOTE_PROD_URL = "https://eq.projetoscti.com.br/26-presco";

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

function writeFrontendEnv(apiUrl: string): void {
  const cleanUrl = apiUrl.trim().replace(/\/+$/, "");
  let hereKey = "";

  // Preservar chave do HERE se já existia
  if (fs.existsSync(FRONTEND_ENV_PATH)) {
    try {
      const existing = fs.readFileSync(FRONTEND_ENV_PATH, "utf8");
      const match = existing.match(/EXPO_PUBLIC_HERE_API_KEY=["']?([^"'\r\n]*)["']?/);
      if (match && match[1]) hereKey = match[1];
    } catch {}
  }

  // Se ainda não houver chave, semear a partir do .env do backend. Sem isso o
  // APK sai com a chave vazia e o mapa falha em silêncio (EXPO_PUBLIC_* é
  // inlinado em build time, então o erro só aparece no aparelho).
  if (!hereKey) {
    const backendEnv = path.resolve(ROOT_DIR, "src/backend/.env");
    if (fs.existsSync(backendEnv)) {
      try {
        const match = fs.readFileSync(backendEnv, "utf8").match(/^HERE_API_KEY=["']?([^"'\r\n]*)["']?/m);
        if (match && match[1]) {
          hereKey = match[1];
          console.log(`${colors.green}✓ EXPO_PUBLIC_HERE_API_KEY semeada a partir de src/backend/.env${colors.reset}`);
        }
      } catch {}
    }
  }

  const lines = [
    "# Configuração do Ambiente do Frontend Presco (INI3A-EQ3)",
    `EXPO_PUBLIC_API_URL=${cleanUrl}`,
  ];
  if (hereKey) {
    lines.push(`EXPO_PUBLIC_HERE_API_KEY=${hereKey}`);
  }

  fs.writeFileSync(FRONTEND_ENV_PATH, lines.join("\n") + "\n", "utf8");
  console.log(`\n${colors.green}✓ src/frontend/.env atualizado com sucesso!${colors.reset}`);
  console.log(`🔗 ${colors.bold}EXPO_PUBLIC_API_URL:${colors.reset} ${colors.cyan}${cleanUrl}${colors.reset}\n`);
}

async function verifyAndReport(url: string) {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  const pingUrl = `${cleanUrl}/health`;
  console.log(`📡 Testando conectividade com ${colors.cyan}${pingUrl}${colors.reset}...`);
  const result = await testHttpHealth(pingUrl, 4000);
  if (result.ok) {
    console.log(`✅ ${colors.green}Servidor online e respondendo perfeitamente! (Status: ${result.status})${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Aviso: Servidor não respondeu imediatamente (${result.status || "timeout"}).${colors.reset}`);
    console.log(`${colors.gray}   (Isso é normal se o backend local não estiver em execução agora)${colors.reset}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  const detectedLanIp = getLocalLanIp();

  if (command === "remote" || command === "--remote" || command === "prod") {
    writeFrontendEnv(REMOTE_PROD_URL);
    await verifyAndReport(REMOTE_PROD_URL);
    return;
  }

  if (command === "local" || command === "--local" || command === "lan") {
    const url = `http://${detectedLanIp}:3333`;
    writeFrontendEnv(url);
    await verifyAndReport(url);
    return;
  }

  if (command === "localhost" || command === "--localhost" || command === "web") {
    const url = "http://localhost:3333";
    writeFrontendEnv(url);
    await verifyAndReport(url);
    return;
  }

  if (command === "custom" && args[1]) {
    writeFrontendEnv(args[1]);
    await verifyAndReport(args[1]);
    return;
  }

  // Interactive Menu
  console.log(`\n${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.bold}            ⚙️  PRESCO — CONFIGURADOR DE AMBIENTE DO FRONTEND${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
  console.log(`📍 IP Local Detectado: ${colors.cyan}${detectedLanIp}${colors.reset}\n`);

  let currentUrl = "(não configurado)";
  if (fs.existsSync(FRONTEND_ENV_PATH)) {
    try {
      const content = fs.readFileSync(FRONTEND_ENV_PATH, "utf8");
      const match = content.match(/EXPO_PUBLIC_API_URL=["']?([^"'\r\n]+)["']?/);
      if (match) currentUrl = match[1];
    } catch {}
  }
  console.log(`🔍 URL Atual: ${colors.bold}${currentUrl}${colors.reset}\n`);

  console.log(`${colors.bold}Selecione a URL do Backend que o Frontend deve consumir:${colors.reset}\n`);
  console.log(`  ${colors.bold}${colors.green}[1] 🌐 SERVIDOR REMOTO OFICIAL (CTI Produção)${colors.reset}`);
  console.log(`      • ${colors.cyan}${REMOTE_PROD_URL}${colors.reset}`);
  console.log(`      • Funciona de qualquer lugar (4G, Wi-Fi escolar/residencial, emulador).\n`);

  console.log(`  ${colors.bold}${colors.cyan}[2] ⚡ REDE LOCAL (LAN / Wi-Fi / Hotspot)${colors.reset}`);
  console.log(`      • ${colors.cyan}http://${detectedLanIp}:3333${colors.reset}`);
  console.log(`      • Testes locais no celular com backend rodando no seu computador.\n`);

  console.log(`  ${colors.bold}${colors.yellow}[3] 💻 LOCALHOST (Simulador iOS / Emulador Android / Web)${colors.reset}`);
  console.log(`      • ${colors.cyan}http://localhost:3333${colors.reset}`);
  console.log(`      • Desenvolvimento no mesmo computador sem celular físico.\n`);

  console.log(`  ${colors.bold}${colors.magenta}[4] ✏️ URL PERSONALIZADA (ex: túnel ngrok ou outro IP)${colors.reset}\n`);

  const choice = await askQuestion(`${colors.bold}Opção desejada [1-4] (Padrão: 1): ${colors.reset}`);
  const opt = choice.trim() || "1";

  let selectedUrl = REMOTE_PROD_URL;
  if (opt === "2") {
    selectedUrl = `http://${detectedLanIp}:3333`;
  } else if (opt === "3") {
    selectedUrl = "http://localhost:3333";
  } else if (opt === "4") {
    const custom = await askQuestion("Digite a URL completa do backend: ");
    if (custom.trim()) {
      selectedUrl = custom.trim();
    }
  }

  writeFrontendEnv(selectedUrl);
  await verifyAndReport(selectedUrl);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
