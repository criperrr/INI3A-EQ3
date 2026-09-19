/**
 * scripts/lib/system.ts
 * Cross-platform helpers for the bootstrap script: OS detection, package
 * managers, command execution, and interactive prompts. No external deps.
 */
import { spawn, spawnSync } from "node:child_process";
import readline from "node:readline";
import process from "node:process";

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};

const useColor =
  process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const paint = (c: string) => (s: unknown) =>
  useColor ? `${c}${s}${colors.reset}` : String(s);

export const info = (m: string) => console.log(`${paint(colors.cyan)("•")} ${m}`);
export const ok = (m: string) => console.log(`${paint(colors.green)("✓")} ${m}`);
export const warn = (m: string) => console.log(`${paint(colors.yellow)("!")} ${m}`);
export const err = (m: string) =>
  console.error(`${paint(colors.red)("✗")} ${m}`);
export const step = (m: string) =>
  console.log(`\n${paint(colors.bold + colors.cyan)(`━━━  ${m}  ━━━`)}`);
export const dim = paint(colors.gray);
export const bold = paint(colors.bold);

// ---------------------------------------------------------------------------
// OS + package manager
// ---------------------------------------------------------------------------

export type OS = "linux" | "macos" | "windows";

export function detectOS(): OS {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "linux";
}

export const IS_WIN = detectOS() === "windows";

export type PkgManagerId =
  | "apt"
  | "dnf"
  | "yum"
  | "pacman"
  | "zypper"
  | "brew"
  | "winget"
  | "choco";

export interface PkgManager {
  id: PkgManagerId;
  /** command + args to install the given package names */
  install(pkgs: string[]): [string, string[]];
  /** optional index/metadata refresh before installing */
  refresh?: [string, string[]];
  /** whether install commands must be prefixed with sudo (posix) */
  needsSudo: boolean;
}

const PKG_TABLE: Array<{ bin: string; make: () => PkgManager }> = [
  {
    bin: "apt-get",
    make: () => ({
      id: "apt",
      needsSudo: true,
      refresh: ["apt-get", ["update"]],
      install: (p) => ["apt-get", ["install", "-y", ...p]],
    }),
  },
  {
    bin: "dnf",
    make: () => ({
      id: "dnf",
      needsSudo: true,
      install: (p) => ["dnf", ["install", "-y", ...p]],
    }),
  },
  {
    bin: "yum",
    make: () => ({
      id: "yum",
      needsSudo: true,
      install: (p) => ["yum", ["install", "-y", ...p]],
    }),
  },
  {
    bin: "zypper",
    make: () => ({
      id: "zypper",
      needsSudo: true,
      install: (p) => ["zypper", ["--non-interactive", "install", ...p]],
    }),
  },
  {
    bin: "pacman",
    make: () => ({
      id: "pacman",
      needsSudo: true,
      install: (p) => ["pacman", ["-S", "--noconfirm", "--needed", ...p]],
    }),
  },
  {
    bin: "brew",
    make: () => ({
      id: "brew",
      needsSudo: false,
      install: (p) => ["brew", ["install", ...p]],
    }),
  },
  {
    bin: "winget",
    make: () => ({
      id: "winget",
      needsSudo: false,
      install: (p) => [
        "winget",
        [
          "install",
          "--accept-package-agreements",
          "--accept-source-agreements",
          "--silent",
          ...p.flatMap((id) => ["--id", id]),
        ],
      ],
    }),
  },
  {
    bin: "choco",
    make: () => ({
      id: "choco",
      needsSudo: false,
      install: (p) => ["choco", ["install", "-y", ...p]],
    }),
  },
];

export function detectPkgManager(): PkgManager | null {
  const os = detectOS();
  const order =
    os === "macos"
      ? ["brew"]
      : os === "windows"
        ? ["winget", "choco"]
        : ["apt-get", "dnf", "yum", "zypper", "pacman"];
  for (const bin of order) {
    if (which(bin)) return PKG_TABLE.find((p) => p.bin === bin)!.make();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

export function which(cmd: string): string | null {
  if (IS_WIN) {
    const r = spawnSync("where", [cmd], { encoding: "utf8" });
    const out = (r.stdout || "").trim();
    return r.status === 0 && out ? out.split(/\r?\n/)[0] : null;
  }
  const r = spawnSync("sh", ["-c", `command -v -- "${cmd}" 2>/dev/null`], {
    encoding: "utf8",
  });
  const out = (r.stdout || "").trim();
  return r.status === 0 && out ? out.split(/\r?\n/)[0] : null;
}

export const has = (cmd: string) => which(cmd) !== null;

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Run capturing output (sync). */
export function run(
  cmd: string,
  args: string[],
  opts: { input?: string; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): RunResult {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: IS_WIN,
    ...opts,
  });
  return {
    status: r.status ?? (r.error ? 1 : 0),
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

/** Run inheriting stdio (for installers / long output). Resolves exit code. */
export function runLive(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: IS_WIN, ...opts });
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", () => resolve(1));
  });
}

/** Prefix a command with sudo on posix when required and not already root. */
export function withSudo(
  needsSudo: boolean,
  cmd: string,
  args: string[],
): [string, string[]] {
  if (!needsSudo || IS_WIN) return [cmd, args];
  if (typeof process.getuid === "function" && process.getuid() === 0)
    return [cmd, args];
  if (!has("sudo")) return [cmd, args];
  return ["sudo", [cmd, ...args]];
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

let ASSUME_YES = false;
export function setAssumeYes(v: boolean) {
  ASSUME_YES = v;
}

function canPrompt() {
  return !ASSUME_YES && process.stdin.isTTY;
}

export async function promptYesNo(question: string, def = true): Promise<boolean> {
  if (!canPrompt()) return def;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const a = (
    await new Promise<string>((res) =>
      rl.question(`  ${question} ${def ? "[S/n]" : "[s/N]"} `, res),
    )
  )
    .trim()
    .toLowerCase();
  rl.close();
  if (!a) return def;
  return ["s", "sim", "y", "yes"].includes(a);
}

/**
 * Numbered choice prompt. `choices` are labels; returns the picked index.
 * `def` is the 0-based default index.
 */
export async function promptChoice(
  question: string,
  choices: string[],
  def = 0,
): Promise<number> {
  if (!canPrompt()) return def;
  console.log(`  ${question}`);
  choices.forEach((c, i) =>
    console.log(`    ${dim(`${i + 1})`)} ${c}${i === def ? dim("  (padrão)") : ""}`),
  );
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const a = (
    await new Promise<string>((res) => rl.question(`  > `, res))
  ).trim();
  rl.close();
  const n = Number(a);
  return Number.isInteger(n) && n >= 1 && n <= choices.length ? n - 1 : def;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(
  fn: () => boolean | Promise<boolean>,
  { tries = 30, delayMs = 1000 }: { tries?: number; delayMs?: number } = {},
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    await sleep(delayMs);
  }
  return false;
}

export function fillTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
