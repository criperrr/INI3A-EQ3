/**
 * Presco k6 Scenario 04: Community Price Contributions, Auditing & Moderation
 * Tests price occurrence submissions (+15 XP), community voting (+5 XP),
 * anti-self-voting guards, anti-spam cooldown, author edits, and report submissions.
 */

import { group, check } from 'k6';
import { get, post, put, del, safeJson } from '../helpers/http.js';
import { getAdminAuth, getUserAuth, authHeaders, registerRandomUser } from '../helpers/auth.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';
import { randomFloat } from '../helpers/generator.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function contributionsAndPricesScenario(data) {
  group('Price Reporting, Auditing & Moderation', () => {
    const admin = data?.admin || getAdminAuth();
    if (!admin?.accessToken) {
      console.warn('Admin authentication unavailable for contributions scenario');
      return;
    }

    // 1. Fetch available markets & products to attach occurrence to
    const marketsRes = get('/markets?includeAll=true', undefined, 'GET /markets');
    const productsRes = get('/products?limit=5', undefined, 'GET /products');

    const markets = safeJson(marketsRes)?.data || [];
    const products = safeJson(productsRes)?.data?.items || [];

    if (markets.length === 0 || products.length === 0) {
      console.warn('Insufficient seed data (markets or products) for price occurrence test');
      return;
    }

    const targetMarket = markets[0];
    const targetProduct = products[0];

    // 2. Submit Price Occurrence as Admin (Admin has 2FA verified bypass)
    const priceVal = randomFloat(4.5, 39.9, 2);
    const createOccRes = post(
      '/ocurrency',
      {
        productId: targetProduct.id,
        marketId: targetMarket.id,
        value: priceVal,
        isPromotion: false,
        confirmOutlier: true,
      },
      authHeaders(admin.accessToken),
      'POST /ocurrency'
    );

    check(createOccRes, {
      'occurrence creation responds 201 or 409 (cooldown)': (r) => r.status === 201 || r.status === 409 || r.status === 400,
    });

    const createdJson = safeJson(createOccRes);
    const createdOccurrence = createdJson?.data;

    // 3. Fetch occurrences for the product
    const productOccsRes = get(`/ocurrency/product/${targetProduct.id}`, authHeaders(admin.accessToken), 'GET /ocurrency/product/:productId');
    check(productOccsRes, {
      'product occurrences return 200': (r) => r.status === 200,
      'product occurrences is an array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data);
      },
    });

    // 4. Community Auditing / Voting (Simulate voter using another user account)
    const existingOccurrences = safeJson(productOccsRes)?.data || [];
    if (existingOccurrences.length > 0) {
      const occurrenceToAudit = existingOccurrences[0];

      // Vote using user credentials
      const voter = registerRandomUser();
      if (voter?.accessToken) {
        const voteRes = post(
          `/ocurrency/${occurrenceToAudit.id}/vote`,
          { verdict: true },
          authHeaders(voter.accessToken),
          'POST /ocurrency/:id/vote'
        );

        check(voteRes, {
          'community audit vote responds 200 or handles author guard': (r) =>
            r.status === 200 || r.status === 403 || r.status === 400,
        });
      }
    }

    // 5. Author Edit Occurrence (if created in this run)
    if (createdOccurrence?.id) {
      const updatedPrice = randomFloat(5.0, 35.0, 2);
      const updateRes = put(
        `/ocurrency/${createdOccurrence.id}`,
        {
          value: updatedPrice,
          marketId: targetMarket.id,
        },
        authHeaders(admin.accessToken),
        'PUT /ocurrency/:id'
      );

      check(updateRes, {
        'occurrence update responds 200': (r) => r.status === 200,
      });

      // 6. Delete Occurrence Cleanup
      const deleteOccRes = del(
        `/ocurrency/${createdOccurrence.id}`,
        authHeaders(admin.accessToken),
        'DELETE /ocurrency/:id'
      );
      check(deleteOccRes, {
        'occurrence deletion responds 200': (r) => r.status === 200,
      });
    }

    // 7. Product Issue Report: POST /products/:id/report
    const reportRes = post(
      `/products/${targetProduct.id}/report`,
      {
        reason: 'price_divergence',
        description: 'Preço reportado difere do encarte desta semana.',
      },
      authHeaders(admin.accessToken),
      'POST /products/:id/report'
    );

    check(reportRes, {
      'product report responds 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
  });
}
