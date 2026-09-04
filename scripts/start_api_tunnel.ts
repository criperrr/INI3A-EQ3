import localtunnel from "localtunnel";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { spawn } from "node:child_process";

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
        activeUrl = t.url;
        tunnelInstance = t;
        break;
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
        activeUrl = t.url;
        tunnelInstance = t;
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
if (import.meta.url === `file://${process.argv[1]}`) {
  const custom = process.argv[2];
  startApiTunnel(custom).catch((err) => {
    console.error("Falha fatal no túnel:", err);
    process.exit(1);
  });
}
