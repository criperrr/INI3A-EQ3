const path = require("path");
const fs = require("fs");

const tsxPath = [
  path.resolve(__dirname, "node_modules/.bin/tsx"),
  path.resolve(__dirname, "src/backend/node_modules/.bin/tsx"),
  "/usr/local/bin/tsx",
  "/usr/bin/tsx",
].find((p) => fs.existsSync(p)) || "tsx";

module.exports = {
  apps: [
    {
      name: "presco-backend",
      cwd: path.resolve(__dirname, "src/backend"),
      script: tsxPath,
      args: "./src/server.ts",
      interpreter: "node",
      instances: 1,
      // fork (nao cluster): o script e o CLI do tsx, e o cluster_mode do PM2
      // engole o stdout/stderr dele — os logs ficavam zerados em disco.
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: 3333,
        SERVER_HOST: "0.0.0.0",
      },
      error_file: path.resolve(__dirname, "logs/backend-error.log"),
      out_file: path.resolve(__dirname, "logs/backend-out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      time: true,
      max_restarts: 25,
      restart_delay: 2000,
    },
  ],
};
