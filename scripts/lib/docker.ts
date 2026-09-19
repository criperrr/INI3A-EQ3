/**
 * scripts/lib/docker.ts
 * Cross-platform Docker management:
 * - Docker CLI detection and PATH injection (macOS Docker Desktop / Windows)
 * - Docker daemon auto-start on Linux (systemd/service), macOS (Docker.app), and Windows (Docker Desktop)
 * - Linux socket permission detection (/var/run/docker.sock) and automatic fix
 * - Compose command abstraction ('docker compose' vs 'docker-compose')
 * - PostgreSQL container exit inspection and automatic recovery from version mismatches (e.g. 16 vs 17)
 */
import path from "node:path";
import fs from "node:fs";
import {
  detectOS,
  has,
  run,
  runLive,
  withSudo,
  info,
  ok,
  warn,
  err,
  dim,
  waitFor,
  type OS,
} from "./system.ts";

export interface DockerComposeCmd {
  bin: string;
  prefix: string[];
}

/**
 * Ensure Docker CLI binary is in PATH across platforms.
 */
export function ensureDockerCliInPath(): boolean {
  if (has("docker")) return true;

  const os = detectOS();
  if (os === "macos") {
    const candidates = [
      "/Applications/Docker.app/Contents/Resources/bin",
      `${process.env.HOME}/.docker/bin`,
      "/usr/local/bin",
      "/opt/homebrew/bin",
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, "docker"))) {
        process.env.PATH = `${c}:${process.env.PATH}`;
        if (has("docker")) return true;
      }
    }
  } else if (os === "windows") {
    const progFiles = process.env.ProgramFiles || "C:\\Program Files";
    const candidate = path.join(progFiles, "Docker", "Docker", "resources", "bin");
    if (fs.existsSync(path.join(candidate, "docker.exe"))) {
      process.env.PATH = `${candidate};${process.env.PATH}`;
      if (has("docker")) return true;
    }
  }

  return has("docker");
}

/**
 * Resolves the docker compose command: either `docker compose` or `docker-compose`.
 */
export function getDockerComposeCmd(): DockerComposeCmd {
  ensureDockerCliInPath();
  const v = run("docker", ["compose", "version"]);
  if (v.status === 0) {
    return { bin: "docker", prefix: ["compose"] };
  }
  if (has("docker-compose")) {
    const v2 = run("docker-compose", ["version"]);
    if (v2.status === 0) {
      return { bin: "docker-compose", prefix: [] };
    }
  }
  return { bin: "docker", prefix: ["compose"] };
}

/**
 * Checks whether Docker daemon is responding to CLI queries.
 */
export function isDockerDaemonRunning(): boolean {
  if (!ensureDockerCliInPath()) return false;
  return run("docker", ["info"]).status === 0;
}

/**
 * Checks if failure to connect to Docker is due to socket permission denial.
 */
export function isDockerPermissionDenied(): boolean {
  if (!ensureDockerCliInPath()) return false;
  const res = run("docker", ["info"]);
  const combined = `${res.stdout} ${res.stderr}`.toLowerCase();
  return (
    combined.includes("permission denied") ||
    combined.includes("dial unix /var/run/docker.sock")
  );
}

/**
 * Attempts to fix Linux permissions for accessing /var/run/docker.sock.
 */
export async function fixLinuxDockerPermissions(): Promise<boolean> {
  if (detectOS() !== "linux") return false;

  const user = process.env.USER || process.env.LOGNAME || "";
  if (user && has("usermod")) {
    const [c, a] = withSudo(true, "usermod", ["-aG", "docker", user]);
    await runLive(c, a);
  }

  if (fs.existsSync("/var/run/docker.sock")) {
    const [sc, sa] = withSudo(true, "chmod", ["666", "/var/run/docker.sock"]);
    await runLive(sc, sa);
  }

  return isDockerDaemonRunning();
}

/**
 * Attempts to launch the Docker daemon in the background according to the OS.
 */
