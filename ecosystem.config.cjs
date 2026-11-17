const path = require("path");
const fs = require("fs");

function resolveAppRoot() {
  if (process.env.PRESCO_APP_ROOT && process.env.PRESCO_APP_ROOT.trim()) {
    return path.resolve(process.env.PRESCO_APP_ROOT.trim());
  }
  if (path.basename(__dirname) === "current") {
    return path.dirname(__dirname);
  }
  if (path.basename(path.dirname(__dirname)) === "releases") {
    return path.dirname(path.dirname(__dirname));
  }
  return __dirname;
}

const appRoot = resolveAppRoot();

const isStaging =
  path.basename(appRoot) === "staging" ||
  process.env.PRESCO_ENV === "staging" ||
  process.env.NODE_ENV === "development";

const currentBundle = path.resolve(appRoot, "current/src/backend/dist/server.mjs");
const rootBundle = path.resolve(appRoot, "src/backend/dist/server.mjs");
const localBundle = path.resolve(__dirname, "src/backend/dist/server.mjs");

const resolvedBundle = [currentBundle, rootBundle, localBundle].find((p) => fs.existsSync(p));
const hasBundle = Boolean(resolvedBundle);

const backendDir = resolvedBundle
  ? path.dirname(path.dirname(resolvedBundle))
  : fs.existsSync(path.resolve(appRoot, "current/src/backend"))
    ? path.resolve(appRoot, "current/src/backend")
    : path.resolve(appRoot, "src/backend");

const tsxPath =
  [
    path.resolve(backendDir, "node_modules/tsx/dist/cli.mjs"),
    path.resolve(backendDir, "node_modules/.bin/tsx"),
    path.resolve(appRoot, "node_modules/tsx/dist/cli.mjs"),
    path.resolve(appRoot, "node_modules/.bin/tsx"),
    path.resolve(__dirname, "src/backend/node_modules/tsx/dist/cli.mjs"),
    path.resolve(__dirname, "node_modules/tsx/dist/cli.mjs"),
    "/usr/local/bin/tsx",
    "/usr/bin/tsx",
  ].find((p) => fs.existsSync(p)) || "tsx";

const logDir = path.resolve(appRoot, "shared/logs");
const imageCacheDir = path.resolve(appRoot, "shared/.cache/images");

const sharedEnv = {
  SERVER_HOST: process.env.SERVER_HOST || "127.0.0.1",
  LOG_DIR: logDir,
  IMAGE_CACHE_DIR: imageCacheDir,
  MALLOC_ARENA_MAX: "2",
  UV_THREADPOOL_SIZE: "4",
  PRESCO_APP_ROOT: appRoot,
};

const baseRuntime = {
  cwd: backendDir,
  script: resolvedBundle || tsxPath,
  ...(hasBundle ? {} : { args: "./src/server.ts" }),
  interpreter: "node",
  instances: 1,
  exec_mode: hasBundle ? "cluster" : "fork",
  wait_ready: hasBundle,
  listen_timeout: 15000,
  kill_timeout: 5000,
  autorestart: true,
  watch: false,
  merge_logs: true,
  max_restarts: 25,
  restart_delay: 2000,
};

const prodApp = {
  ...baseRuntime,
  name: "presco-backend",
  node_args: ["--max-old-space-size=320"],
  max_memory_restart: "512M",
  env: {
    ...sharedEnv,
    NODE_ENV: "production",
    PRESCO_ENV: "production",
    SERVER_PORT: process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3333,
  },
  error_file: path.resolve(logDir, "backend-error.log"),
  out_file: path.resolve(logDir, "backend-out.log"),
};

const devApp = {
  ...baseRuntime,
  name: "presco-backend-dev",
  node_args: ["--max-old-space-size=256"],
  max_memory_restart: "384M",
  env: {
    ...sharedEnv,
    NODE_ENV: "development",
    PRESCO_ENV: "staging",
    SERVER_PORT: process.env.SERVER_PORT_DEV
      ? Number(process.env.SERVER_PORT_DEV)
      : process.env.SERVER_PORT
        ? Number(process.env.SERVER_PORT)
        : 3334,
  },
  error_file: path.resolve(logDir, "backend-dev-error.log"),
  out_file: path.resolve(logDir, "backend-dev-out.log"),
};

module.exports = {
  apps: [isStaging ? devApp : prodApp],
};
