/**
 * Presco k6 Master Test Suite Orchestrator
 * Runs all modular scenarios across the backend API:
 * 1. Health & System
 * 2. Auth Lifecycle
 * 3. Catalog & Search
 * 4. Contributions & Prices
 * 5. Custom Products
 * 6. Markets & Geospatial
 * 7. Gamification & Customization Shop
 * 8. Admin Moderation & RBAC
 * 9. Image Optimization
 *
 * Exports detailed HTML report and JSON summary.
 */

import { group, sleep } from 'k6';
import healthAndSystemScenario from './scenarios/01_health_and_system.js';
import authLifecycleScenario from './scenarios/02_auth_lifecycle.js';
import catalogAndSearchScenario from './scenarios/03_catalog_and_search.js';
import contributionsAndPricesScenario from './scenarios/04_contributions_and_prices.js';
import customProductsScenario from './scenarios/05_custom_products.js';
import marketsAndGeospatialScenario from './scenarios/06_markets_and_geospatial.js';
import gamificationAndShopScenario from './scenarios/07_gamification_and_shop.js';
import adminModerationScenario from './scenarios/08_admin_moderation.js';
import imageOptimizationScenario from './scenarios/09_image_optimization.js';
import { SMOKE_THRESHOLDS } from './config/thresholds.js';
import { CURRENT_ENV } from './config/environments.js';
import { getAdminAuth, getUserAuth } from './helpers/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: SMOKE_THRESHOLDS,
};

export function setup() {
  const admin = getAdminAuth();
  const user = getUserAuth();
  return { admin, user };
}

export default function masterTestSuite(data) {
  console.log(`🚀 Executing Presco k6 Test Suite against: ${CURRENT_ENV.name} (${CURRENT_ENV.baseUrl})`);

  // Scenario 1: Health & System Diagnostics
  healthAndSystemScenario();
  sleep(0.5);

  // Scenario 2: Full Auth Lifecycle
  authLifecycleScenario();
  sleep(0.5);

  // Scenario 3: Catalog & Search
  catalogAndSearchScenario();
  sleep(0.5);

  // Scenario 4: Price Contributions & Auditing
  contributionsAndPricesScenario(data);
  sleep(0.5);

  // Scenario 5: Custom Products
  customProductsScenario(data);
  sleep(0.5);

  // Scenario 6: Markets & Geospatial
  marketsAndGeospatialScenario(data);
  sleep(0.5);

  // Scenario 7: Gamification & Shop
  gamificationAndShopScenario(data);
  sleep(0.5);

  // Scenario 8: Admin Moderation & RBAC
  adminModerationScenario(data);
  sleep(0.5);

  // Scenario 9: Image Optimization
  imageOptimizationScenario();
}

/**
 * Generates an HTML report and terminal summary after execution completes
 */
export function handleSummary(data) {
  const failedRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const p95Duration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0;
  const totalReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Testes k6 - Presco API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
    .card { background: #1E293B; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155; }
    h1 { color: #38BDF8; margin-top: 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
    .metric-card { background: #0F172A; border-radius: 8px; padding: 16px; border: 1px solid #334155; }
    .metric-value { font-size: 28px; font-weight: bold; color: #10B981; }
    .metric-label { font-size: 13px; color: #94A3B8; text-transform: uppercase; margin-top: 4px; }
    .status-ok { color: #10B981; }
    .status-warn { color: #F59E0B; }
    .status-error { color: #EF4444; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📊 Relatório de Testes de Carga & Funcionais - Presco (Grafana k6)</h1>
    <p>Ambiente: <strong>${CURRENT_ENV.name}</strong> (${CURRENT_ENV.baseUrl})</p>
    <p>Data do teste: <strong>${new Date().toISOString()}</strong></p>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${totalReqs}</div>
        <div class="metric-label">Total de Requisições</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${failedRate < 0.01 ? 'status-ok' : 'status-error'}">${(failedRate * 100).toFixed(2)}%</div>
        <div class="metric-label">Taxa de Falhas</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${avgDuration} ms</div>
        <div class="metric-label">Latência Média</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${p95Duration < 400 ? 'status-ok' : 'status-warn'}">${p95Duration} ms</div>
        <div class="metric-label">Latência p(95)</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return {
    'tests/k6/report.html': htmlContent,
    'tests/k6/summary.json': JSON.stringify(data, null, 2),
    stdout: `\n✅ Presco k6 Test Suite Concluída!\n- Requisições: ${totalReqs}\n- Latência Média: ${avgDuration}ms\n- p(95): ${p95Duration}ms\n- Falhas: ${(failedRate * 100).toFixed(2)}%\n- Relatório HTML salvo em: tests/k6/report.html\n\n`,
  };
}
