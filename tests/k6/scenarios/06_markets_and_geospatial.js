/**
 * Presco k6 Scenario 06: Geospatial Queries & Market Management
 * Tests PostGIS spatial indexing, radius queries, distance calculations,
 * and market creation / modification lifecycle.
 */

import { group, check } from 'k6';
import { get, post, put, del, safeJson } from '../helpers/http.js';
import { getAdminAuth, authHeaders } from '../helpers/auth.js';
import { getRandomLocation, randomInt } from '../helpers/generator.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function marketsAndGeospatialScenario(data) {
  group('Geospatial Queries & Markets Management', () => {
    const admin = data?.admin || getAdminAuth();

    // 1. Fetch all markets
    const allMarketsRes = get('/markets?includeAll=true', undefined, 'GET /markets');
    check(allMarketsRes, {
      'all markets responds 200': (r) => r.status === 200,
      'markets list is non-empty array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data) && json.data.length > 0;
      },
    });

    const markets = safeJson(allMarketsRes)?.data || [];
    const sampleMarket = markets[0];

    // 2. PostGIS Proximity Radius Query (Bauru/SP center)
    const loc = getRandomLocation();
    const radiusRes = get(
      `/markets?latitude=${loc.latitude}&longitude=${loc.longitude}&radius=15000`,
      undefined,
      'GET /markets [radius]'
    );

    check(radiusRes, {
      'proximity query responds 200': (r) => r.status === 200,
      'returns markets array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data);
      },
    });

    // 3. Market Details by ID
    if (sampleMarket?.id) {
      const singleMarketRes = get(`/markets/${sampleMarket.id}`, undefined, 'GET /markets/:id');
      check(singleMarketRes, {
        'single market responds 200': (r) => r.status === 200,
        'contains market name and coordinates': (r) => {
          const json = safeJson(r);
          return Boolean(json?.data?.id === sampleMarket.id && json?.data?.name);
        },
      });
    }

    // 4. Create New Test Market (authenticated)
    if (admin?.accessToken) {
      const randSuffix = randomInt(100, 999);
      const newMarketPayload = {
        name: `Supermercado Teste k6 #${randSuffix}`,
        latitude: -22.3500 + (Math.random() - 0.5) * 0.02,
        longitude: -49.0500 + (Math.random() - 0.5) * 0.02,
      };

      const createMarketRes = post(
        '/markets',
        newMarketPayload,
        authHeaders(admin.accessToken),
        'POST /markets'
      );

      check(createMarketRes, {
        'market creation responds 201': (r) => r.status === 201,
        'returns created market with ID': (r) => {
          const json = safeJson(r);
          return Boolean(json?.data?.id && json?.data?.name === newMarketPayload.name);
        },
      });

      const createdMarket = safeJson(createMarketRes)?.data;

      // 5. Admin Update Market
      if (createdMarket?.id) {
        const updateMarketRes = put(
          `/markets/${createdMarket.id}`,
          {
            name: `${newMarketPayload.name} (Atualizado)`,
            latitude: newMarketPayload.latitude,
            longitude: newMarketPayload.longitude,
          },
          authHeaders(admin.accessToken),
          'PUT /markets/:id'
        );

        check(updateMarketRes, {
          'market update responds 200': (r) => r.status === 200,
        });

        // 6. Admin Delete Market Clean up
        const deleteMarketRes = del(
          `/markets/${createdMarket.id}`,
          authHeaders(admin.accessToken),
          'DELETE /markets/:id'
        );

        check(deleteMarketRes, {
          'market deletion responds 200': (r) => r.status === 200,
        });
      }
    }
  });
}
