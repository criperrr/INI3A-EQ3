import localtunnel from "localtunnel";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const PORT = Number(process.env.SERVER_PORT || 3333);
const TUNNEL_FILE = path.resolve(process.cwd(), ".tunnel_url");

function testHealth(urlStr: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(`${urlStr}/health`);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.get(
        parsed,
        {
          headers: {
            "User-Agent": "Presco-Tunnel-Checker/1.0",
            "Bypass-Tunnel-Reminder": "true",
          },
          timeout: 5000,
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400);
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

async function startTunnel() {
  console.log(`🌐 [Tunnel Agent] Opening cloud tunnel for Backend API on Port ${PORT}...`);

  let tunnel: localtunnel.Tunnel | null = null;
  let activeUrl = "";

  // Attempt 1: Preferred subdomain
  try {
    console.log(`⏳ Attempting preferred subdomain 'ini3a-eq3-api'...`);
    tunnel = await localtunnel({ port: PORT, subdomain: "ini3a-eq3-api" });
    if (tunnel && tunnel.url) {
      const isHealthy = await testHealth(tunnel.url);
      if (isHealthy) {
        activeUrl = tunnel.url;
        console.log(`✅ Preferred subdomain active and responsive: ${activeUrl}`);
      } else {
        console.warn(`⚠️ Subdomain 'ini3a-eq3-api' returned unhealthy status. Falling back to dynamic subdomain...`);
        tunnel.close();
        tunnel = null;
      }
    }
  } catch (e: any) {
    console.warn(`⚠️ Preferred subdomain unavailable (${e.message}). Spawning dynamic tunnel...`);
  }

  // Attempt 2: Dynamic subdomain
  if (!activeUrl) {
    try {
      console.log(`⏳ Requesting dynamic tunnel...`);
      tunnel = await localtunnel({ port: PORT });
      activeUrl = tunnel.url;
      console.log(`✅ Dynamic tunnel created: ${activeUrl}`);
    } catch (err: any) {
      console.error(`❌ Failed to create cloud tunnel:`, err.message);
      fs.writeFileSync(TUNNEL_FILE, "", "utf8");
      process.exit(1);
    }
  }

  // Persist verified tunnel URL for launcher scripts and frontend
  fs.writeFileSync(TUNNEL_FILE, activeUrl, "utf8");
  console.log(`🚀 [Tunnel Agent] Active API URL written to .tunnel_url: ${activeUrl}`);
  console.log(`\n========================================================`);
  console.log(`🔗 API TUNNEL READY: ${activeUrl}`);
  console.log(`========================================================\n`);

  tunnel?.on("close", () => {
    console.warn("⚠️ Tunnel closed or remote disconnected. Reconnecting...");
    try { fs.unlinkSync(TUNNEL_FILE); } catch {}
    setTimeout(startTunnel, 3000);
  });

  tunnel?.on("error", (err: any) => {
    console.error("⚠️ Tunnel connection error:", err?.message || err);
    if (String(err?.message || "").includes("remote gone away") || String(err?.message || "").includes("ECONNREFUSED")) {
      console.warn("💡 Tip: If tunnels are unstable, use Local NAT mode with `npm run dev:local` (0ms latency on Wi-Fi).");
    }
  });

  const cleanup = () => {
    console.log("\nClosing tunnel...");
    try { fs.unlinkSync(TUNNEL_FILE); } catch {}
    if (tunnel) {
      try { tunnel.close(); } catch {}
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startTunnel();
