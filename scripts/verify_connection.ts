import http from "node:http";
import https from "node:https";
import os from "node:os";
import net from "node:net";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

export interface DiagnosticResult {
  mode: "local" | "tunnel" | "all";
  timestamp: string;
  lanIp: string;
  services: {
    postgres: { ok: boolean; message: string };
    redis: { ok: boolean; message: string; inMemory: boolean };
    backendLocal: { ok: boolean; port: number; status?: string; responseTimeMs?: number };
    backendLan?: { ok: boolean; url: string; responseTimeMs?: number; message?: string };
    backendTunnel?: { ok: boolean; url: string; responseTimeMs?: number; message?: string };
    expoLocal: { ok: boolean; port: number; message: string };
  };
  recommendations: string[];
}

/**
 * Robust cross-platform LAN IP resolver
 */
export function getLocalLanIp(): string {
  const interfaces = os.networkInterfaces();
  const candidates: Array<{ address: string; priority: number; iface: string }> = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;

      const ip = addr.address;
      // Skip loopback / link-local / docker / virtual adapters
      if (ip.startsWith("127.") || ip.startsWith("169.254.")) continue;

      let priority = 1;
      const lowerName = name.toLowerCase();

      // Prioritize Wi-Fi and primary Ethernet interfaces
      if (lowerName.includes("en0") || lowerName.includes("wlan") || lowerName.includes("wi-fi") || lowerName.includes("wifi")) {
        priority = 10;
      } else if (lowerName.includes("en1") || lowerName.includes("eth") || lowerName.includes("ethernet")) {
        priority = 8;
      } else if (lowerName.includes("tailscale") || lowerName.includes("tun") || lowerName.includes("docker") || lowerName.includes("veth") || lowerName.includes("br-")) {
        priority = 0;
      }

      candidates.push({ address: ip, priority, iface: name });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0 && candidates[0].priority > 0) {
    return candidates[0].address;
  }

  return "127.0.0.1";
}

/**
 * Tests raw TCP port availability
 */
export function checkTcpPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Tests HTTP/HTTPS GET request
 */
export function checkHttpEndpoint(
  urlStr: string,
  headers: Record<string, string> = {},
  timeoutMs = 4000
): Promise<{ ok: boolean; status?: number; data?: any; responseTimeMs: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;

      const req = client.get(
        parsedUrl,
        {
          headers: {
            "User-Agent": "Presco-Network-Agent/1.0",
            "Bypass-Tunnel-Reminder": "true",
            ...headers,
          },
          timeout: timeoutMs,
        },
        (res) => {
          let rawData = "";
          res.on("data", (chunk) => (rawData += chunk));
          res.on("end", () => {
            const responseTimeMs = Date.now() - start;
            let json: any = null;
            try {
              json = JSON.parse(rawData);
            } catch {
              json = rawData;
            }
            resolve({
              ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400,
              status: res.statusCode,
              data: json,
              responseTimeMs,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "TIMEOUT", responseTimeMs: Date.now() - start });
      });

      req.on("error", (err) => {
        resolve({ ok: false, error: err.message, responseTimeMs: Date.now() - start });
      });
    } catch (e: any) {
      resolve({ ok: false, error: e.message, responseTimeMs: Date.now() - start });
    }
  });
}

/**
 * Main Network Diagnostic Agent Runner
 */
