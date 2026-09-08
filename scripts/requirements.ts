/**
 * scripts/requirements.ts
 * Declarative manifest of everything the project needs to run: CLI tools and
 * backing services, with per-OS install recipes. `scripts/bootstrap.ts` reads
 * this — adding a new required tool/service means adding an entry here.
 *
 * See .agents/skills/add-service/SKILL.md for the full contract.
 */
import type { PkgManagerId } from "./lib/system.ts";

/** Package names to install per package manager. Omit a manager to skip it. */
export type PkgNames = Partial<Record<PkgManagerId, string[]>>;

export interface ToolRequirement {
  id: string;
  label: string;
  /** command that must exist on PATH once installed */
  bin: string;
  /** optional: `<bin> <versionArgs>` output must satisfy minMajor */
  versionArgs?: string[];
  minMajor?: number;
  /** if true: missing → warn and continue (never blocks) */
  optional?: boolean;
  /** package names per manager; `script` is a shell one-liner fallback */
  packages?: PkgNames;
  script?: Partial<Record<"linux" | "macos" | "windows", string>>;
  docs?: string;
  /** shown when it can't be auto-installed */
  note?: string;
}

export interface ServiceRequirement {
  id: string;
  label: string;
  kind: "postgres" | "redis";
  /** backend .env variable this service populates */
  envVar: string;
  nativePort: number;
  dockerPort: number;
  /** service name in docker-compose.yml */
  dockerService: string;
  /** connection URL templates; `{host}` is substituted */
  url: { native: string; docker: string };
  /** CLI binary that indicates a native install */
  bin: string;
  /** native install packages per manager */
  packages?: PkgNames;
  note?: string;
  /** postgres only */
  credentials?: { user: string; password: string; database: string };
  extensions?: string[];
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const TOOLS: ToolRequirement[] = [
  {
    id: "git",
    label: "Git",
    bin: "git",
    packages: {
      apt: ["git"],
      dnf: ["git"],
      yum: ["git"],
      zypper: ["git"],
      pacman: ["git"],
      brew: ["git"],
      winget: ["Git.Git"],
      choco: ["git"],
    },
    docs: "https://git-scm.com/downloads",
  },
  {
    id: "docker",
    label: "Docker Engine + Compose",
    bin: "docker",
    optional: true,
    packages: {
      brew: ["docker"], // cask; brew handles it
      winget: ["Docker.DockerDesktop"],
      choco: ["docker-desktop"],
    },
    script: {
      linux: "curl -fsSL https://get.docker.com | sh",
    },
    note: "No Linux o script oficial precisa de sudo e um relogin para o grupo docker.",
    docs: "https://docs.docker.com/get-docker/",
  },
];

// ── Services ─────────────────────────────────────────────────────────────────

export const SERVICES: ServiceRequirement[] = [
  {
    id: "postgres",
    label: "PostgreSQL + PostGIS",
    kind: "postgres",
    envVar: "DATABASE_URL",
    nativePort: 5432,
    dockerPort: 5433,
    dockerService: "postgres",
    bin: "psql",
    url: {
      native: "postgres://presco:presco@{host}:5432/presco_db",
      docker: "postgres://postgres:postgres@{host}:5433/presco_db",
    },
    credentials: { user: "presco", password: "presco", database: "presco_db" },
    extensions: ["postgis", "pg_trgm", "unaccent"],
    packages: {
      apt: ["postgresql", "postgresql-contrib", "postgis"],
      dnf: ["postgresql-server", "postgresql-contrib", "postgis"],
      yum: ["postgresql-server", "postgresql-contrib", "postgis"],
      zypper: ["postgresql-server", "postgresql-contrib", "postgresql-postgis"],
      pacman: ["postgresql", "postgis"],
      brew: ["postgresql@16", "postgis"],
    },
    note: "No Windows, PostGIS nativo é trabalhoso — prefira Docker.",
  },
  {
    id: "redis",
    label: "Redis",
    kind: "redis",
    envVar: "REDIS_URL",
    nativePort: 6379,
    dockerPort: 6380,
    dockerService: "redis",
    bin: "redis-server",
    url: {
      native: "redis://{host}:6379",
      docker: "redis://{host}:6380",
    },
    packages: {
      apt: ["redis-server"],
      dnf: ["redis"],
      yum: ["redis"],
      zypper: ["redis"],
      pacman: ["redis"],
      brew: ["redis"],
    },
    note: "Redis nativo no Windows não é oficialmente suportado — use Docker ou WSL. O backend também tem fallback in-memory.",
  },
];

// ── Backend .env defaults (besides the resolved service URLs) ────────────────

export const ENV_DEFAULTS: Record<string, string> = {
  SERVER_PORT: "3333",
  SERVER_HOST: "0.0.0.0",
  NODE_ENV: "development",
  // JWT_SECRET is generated in bootstrap if absent
};

export const BACKEND_ENV_PATH = "src/backend/.env";
