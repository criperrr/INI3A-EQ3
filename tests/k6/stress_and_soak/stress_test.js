/**
 * Presco k6 Stress Test: Extreme Concurrency & Breaking Point Analysis
 * Ramps up traffic from 10 to 100+ concurrent Virtual Users to stress-test:
 * - PostgreSQL connection pool limits
 * - Redis cache-aside throughput
 * - Search rate limiter resilience (Redis atomic bucket)
 * - Compression and HTTP throughput
 */

import { group, check, sleep } from 'k6';
import { get, safeJson, expectedStatuses } from '../helpers/http.js';
import { randomItem } from '../helpers/generator.js';
import { STRESS_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Warm up
    { duration: '20s', target: 30 },  // Normal traffic
    { duration: '30s', target: 60 },  // Heavy peak traffic
    { duration: '20s', target: 100 }, // Stress breaking point
    { duration: '15s', target: 0 },   // Cool down & recovery
  ],
  thresholds: STRESS_THRESHOLDS,
};

const QUERIES = ['Arroz', 'Feijão', 'Azeite', 'Café', 'Sabão', 'Leite', 'Chocolate', 'Queijo'];

export default function stressTest() {
  group('High Concurrency Product Discovery', () => {
    // 1. High throughput catalog fetch
    const listRes = get('/products?page=1&limit=20', undefined, 'Stress: Catalog', {
      responseCallback: expectedStatuses(200, 429),
    });
    check(listRes, {
      'catalog responds': (r) => r.status === 200 || r.status === 429,
    });

    // 2. High throughput debounced search
    const query = randomItem(QUERIES);
    const searchRes = get(`/products?search=${encodeURIComponent(query)}&limit=10`, undefined, 'Stress: Search', {
      responseCallback: expectedStatuses(200, 429),
    });
    check(searchRes, {
      'search responds': (r) => r.status === 200 || r.status === 429,
    });

    // 3. Categories metadata
    const catRes = get('/products/categories', undefined, 'Stress: Categories', {
      responseCallback: expectedStatuses(200, 304, 429),
    });
    check(catRes, {
      'categories cached': (r) => r.status === 200 || r.status === 304 || r.status === 429,
    });

    sleep(0.3); // High frequency pacing
  });
}

export function handleSummary(data) {
  const failedRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const p95Duration = data.metrics.http_req_duration && data.metrics.http_req_duration.values['p(95)']
    ? data.metrics.http_req_duration.values['p(95)'].toFixed(2)
    : 0;
  const totalReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;

  return {
    'tests/k6/stress_summary.json': JSON.stringify(data, null, 2),
    stdout: `\n⚡ Presco k6 Stress Test Concluído!\n- Total de requisições sob estresse (até 100 VUs): ${totalReqs}\n- Taxa de Falhas: ${(failedRate * 100).toFixed(2)}%\n- Latência Média: ${avgDuration}ms\n- p(95): ${p95Duration}ms\n- Dados salvos em: tests/k6/stress_summary.json\n\n`,
  };
}
