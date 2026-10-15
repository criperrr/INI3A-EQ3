/**
 * Presco k6 Scenario 01: Health & System Diagnostics
 * Verifies system availability, PostGIS database connection, Redis status, and HTTP security headers
 */

import { group, check } from 'k6';
import { get, safeJson } from '../helpers/http.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function healthAndSystemScenario() {
  group('System & Health Endpoints', () => {
    // 1. GET /health
    const healthRes = get('/health', undefined, 'GET /health');
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'database is connected': (r) => {
        const json = safeJson(r);
        return json && json.database === 'connected';
      },
      'redis is active': (r) => {
        const json = safeJson(r);
        return json && (json.redis === 'connected' || json.redis === 'in-memory-fallback');
      },
      'has security headers (nosniff & DENY)': (r) => {
        const h = r.headers;
        return (
          h['X-Content-Type-Options'] === 'nosniff' &&
          h['X-Frame-Options'] === 'DENY'
        );
      },
    });

    // 2. GET /ping
    const pingRes = get('/ping', undefined, 'GET /ping');
    check(pingRes, {
      'ping status is 200': (r) => r.status === 200,
    });

    // 3. GET /api/v1
    const apiRes = get('/api/v1', undefined, 'GET /api/v1');
    check(apiRes, {
      'api/v1 is running': (r) => r.status === 200,
    });
  });
}
