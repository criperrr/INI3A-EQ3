/**
 * Presco k6 Stress Test: Extreme Concurrency & Breaking Point Analysis
 * Ramps up traffic from 10 to 100+ concurrent Virtual Users to stress-test:
 * - PostgreSQL connection pool limits
 * - Redis cache-aside throughput
 * - Search rate limiter resilience (Redis atomic bucket)
 * - Compression and HTTP throughput
 */

import { group, check, sleep } from 'k6';
import { get, safeJson } from '../helpers/http.js';
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
    const listRes = get('/products?page=1&limit=20', undefined, 'Stress: Catalog');
    check(listRes, {
      'catalog responds': (r) => r.status === 200 || r.status === 429,
    });

    // 2. High throughput debounced search
    const query = randomItem(QUERIES);
    const searchRes = get(`/products?search=${query}&limit=10`, undefined, 'Stress: Search');
    check(searchRes, {
      'search responds': (r) => r.status === 200 || r.status === 429,
    });

    // 3. Categories metadata
    const catRes = get('/products/categories', undefined, 'Stress: Categories');
    check(catRes, {
      'categories cached': (r) => r.status === 200 || r.status === 304,
    });

    sleep(0.3); // High frequency pacing
  });
}
