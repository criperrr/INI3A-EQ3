/**
 * Presco k6 Aggressive Stress Test: Extreme Concurrency & Multi-Vector Breaking Point Analysis
 * Ramps up traffic from 10 to 100+ concurrent Virtual Users to stress-test:
 * 1. Combinatorial Cart Optimizer (Haversine distance, multi-store solver, route synthesis)
 * 2. Community Price Contributions & Adaptive Z-Score Outlier Engine
 * 3. Atomic Voting Quorum & Lost-Update Prevention
 * 4. PostGIS Geospatial Radius Indexing & Trigram Search Engine
 * 5. PostgreSQL connection pool limits & Redis cache-aside resilience
 */

import { group, check, sleep } from 'k6';
import { get, post, safeJson, expectedStatuses } from '../helpers/http.js';
import { getAdminAuth, getUserAuth, authHeaders } from '../helpers/auth.js';
import { randomItem, randomFloat, getRandomLocation } from '../helpers/generator.js';
import { STRESS_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Warm up
    { duration: '20s', target: 35 },  // Heavy sustained load
    { duration: '25s', target: 70 },  // Peak traffic saturation
    { duration: '20s', target: 100 }, // Breaking point stress testing
    { duration: '15s', target: 0 },   // Graceful cool down & recovery
  ],
  thresholds: STRESS_THRESHOLDS,
};

const SEARCH_QUERIES = [
  'Arroz',
  'Feijão',
  'Azeite',
  'Café',
  'Sabão',
  'Leite',
  'Chocolate',
  'Queijo',
  'Açúcar',
  'Óleo',
  'Detergente',
  'Frango',
];

const OPTIMIZATION_STRATEGIES = ['max_savings', 'balanced', 'single_store'];

export function setup() {
  const admin = getAdminAuth();
  const user = getUserAuth();

  // Pre-fetch available catalog and markets for realistic dynamic payload synthesis
  const marketsRes = get('/markets?includeAll=true', undefined, 'Setup: Markets');
  const productsRes = get('/products?limit=40', undefined, 'Setup: Products');

  const markets = safeJson(marketsRes)?.data || [];
  const products = safeJson(productsRes)?.data?.items || [];

  return { admin, user, markets, products };
}