export async function runConnectionAgent(options: {
  targetMode?: "local" | "tunnel" | "all";
  tunnelUrl?: string;
  serverPort?: number;
  expoPort?: number;
}): Promise<DiagnosticResult> {
  const mode = options.targetMode || "all";
  const serverPort = options.serverPort || 3333;
  const expoPort = options.expoPort || 8081;
  const lanIp = getLocalLanIp();

  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🤖 PRESCO NETWORK & CONNECTION DIAGNOSTIC AGENT${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.gray}Target Mode: ${colors.bold}${mode.toUpperCase()}${colors.reset} | ${colors.gray}LAN IP: ${colors.bold}${lanIp}${colors.reset} | ${colors.gray}Port: ${colors.bold}${serverPort}${colors.reset}\n`);

  const recommendations: string[] = [];

  // 1. PostgreSQL Check
  process.stdout.write(`${colors.cyan}[1/5] PostgreSQL (5432):${colors.reset} Checking... `);
  const pgTcp = await checkTcpPort("127.0.0.1", 5432);
  let pgResult = { ok: pgTcp, message: pgTcp ? "Port open & responsive" : "Connection refused on port 5432" };
  if (pgTcp) {
    console.log(`${colors.green}✅ ONLINE (Port 5432)${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ OFFLINE${colors.reset}`);
    recommendations.push("PostgreSQL is not responding. Run `npm run db:restart` or start your PostgreSQL service.");
  }

  // 2. Redis Check
  process.stdout.write(`${colors.cyan}[2/5] Redis Cache (6379):${colors.reset} Checking... `);
  const redisTcp = await checkTcpPort("127.0.0.1", 6379);
  let redisResult = {
    ok: true,
    message: redisTcp ? "Redis server connected" : "In-Memory session fallback active",
    inMemory: !redisTcp,
  };
  if (redisTcp) {
    console.log(`${colors.green}✅ ONLINE (Port 6379)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ OFFLINE -> In-Memory Fallback Active (Zero Crash Mode)${colors.reset}`);
  }

  // 3. Backend Local API Check
  process.stdout.write(`${colors.cyan}[3/5] Backend Local (http://localhost:${serverPort}/health):${colors.reset} Checking... `);
  const localHealth = await checkHttpEndpoint(`http://127.0.0.1:${serverPort}/health`);
  const backendLocal = {
    ok: localHealth.ok,
    port: serverPort,
    status: localHealth.ok ? "healthy" : "offline",
    responseTimeMs: localHealth.responseTimeMs,
  };

  if (localHealth.ok) {
    console.log(`${colors.green}✅ HEALTHY (${localHealth.responseTimeMs}ms)${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ OFFLINE (${localHealth.error || `HTTP ${localHealth.status}`})${colors.reset}`);
    recommendations.push(`Backend API is not running on port ${serverPort}. Start backend with \`npm run dev\` or check errors in \`src/backend\`.`);
  }

  // 4. Local NAT / LAN Mode Check
  let backendLan: { ok: boolean; url: string; responseTimeMs?: number; message?: string } | undefined;
  if (mode === "local" || mode === "all") {
    const lanUrl = `http://${lanIp}:${serverPort}`;
    process.stdout.write(`${colors.cyan}[4/5] Local LAN API (${lanUrl}/health):${colors.reset} Testing... `);
    const lanHealth = await checkHttpEndpoint(`${lanUrl}/health`);
    backendLan = {
      ok: lanHealth.ok,
      url: lanUrl,
      responseTimeMs: lanHealth.responseTimeMs,
      message: lanHealth.ok ? "Reachable on Wi-Fi/LAN" : lanHealth.error,
    };

    if (lanHealth.ok) {
      console.log(`${colors.green}✅ REACHABLE (${lanHealth.responseTimeMs}ms)${colors.reset}`);
      console.log(`      ↳ ${colors.gray}Expo config:${colors.reset} ${colors.bold}EXPO_PUBLIC_API_URL=${lanUrl}${colors.reset}`);
      console.log(`      ↳ ${colors.gray}Packager IP:${colors.reset} ${colors.bold}REACT_NATIVE_PACKAGER_HOSTNAME=${lanIp}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ UNREACHABLE ON LAN IP (${lanHealth.error})${colors.reset}`);
      recommendations.push(`LAN IP ${lanIp} could not connect to backend. Check macOS/Windows firewall or verify you are on the same Wi-Fi.`);
    }
  }

  // 5. Tunnel Mode Check
  let backendTunnel: { ok: boolean; url: string; responseTimeMs?: number; message?: string } | undefined;
  if (mode === "tunnel" || mode === "all" || options.tunnelUrl) {
    const tunnelToCheck = options.tunnelUrl || "https://ini3a-eq3-api.loca.lt";
    process.stdout.write(`${colors.cyan}[5/5] Public Tunnel API (${tunnelToCheck}/health):${colors.reset} Testing... `);
    const tunnelHealth = await checkHttpEndpoint(`${tunnelToCheck}/health`, { "Bypass-Tunnel-Reminder": "true" }, 6000);
    backendTunnel = {
      ok: tunnelHealth.ok,
      url: tunnelToCheck,
      responseTimeMs: tunnelHealth.responseTimeMs,
      message: tunnelHealth.ok ? "Tunnel is active and responding" : tunnelHealth.error,
    };

    if (tunnelHealth.ok) {
      console.log(`${colors.green}✅ ACTIVE (${tunnelHealth.responseTimeMs}ms)${colors.reset}`);
      console.log(`      ↳ ${colors.gray}Expo Tunnel config:${colors.reset} ${colors.bold}EXPO_PUBLIC_API_URL=${tunnelToCheck}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ TUNNEL INACTIVE (${tunnelHealth.error || `HTTP ${tunnelHealth.status}`})${colors.reset}`);
      if (mode === "tunnel") {
        recommendations.push(`Tunnel URL ${tunnelToCheck} is down or rate-limited. Ensure localtunnel/ngrok is running or switch to Local NAT mode with \`npm run dev:local\`.`);
      }
    }
  }

  // Expo Port check
  const expoRunning = await checkTcpPort("127.0.0.1", expoPort, 1000);
  const expoLocal = {
    ok: expoRunning,
    port: expoPort,
    message: expoRunning ? "Expo Metro bundler is running" : "Expo Metro bundler is idle",
  };

  // Diagnostic Summary
  console.log(`\n${colors.bold}📋 DIAGNOSTIC SUMMARY:${colors.reset}`);
  console.log(`  • Database (PostgreSQL): ${pgResult.ok ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`}`);
  console.log(`  • Cache (Redis):         ${redisResult.ok ? (redisResult.inMemory ? `${colors.yellow}In-Memory Fallback${colors.reset}` : `${colors.green}Connected${colors.reset}`) : `${colors.red}FAIL${colors.reset}`}`);
  console.log(`  • Backend Local (3333):  ${backendLocal.ok ? `${colors.green}ONLINE${colors.reset}` : `${colors.red}OFFLINE${colors.reset}`}`);
  if (backendLan) {
    console.log(`  • Backend LAN (Wi-Fi):   ${backendLan.ok ? `${colors.green}ONLINE (${backendLan.url})${colors.reset}` : `${colors.yellow}UNAVAILABLE${colors.reset}`}`);
  }
  if (backendTunnel) {
    console.log(`  • Backend Tunnel:        ${backendTunnel.ok ? `${colors.green}ONLINE (${backendTunnel.url})${colors.reset}` : `${colors.yellow}OFFLINE${colors.reset}`}`);
  }
  console.log(`  • Frontend Expo (8081):  ${expoLocal.ok ? `${colors.green}RUNNING${colors.reset}` : `${colors.gray}IDLE / NOT STARTED${colors.reset}`}`);

  if (recommendations.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}💡 ACTIONABLE RECOMMENDATIONS:${colors.reset}`);
    recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
  } else {
    console.log(`\n${colors.bold}${colors.green}🎉 ALL CONNECTIVITY CHECKS PASSED PERFECTLY!${colors.reset}`);
  }
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════${colors.reset}\n`);

  return {
    mode,
    timestamp: new Date().toISOString(),
    lanIp,
    services: {
      postgres: pgResult,
      redis: redisResult,
      backendLocal,
      backendLan,
      backendTunnel,
      expoLocal,
    },
    recommendations,
  };
}

// CLI Direct Execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let targetMode: "local" | "tunnel" | "all" = "all";
  let tunnelUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--local" || arg === "--nat" || arg === "-l") {
      targetMode = "local";
    } else if (arg === "--tunnel" || arg === "-t") {
      targetMode = "tunnel";
    } else if (arg.startsWith("--url=")) {
      tunnelUrl = arg.slice(6);
    } else if (arg === "--url" && args[i + 1]) {
      tunnelUrl = args[++i];
    }
  }

  runConnectionAgent({ targetMode, tunnelUrl })
    .then((res) => {
      if (!res.services.postgres.ok || !res.services.backendLocal.ok) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Diagnostic Agent Error:", err);
      process.exit(1);
    });
}
