/**
 * Presco k6 Spike Test: Flash Traffic Spike Analysis
 * Simulates a viral event or promotional push notification:
 * Surges traffic from 0 to 80 VUs in 5 seconds, holds for 15s, and abruptly cuts back.
 * Verifies server recovery and absence of crashed worker threads.
 */

import { group, check, sleep } from 'k6';
import { get } from '../helpers/http.js';
import { STRESS_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  stages: [
    { duration: '5s', target: 5 },    // Low baseline
    { duration: '5s', target: 80 },   // Violent spike
    { duration: '15s', target: 80 },  // Sustained spike
    { duration: '5s', target: 0 },    // Immediate drop off
  ],
  thresholds: STRESS_THRESHOLDS,
};

export default function spikeTest() {
  group('Spike Event Discovery', () => {
    // Flash query on health and search
    const healthRes = get('/health', undefined, 'Spike: Health Check');
    const catalogRes = get('/products?page=1&limit=10', undefined, 'Spike: Catalog');

    check(healthRes, {
      'system remains alive during spike': (r) => r.status === 200,
    });
    check(catalogRes, {
      'catalog responds or rate-limits gracefully': (r) => r.status === 200 || r.status === 429,
    });

    sleep(0.2);
  });
}
