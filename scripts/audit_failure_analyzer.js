/**
 * Presco Nightly Audit - Application Bug Diagnostician
 * Analyzes execution artifacts to determine if a failure was caused by a real
 * application bug (server crash, HTTP 500, unhandled exception, or backend unit test regression)
 * vs a test infrastructure/network SLA/tooling glitch.
 *
 * Exit code 0: Real application bug detected (issue should be opened).
 * Exit code 1: No application bug found (do NOT open issue).
 */

const fs = require('node:fs');
const path = require('node:path');

function analyzeFailure() {
  const findings = [];

  // 1. Inspect backend runtime logs for crashes, 500s or unhandled exceptions
  const backendLogPath = path.resolve('backend-nightly.log');
  if (fs.existsSync(backendLogPath)) {
    const logContent = fs.readFileSync(backendLogPath, 'utf8');

    const fatalPatterns = [
      /500 Internal Server Error/i,
      /UnhandledPromiseRejection/i,
      /uncaughtException/i,
      /TypeError:/,
      /ReferenceError:/,
      /SyntaxError:/,
      /Database connection lost/i,
      /ECONNREFUSED 127\.0\.0\.1:5433/i,
      /FATAL:/i,
    ];

    for (const pattern of fatalPatterns) {
      const match = logContent.match(pattern);
      if (match) {
        const lines = logContent.split('\n');
        const matchIdx = lines.findIndex((l) => pattern.test(l));
        const snippet = lines
          .slice(Math.max(0, matchIdx - 2), Math.min(lines.length, matchIdx + 8))
          .join('\n');
        findings.push(
          `### [Backend Crash / 500 Error]\nPadrão '${match[0]}' detectado nos logs do servidor:\n\`\`\`\n${snippet}\n\`\`\``
        );
        break;
      }
    }
  }

  // 2. Inspect k6 summaries (smoke & stress) for HTTP 5xx responses (server errors)
  const summaryPaths = ['tests/k6/summary.json', 'tests/k6/stress_summary.json'];
  for (const sPath of summaryPaths) {
    const k6SummaryPath = path.resolve(sPath);
    if (fs.existsSync(k6SummaryPath)) {
      try {
        const k6Summary = JSON.parse(fs.readFileSync(k6SummaryPath, 'utf8'));
        const rawChecks = [];
        function collectChecks(group) {
          if (group.checks) rawChecks.push(...group.checks);
          if (group.groups) group.groups.forEach(collectChecks);
        }
        collectChecks(k6Summary.root_group || {});

        for (const check of rawChecks) {
          if (
            check.name &&
            (check.name.includes('500') || check.name.includes('502') || check.name.includes('503')) &&
            check.passes > 0
          ) {
            findings.push(
              `### [k6 HTTP 5xx Server Error (${sPath})]\nO k6 detectou resposta de erro de servidor no check: '${check.name}'`
            );
          }
        }
      } catch {
        // Ignored
      }
    }
  }

  // 3. Inspect backend unit/integration test results log if exists
  const backendTestLogPath = path.resolve('logs/backend-tests.log');
  if (fs.existsSync(backendTestLogPath)) {
    const testLog = fs.readFileSync(backendTestLogPath, 'utf8');
    if (/✖\s+/i.test(testLog) || /fail\s+[1-9]\d*/i.test(testLog)) {
      const failSnippet = testLog
        .split('\n')
        .filter((l) => /✖|fail|error/i.test(l))
        .slice(0, 8)
        .join('\n');
      findings.push(
        `### [Regressão em Testes Unitários/Integração do Backend]\nFalha em testes de lógica de negócio:\n\`\`\`\n${failSnippet}\n\`\`\``
      );
    }
  }

  return findings;
}

const findings = analyzeFailure();

if (findings.length > 0) {
  console.log('CONFIRMED_APPLICATION_BUG');
  const report = findings.join('\n\n');
  fs.writeFileSync('app-bug-report.md', report);
  process.exit(0);
} else {
  console.log('NO_APPLICATION_BUG');
  process.exit(1);
}
