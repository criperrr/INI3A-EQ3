import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_CRASH_LOG_BYTES = 2 * 1024 * 1024; // 2 MiB cap

function isStagingEnvironment(): boolean {
  if (process.env.PRESCO_ENV === "staging") return true;
  if (process.env.NODE_ENV === "development") {
    const cwd = process.cwd();
    if (cwd.includes("/staging") || __dirname.includes("/staging/")) return true;
  }
  const cwd = process.cwd();
  return cwd.includes("/26-presco/staging") || __dirname.includes("/26-presco/staging/");
}

function getLogDir(): string {
  const configured = process.env.LOG_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  if (isStagingEnvironment()) {
    if (fs.existsSync("/var/www/equipes/26-presco/staging/shared/logs")) {
      return "/var/www/equipes/26-presco/staging/shared/logs";
    }
    if (fs.existsSync("/var/www/equipes/26-presco/staging")) {
      return "/var/www/equipes/26-presco/staging/logs";
    }
    return path.resolve(process.cwd(), "logs");
  }

  if (process.env.NODE_ENV === "production") {
    if (fs.existsSync("/var/www/equipes/26-presco/shared/logs")) {
      return "/var/www/equipes/26-presco/shared/logs";
    }
    if (fs.existsSync("/var/www/equipes/26-presco/logs")) {
      return "/var/www/equipes/26-presco/logs";
    }
  }

  return path.resolve(process.cwd(), "logs");
}

function rotateCrashLogIfOversized(logFile: string): void {
  try {
    if (!fs.existsSync(logFile)) return;
    const stats = fs.statSync(logFile);
    if (stats.size >= MAX_CRASH_LOG_BYTES) {
      const backupFile = `${logFile}.1`;
      fs.renameSync(logFile, backupFile);
    }
  } catch {
    // Ignore rotation errors to avoid masking the fatal crash log
  }
}

export function logFatalError(context: string, error: unknown): void {
  try {
    const logDir = getLogDir();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const mem = process.memoryUsage();
    const errObj = error instanceof Error ? error : new Error(String(error));

    const logEntry = [
      "================================================================================",
      `[FATAL] CATASTROPHIC ERROR DETECTED [${timestamp}]`,
      `Context: ${context}`,
      `PID: ${process.pid} | Uptime: ${process.uptime().toFixed(1)}s | Node: ${process.version} (${process.platform})`,
      `Memory: RSS ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Heap ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      `Message: ${errObj.message}`,
      `Stack Trace:`,
      errObj.stack || "No stack trace available",
      "================================================================================\n",
    ].join("\n");

    const logFile = path.join(logDir, "crash.log");
    rotateCrashLogIfOversized(logFile);
    fs.appendFileSync(logFile, logEntry, "utf8");
    console.error(`[CRASH-LOGGER] Catastrophic error written to: ${logFile}`);
  } catch (loggingError) {
    console.error("[CRASH-LOGGER] Failed to write crash log:", loggingError);
  }
}

export function initCrashLogger(): void {
  process.on("uncaughtException", (error: Error) => {
    console.error("FATAL UNCAUGHT EXCEPTION:", error);
    logFatalError("uncaughtException", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("FATAL UNHANDLED REJECTION:", reason);
    logFatalError("unhandledRejection", reason);
  });
}
