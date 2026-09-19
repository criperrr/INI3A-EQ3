import localtunnel from "localtunnel";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";

const PORT = Number(process.env.SERVER_PORT || 3333);
const TUNNEL_FILE = path.resolve(process.cwd(), ".tunnel_url");

export function testTunnelHealth(urlStr: string, timeoutMs: number = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const cleanUrl = urlStr.replace(/\/+$/, "");
      const parsed = new URL(`${cleanUrl}/health`);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.get(
        parsed,
        {
          headers: {
            "User-Agent": "Presco-Tunnel-Agent/1.0",
            "Bypass-Tunnel-Reminder": "true",
            "ngrok-skip-browser-warning": "true",
            "Accept": "application/json",
          },
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500);
        }
      );

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

function getSystemNgrokBinary(): string | null {
  const candidates = [
    "/opt/homebrew/bin/ngrok",
    "/usr/local/bin/ngrok",
    path.join(process.env.HOME || "", "bin/ngrok"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback: search system PATH excluding node_modules to avoid old 2.x binary
  try {
    const rawPath = process.env.PATH || "";
    const cleanPath = rawPath
      .split(path.delimiter)
      .filter((p) => !p.includes("node_modules"))
      .join(path.delimiter);
    const checkCmd = process.platform === "win32" ? "where ngrok" : "which ngrok";
    const found = execSync(checkCmd, { env: { ...process.env, PATH: cleanPath }, encoding: "utf8" }).trim();
    if (found) {
      const first = found.split("\n")[0].trim();
      if (fs.existsSync(first)) return first;
    }
  } catch {}

  return null;
}

async function getActiveNgrokTunnel(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:4040/api/tunnels", { timeout: 1200 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const tunnels = json.tunnels || [];
          if (tunnels.length > 0 && tunnels[0].public_url) {
            resolve(tunnels[0].public_url.replace(/\/+$/, ""));
            return;
          }
        } catch {}
        resolve(null);
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function startNgrokTunnel(port: number): Promise<{ url: string; close: () => void } | null> {
  const ngrokBin = getSystemNgrokBinary();
  if (!ngrokBin) return null;

  // Se já houver um processo ngrok ativo no sistema, reutiliza a URL imediatamente
  const existingUrl = await getActiveNgrokTunnel();
  if (existingUrl) {
    console.log(`✅ [Ngrok Ativo] Reutilizando túnel ngrok existente: ${existingUrl}`);
    return { url: existingUrl, close: () => {} };
  }

  // Limpar eventuais processos zumbis de ngrok antes de subir um novo
  try {
    if (process.platform !== "win32") {
      execSync("pkill -f 'ngrok http' 2>/dev/null || true", { stdio: "ignore" });
    }
  } catch {}

  console.log(`🌐 [Ngrok Cloud] Inicializando túnel ngrok de alta estabilidade (${ngrokBin})...`);

  return new Promise((resolve) => {
    try {
      const proc = spawn(ngrokBin, ["http", `127.0.0.1:${port}`, "--log=stdout"], {
        detached: process.platform !== "win32",
      });
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            if (proc.pid) process.kill(-proc.pid, "SIGTERM");
            else proc.kill("SIGTERM");
          } catch {}
          resolve(null);
        }
      }, 7000);

      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        const match = text.match(/url=(https:\/\/[^\s]+)/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          const url = match[1].replace(/\/+$/, "");
          console.log(`✅ [Ngrok Ativo] Conexão segura estabelecida: ${url}`);
          resolve({
            url,
            close: () => {
              try {
                if (proc.pid) process.kill(-proc.pid, "SIGTERM");
                else proc.kill("SIGTERM");
              } catch {}
            },
          });
        }
      });

      proc.on("error", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });

      proc.on("exit", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

export async function startApiTunnel(customUrl?: string): Promise<{ url: string; close: () => void }> {
  // 1. If user provided a static URL (e.g. ngrok static domain or flag)
  if (customUrl) {
    const cleanUrl = customUrl.replace(/\/+$/, "");
    console.log(`🌐 [Túnel] Usando URL customizada configurada: ${cleanUrl}`);
    fs.writeFileSync(TUNNEL_FILE, cleanUrl, "utf8");
    return { url: cleanUrl, close: () => { try { fs.unlinkSync(TUNNEL_FILE); } catch {} } };
  }

  // Check env variable NGROK_URL or TUNNEL_URL
  const envUrl = process.env.NGROK_URL || process.env.TUNNEL_URL;
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, "");
    console.log(`🌐 [Túnel] Usando URL do ambiente: ${cleanUrl}`);
    fs.writeFileSync(TUNNEL_FILE, cleanUrl, "utf8");
    return { url: cleanUrl, close: () => { try { fs.unlinkSync(TUNNEL_FILE); } catch {} } };
  }

  console.log(`🌐 [Túnel Cloud] Abrindo túnel para a API Backend na porta ${PORT}...`);
  console.log(`   (Contornando firewalls e AP Isolation com latência otimizada)`);

  // 2. Prefer ngrok if available (ultra-fast, TLS verified, doesn't freeze)
  const ngrokTunnel = await startNgrokTunnel(PORT);
  if (ngrokTunnel) {
    fs.writeFileSync(TUNNEL_FILE, ngrokTunnel.url, "utf8");
    return ngrokTunnel;
  }

  console.log(`ℹ️  [Túnel] Ngrok indisponível, recorrendo a localtunnel como alternativa...`);

  let activeUrl = "";
  let tunnelInstance: localtunnel.Tunnel | null = null;

  // Try preferred stable subdomain first
  const candidateSubdomains = [
    `presco-api-${Math.floor(1000 + Math.random() * 9000)}`,
    "ini3a-eq3-api",
  ];

  for (const subdomain of candidateSubdomains) {
    try {
      console.log(`⏳ Solicitando túnel seguro (${subdomain})...`);
      const t = await localtunnel({ port: PORT, subdomain });
      if (t && t.url) {
        console.log(`🔍 Testando conectividade do túnel (${t.url})...`);
        const isHealthy = await testTunnelHealth(t.url, 3500);
        if (isHealthy) {
          activeUrl = t.url;
          tunnelInstance = t;
          break;
        } else {
          console.warn(`⚠️ O servidor do túnel (${t.url}) não respondeu no teste de saúde. Tentando alternativo...`);
          try { t.close(); } catch {}
        }
      }
    } catch (e: any) {
      // Try next
    }
  }

  // Fallback to dynamic random subdomain if needed
  if (!activeUrl) {
    try {
      console.log(`⏳ Solicitando túnel dinâmico...`);
      const t = await localtunnel({ port: PORT });
      if (t && t.url) {
        console.log(`🔍 Testando conectividade do túnel dinâmico (${t.url})...`);
        const isHealthy = await testTunnelHealth(t.url, 3500);
        if (isHealthy) {
          activeUrl = t.url;
          tunnelInstance = t;
        } else {
          try { t.close(); } catch {}
        }
      }
    } catch (err: any) {
      console.error(`❌ Erro ao criar túnel:`, err?.message || err);
    }
  }

  if (!activeUrl || !tunnelInstance) {
    throw new Error("Não foi possível estabelecer túnel para a API.");
  }

  fs.writeFileSync(TUNNEL_FILE, activeUrl, "utf8");
  console.log(`✅ [Túnel Ativo] URL pública da API: ${activeUrl}`);

  tunnelInstance.on("close", () => {
    console.warn("⚠️ Túnel foi fechado.");
    try { fs.unlinkSync(TUNNEL_FILE); } catch {}
  });

  tunnelInstance.on("error", (err: any) => {
    console.error("⚠️ Erro no túnel:", err?.message || err);
  });

  const close = () => {
    try { fs.unlinkSync(TUNNEL_FILE); } catch {}
    if (tunnelInstance) {
      try { tunnelInstance.close(); } catch {}
    }
  };

  return { url: activeUrl, close };
}

// Standalone execution support: npx tsx scripts/start_api_tunnel.ts
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const custom = process.argv[2];
  startApiTunnel(custom).catch((err) => {
    console.error("Falha fatal no túnel:", err);
    process.exit(1);
  });
}
