import fs from "fs";
import path from "path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  ".next",
  "coverage",
]);

const VALID_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".sql",
]);

function estimateTokens(text) {
  return Math.ceil(text.length / 3.8);
}

function scanDirectory(dir, baseDir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name === "package-lock.json") continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (VALID_EXTENSIONS.has(ext)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n").length;
          const chars = content.length;
          const estTokens = estimateTokens(content);
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

          results.push({
            filePath: fullPath,
            relativePath,
            lines,
            chars,
            estTokens,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  return results;
}

function runAnalysis() {
  const rootDir = process.cwd();

  const frontendFiles = scanDirectory(path.join(rootDir, "src/frontend"), rootDir);
  const backendFiles = scanDirectory(path.join(rootDir, "src/backend"), rootDir);
  const agentsFiles = scanDirectory(path.join(rootDir, ".agents"), rootDir);
  const allFiles = [...frontendFiles, ...backendFiles, ...agentsFiles];

  const sumTokens = (files) => files.reduce((acc, f) => acc + f.estTokens, 0);
  const sumLines = (files) => files.reduce((acc, f) => acc + f.lines, 0);

  const totalTokens = sumTokens(allFiles);
  const frontendTokens = sumTokens(frontendFiles);
  const backendTokens = sumTokens(backendFiles);
  const agentsTokens = sumTokens(agentsFiles);

  allFiles.sort((a, b) => b.estTokens - a.estTokens);

  console.log(JSON.stringify({
    summary: {
      totalFiles: allFiles.length,
      totalLines: sumLines(allFiles),
      totalEstimatedTokens: totalTokens,
      breakdown: {
        frontend: { files: frontendFiles.length, lines: sumLines(frontendFiles), tokens: frontendTokens },
        backend: { files: backendFiles.length, lines: sumLines(backendFiles), tokens: backendTokens },
        agents: { files: agentsFiles.length, lines: sumLines(agentsFiles), tokens: agentsTokens },
      }
    },
    topHeavyFiles: allFiles.slice(0, 10).map(f => ({
      path: f.relativePath,
      lines: f.lines,
      estTokens: f.estTokens
    }))
  }, null, 2));
}

runAnalysis();