export default function aggressiveStressTest(data) {
  const actionSelector = (__VU + __ITER) % 4;

  if (actionSelector === 0) {
    // Vector 1: Combinatorial Cart Optimizer (CPU, Memory & PostGIS Geometry Bound)
    group('Stress: Combinatorial Cart Optimizer', () => {
      const productPool = data.products.length > 0 ? data.products : [{ id: 1 }, { id: 2 }];
      const itemCount = Math.min(Math.floor(Math.random() * 5) + 3, productPool.length);
      const selectedItems = [];

      for (let i = 0; i < itemCount; i++) {
        const p = productPool[(i * 3 + __ITER) % productPool.length];
        if (p?.id && !selectedItems.some((item) => item.productId === p.id)) {
          selectedItems.push({
            productId: p.id,
            quantity: Math.floor(Math.random() * 3) + 1,
          });
        }
      }

      const consumerLoc = getRandomLocation();
      const strategy = randomItem(OPTIMIZATION_STRATEGIES);

      const payload = {
        items: selectedItems,
        userLocation: consumerLoc,
        vehicleSettings: {
          fuelEfficiency: 10.5,
          fuelPrice: 5.89,
          isRoundTrip: true,
        },
        preferences: {
          strategy: strategy,
          maxStops: Math.floor(Math.random() * 3) + 2,
          maxRadiusKm: 15,
        },
      };

      const optRes = post('/cart/optimize', payload, undefined, 'POST /cart/optimize', {
        responseCallback: expectedStatuses(200, 400, 429),
      });

      check(optRes, {
        'optimizer responds without server 500 error': (r) => r.status < 500,
        'optimizer response valid': (r) => r.status === 200 || r.status === 400 || r.status === 429,
      });

      sleep(0.4);
    });
  } else if (actionSelector === 1) {
    // Vector 2: Community Price Contributions & Z-Score Outlier Engine (DB Writes & Variance Analysis)
    group('Stress: Price Contributions & Outlier Defense', () => {
      const adminAuth = data.admin?.accessToken ? authHeaders(data.admin.accessToken) : undefined;
      const product = data.products.length > 0 ? randomItem(data.products) : { id: 1 };
      const market = data.markets.length > 0 ? randomItem(data.markets) : { id: 1 };

      // 75% realistic normal prices, 25% extreme values to challenge variance floor and Z-Score isolation
      const isExtreme = Math.random() < 0.25;
      const price = isExtreme
        ? Math.random() < 0.5
          ? 0.75
          : 599.9
        : randomFloat(3.9, 49.9, 2);

      const payload = {
        productId: product.id,
        marketId: market.id,
        value: price,
        isPromotion: Math.random() < 0.3,
        confirmOutlier: isExtreme,
      };

      const occRes = post('/ocurrency', payload, adminAuth, 'POST /ocurrency', {
        responseCallback: expectedStatuses(200, 201, 400, 409, 422, 429),
      });

      check(occRes, {
        'price contribution responds without server 500 error': (r) => r.status < 500,
        'price contribution handled consistently': (r) =>
          r.status === 201 ||
          r.status === 200 ||
          r.status === 400 ||
          r.status === 409 ||
          r.status === 422 ||
          r.status === 429,
      });

      sleep(0.5);
    });
  } else if (actionSelector === 2) {
    // Vector 3: Atomic Voting Quorum & Lost-Update Prevention
    group('Stress: Community Voting & Quorum', () => {
      const product = data.products.length > 0 ? randomItem(data.products) : { id: 1 };
      const occListRes = get(`/ocurrency/product/${product.id}`, undefined, 'GET /ocurrency/product/:id');

      check(occListRes, {
        'product occurrences list responds without 500': (r) => r.status < 500,
      });

      const occData = safeJson(occListRes)?.data;
      const occurrences = Array.isArray(occData) ? occData : occData?.occurrences || [];

      if (occurrences.length > 0) {
        const targetOcc = randomItem(occurrences);
        const userAuth = data.user?.accessToken ? authHeaders(data.user.accessToken) : undefined;

        const voteRes = post(
          `/ocurrency/${targetOcc.id}/vote`,
          { verdict: Math.random() > 0.2 },
          userAuth,
          'POST /ocurrency/:id/vote',
          { responseCallback: expectedStatuses(200, 400, 401, 403, 409, 429) }
        );

        check(voteRes, {
          'vote responds without server 500 error': (r) => r.status < 500,
          'vote handled correctly': (r) =>
            r.status === 200 ||
            r.status === 400 ||
            r.status === 401 ||
            r.status === 403 ||
            r.status === 409 ||
            r.status === 429,
        });
      }

      sleep(0.3);
    });
  } else {
    // Vector 4: Trigram Search & Geospatial Radius Lookups (GIN & GiST Indexes)
    group('Stress: Trigram Search & Geospatial Lookups', () => {
      const query = randomItem(SEARCH_QUERIES);
      const searchRes = get(
        `/products?search=${encodeURIComponent(query)}&limit=15`,
        undefined,
        'GET /products?search',
        { responseCallback: expectedStatuses(200, 429) }
      );

      check(searchRes, {
        'search responds without server 500 error': (r) => r.status < 500,
        'search responds 200 or 429': (r) => r.status === 200 || r.status === 429,
      });

      const radius = randomItem([5000, 10000, 15000, 25000]);
      const marketRes = get(
        `/markets?lat=-22.3145&lng=-49.0587&radius=${radius}`,
        undefined,
        'GET /markets?radius',
        { responseCallback: expectedStatuses(200, 429) }
      );

      check(marketRes, {
        'geospatial radar responds without server 500 error': (r) => r.status < 500,
        'geospatial radar responds 200 or 429': (r) => r.status === 200 || r.status === 429,
      });

      sleep(0.3);
    });
  }
}

export function handleSummary(data) {
  const failedRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const p95Duration =
    data.metrics.http_req_duration && data.metrics.http_req_duration.values['p(95)']
      ? data.metrics.http_req_duration.values['p(95)'].toFixed(2)
      : 0;
  const totalReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;

  return {
    'tests/k6/stress_summary.json': JSON.stringify(data, null, 2),
    stdout: `\n[OK] Presco k6 Aggressive Stress Test Concluído com Sucesso!\n- Total de requisições sob estresse multi-vetorial (até 100 VUs): ${totalReqs}\n- Taxa de Falhas: ${(failedRate * 100).toFixed(2)}%\n- Latência Média: ${avgDuration}ms\n- p(95): ${p95Duration}ms\n- Vetores executados: Otimizador de Carrinho, Outliers Z-Score, Quórum Atômico e PostGIS\n- Relatório salvo em: tests/k6/stress_summary.json\n\n`,
  };
}
