import http from "node:http";
import https from "node:https";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

export function getLocalLanIp(): string {
  if (process.env.LAN_IP || process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    return process.env.LAN_IP || process.env.REACT_NATIVE_PACKAGER_HOSTNAME || "127.0.0.1";
  }

  const interfaces = os.networkInterfaces();
  const candidates: Array<{ ip: string; priority: number; name: string }> = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal && !a.address.startsWith("127.") && !a.address.startsWith("169.254.")) {
        const ip = a.address;
        let priority = 5;
        const lower = name.toLowerCase();

        if (ip.startsWith("100.")) {
          priority = 18; // Tailscale mesh VPN
        } else if (ip.startsWith("172.20.10.") || ip.startsWith("192.168.43.") || ip.startsWith("192.168.3.") || ip.startsWith("192.168.2.")) {
          priority = 16; // Mobile Hotspots (no AP isolation)
        } else if (ip.startsWith("192.168.")) {
          priority = 14; // Home / Office Wi-Fi
        } else if (ip.startsWith("172.")) {
          priority = 10;
        } else if (ip.startsWith("10.")) {
          priority = 6; // Corporate / Campus
        }

        if (lower.includes("docker") || lower.includes("veth") || lower.includes("br-") || lower.includes("wsl")) {
          priority = 0;
        }

        candidates.push({ ip, priority, name });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.length > 0 ? candidates[0].ip : "127.0.0.1";
}

export function testTcpPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.once("error", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

export function testHttpHealth(urlStr: string, timeoutMs = 3000): Promise<{ ok: boolean; timeMs: number; status?: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.get(
        parsed,
        {
          headers: { "Bypass-Tunnel-Reminder": "true", "User-Agent": "Presco-Checker" },
          timeout: timeoutMs,
        },
        (res) => {
          const timeMs = Date.now() - start;
          resolve({ ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400, timeMs, status: res.statusCode });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, timeMs: Date.now() - start });
      });

      req.on("error", () => resolve({ ok: false, timeMs: Date.now() - start }));
    } catch {
      resolve({ ok: false, timeMs: Date.now() - start });
    }
  });
}

export async function runDiagnostics() {
  console.log(`\n${colors.bold}🔍 Diagnosticando Conectividade do Presco...${colors.reset}`);
  const lanIp = getLocalLanIp();
  console.log(`📍 IP Local Detectado: ${colors.cyan}${lanIp}${colors.reset}`);

  // Test Postgres
  const pgDocker = await testTcpPort("127.0.0.1", 5433);
  const pgNative = await testTcpPort("127.0.0.1", 5432);
  if (pgDocker) {
    console.log(`  [PostgreSQL] ${colors.green}✓ Ativo na porta 5433 (Docker)${colors.reset}`);
  } else if (pgNative) {
    console.log(`  [PostgreSQL] ${colors.green}✓ Ativo na porta 5432 (Nativo)${colors.reset}`);
  } else {
    console.log(`  [PostgreSQL] ${colors.yellow}⚠️ Offline (Inicie com: npm run db:up)${colors.reset}`);
  }

  // Test Redis
  const redisDocker = await testTcpPort("127.0.0.1", 6380);
  const redisNative = await testTcpPort("127.0.0.1", 6379);
  if (redisDocker || redisNative) {
    console.log(`  [Redis]      ${colors.green}✓ Ativo (${redisDocker ? "porta 6380 Docker" : "porta 6379 Nativo"})${colors.reset}`);
  } else {
    console.log(`  [Redis]      ${colors.yellow}ℹ️ Offline (Backend usará cache In-Memory seguro)${colors.reset}`);
  }

  // Test Backend Local
  const backendLocal = await testHttpHealth("http://127.0.0.1:3333/health");
  if (backendLocal.ok) {
    console.log(`  [Backend]    ${colors.green}✓ Respondendo em http://127.0.0.1:3333 (${backendLocal.timeMs}ms)${colors.reset}`);
  } else {
    console.log(`  [Backend]    ${colors.gray}• Não está rodando na porta 3333 ainda${colors.reset}`);
  }

  console.log("");
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  runDiagnostics();
}
