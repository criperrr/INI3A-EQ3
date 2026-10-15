/**
 * Presco k6 Test Suite - SLA Thresholds & Metric Definitions
 */

export const SMOKE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // <1% failure rate
  http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% of requests under 400ms
};

export const LOAD_THRESHOLDS = {
  http_req_failed: ['rate<0.02'], // <2% failure rate under sustained load
  http_req_duration: ['p(90)<300', 'p(95)<500', 'p(99)<1200'],
  'http_req_duration{type:search}': ['p(95)<350'], // Searches should be fast due to Redis cache
  'http_req_duration{type:auth}': ['p(95)<600'],   // Hashing bcrypt takes ~80-150ms
};

export const STRESS_THRESHOLDS = {
  http_req_failed: ['rate<0.05'], // <5% failure under peak saturation
  http_req_duration: ['p(95)<1500'],
};
