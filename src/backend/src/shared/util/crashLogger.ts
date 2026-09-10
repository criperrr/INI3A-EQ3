import fs from "node:fs";
import path from "node:path";

function getLogDir(): string {
  if (process.env.LOG_DIR) {
    return path.resolve(process.env.LOG_DIR);
  }
  // If running in production on remote server
  if (fs.existsSync("/var/www/equipes/26-presco")) {
    return "/var/www/equipes/26-presco/logs";
  }
  // Default to logs directory relative to project root or backend
  return path.resolve(process.cwd(), "logs");
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
      `🔥 CATASTROPHIC ERROR DETECTED [${timestamp}]`,
      `Context: ${context}`,
      `PID: ${process.pid} | Uptime: ${process.uptime().toFixed(1)}s | Node: ${process.version} (${process.platform})`,
      `Memory: RSS ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Heap ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      `Message: ${errObj.message}`,
      `Stack Trace:`,
      errObj.stack || "No stack trace available",
      "================================================================================\n",
    ].join("\n");

    const logFile = path.join(logDir, "crash.log");
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