export async function triggerDockerDaemonStart(): Promise<boolean> {
  const os = detectOS();

  if (os === "linux") {
    if (has("systemctl")) {
      info("Iniciando Docker via systemctl (docker.socket + docker.service)...");
      const [c, a] = withSudo(true, "systemctl", [
        "enable",
        "--now",
        "docker.socket",
        "docker.service",
      ]);
      await runLive(c, a);
      return true;
    }
    if (has("service")) {
      info("Iniciando Docker via service...");
      const [c, a] = withSudo(true, "service", ["docker", "start"]);
      await runLive(c, a);
      return true;
    }
    if (has("rc-service")) {
      info("Iniciando Docker via rc-service...");
      const [c, a] = withSudo(true, "rc-service", ["docker", "start"]);
      await runLive(c, a);
      return true;
    }
  } else if (os === "macos") {
    info("Iniciando Docker Desktop para macOS...");
    run("open", ["-g", "-a", "Docker"]);
    return true;
  } else if (os === "windows") {
    info("Iniciando Docker Desktop para Windows...");
    const progFiles = process.env.ProgramFiles || "C:\\Program Files";
    const exe = path.join(progFiles, "Docker", "Docker", "Docker Desktop.exe");
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Start-Process '${exe}' -ErrorAction SilentlyContinue`,
    ]);
    return true;
  }

  return false;
}

/**
 * Guarantees that Docker daemon is running, auto-starting it and repairing socket permissions if needed.
 */
export async function ensureDockerDaemonRunning(maxWaitSeconds = 35): Promise<boolean> {
  if (!ensureDockerCliInPath()) {
    warn("Docker CLI não foi encontrado no PATH.");
    return false;
  }

  if (isDockerDaemonRunning()) {
    return true;
  }

  // Check if it's running but permissions on socket are missing
  if (isDockerPermissionDenied()) {
    warn("Docker daemon está ativo, mas o usuário atual não tem permissão para acessar /var/run/docker.sock.");
    info("Ajustando permissões de acesso ao Docker...");
    if (await fixLinuxDockerPermissions()) {
      ok("Permissões do Docker ajustadas com sucesso.");
      return true;
    }
  }

  // Trigger daemon start
  const started = await triggerDockerDaemonStart();
  if (!started) {
    warn("Não foi possível identificar o gerenciador de inicialização do Docker.");
    return false;
  }

  info(`Aguardando o Docker daemon inicializar (até ${maxWaitSeconds}s)...`);
  const tries = Math.ceil((maxWaitSeconds * 1000) / 1500);

  const ready = await waitFor(
    async () => {
      if (isDockerDaemonRunning()) return true;
      if (isDockerPermissionDenied()) {
        await fixLinuxDockerPermissions();
        return isDockerDaemonRunning();
      }
      return false;
    },
    { tries, delayMs: 1500 },
  );

  if (ready) {
    ok("Docker daemon está pronto e ativo.");
    return true;
  }

  warn("O Docker daemon demorou mais que o esperado para responder.");
  return false;
}

/**
 * Runs a compose command with the appropriate compose binary prefix.
 */
export async function runComposeCommand(
  args: string[],
  options: { cwd?: string } = {},
): Promise<number> {
  const compose = getDockerComposeCmd();
  const fullArgs = [...compose.prefix, ...args];
  return runLive(compose.bin, fullArgs, options);
}

/**
 * Inspects whether a specific container has exited unexpectedly, and checks logs for PostgreSQL version mismatches.
 */
export function checkPostgresVersionMismatch(containerName = "presco_postgres"): boolean {
  if (!isDockerDaemonRunning()) return false;
  const statusRes = run("docker", [
    "inspect",
    "-f",
    "{{.State.Status}} {{.State.ExitCode}}",
    containerName,
  ]);
  const statusStr = statusRes.stdout.trim();

  // If container is not running or exited with non-zero
  if (
    statusStr.startsWith("exited") ||
    statusStr.startsWith("dead") ||
    statusStr.includes("restart")
  ) {
    const logs = run("docker", ["logs", "--tail", "40", containerName]);
    const logText = `${logs.stdout} ${logs.stderr}`;
    if (
      logText.includes("database files are incompatible with server") ||
      logText.includes("The data directory was initialized by PostgreSQL version")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Starts compose infrastructure (Postgres + Redis) with automatic daemon startup,
 * health checking, and automatic recovery from PostgreSQL version mismatches.
 */
export async function startComposeInfrastructure(options: {
  cwd?: string;
  service?: string;
}): Promise<boolean> {
  const rootDir = options.cwd || process.cwd();

  const daemonOk = await ensureDockerDaemonRunning();
  if (!daemonOk) {
    return false;
  }

  const composeArgs = ["up", "-d"];
  if (options.service) {
    composeArgs.push(options.service);
  }

  info(`Iniciando infraestrutura via Docker (${composeArgs.join(" ")})...`);
  const code = await runComposeCommand(composeArgs, { cwd: rootDir });
  if (code !== 0) {
    warn("docker compose up retornou código de saída diferente de 0.");
  }

  // Allow a moment for initial startup
  await new Promise((r) => setTimeout(r, 1500));

  // Check if postgres container exited due to version incompatibility
  if (checkPostgresVersionMismatch("presco_postgres")) {
    warn(
      "⚠️ Detectada incompatibilidade de versão nos arquivos locais do PostgreSQL (ex: volume criado em v16 vs v17).",
    );
    info("Resetando o volume docker 'postgres_data' para recriar banco compatível...");
    await runComposeCommand(["down", "-v"], { cwd: rootDir });
    info("Subindo containers novamente com volume limpo...");
    await runComposeCommand(composeArgs, { cwd: rootDir });
  }

  return true;
}
