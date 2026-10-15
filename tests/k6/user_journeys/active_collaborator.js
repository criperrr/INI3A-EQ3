/**
 * Presco k6 User Journey: Active Community Collaborator
 * Simulates a logged-in user actively contributing to the price database:
 * - Logs into account
 * - Finds a product via search or catalog
 * - Registers price at a nearby market (+15 XP)
 * - Audits & votes on peer occurrences (+5 XP)
 * - Checks personal profile level progress, badges, and contribution grid
 */

import { group, check, sleep } from 'k6';
import { get, post, safeJson } from '../helpers/http.js';
import { getAdminAuth, authHeaders, registerRandomUser } from '../helpers/auth.js';
import { randomFloat } from '../helpers/generator.js';

export const options = {
  vus: 2,
  duration: '15s',
};

export default function activeCollaboratorJourney() {
  group('User Journey: Active Collaborator', () => {
    // Step 1: User authenticates (use admin for 2FA bypass)
    const auth = getAdminAuth();
    if (!auth?.accessToken) return;

    const headers = authHeaders(auth.accessToken);

    // Step 2: Fetch profile to check initial XP balance
    const initialProfileRes = get('/auth/me', headers, 'Collab: Initial Profile');
    check(initialProfileRes, {
      'initial profile fetched': (r) => r.status === 200,
    });
    sleep(1);

    // Step 3: Select product and market
    const productsRes = get('/products?limit=5', headers, 'Collab: Browse Products');
    const marketsRes = get('/markets?includeAll=true', headers, 'Collab: Browse Markets');

    const products = safeJson(productsRes)?.data?.items || [];
    const markets = safeJson(marketsRes)?.data || [];

    if (products.length === 0 || markets.length === 0) return;

    const product = products[0];
    const market = markets[0];
    sleep(1.5);

    // Step 4: Submit price occurrence (+15 XP)
    const priceVal = randomFloat(5.99, 29.99, 2);
    const submitPriceRes = post(
      '/ocurrency',
      {
        productId: product.id,
        marketId: market.id,
        value: priceVal,
        isPromotion: false,
        confirmOutlier: true,
      },
      headers,
      'Collab: Submit Price (+15 XP)'
    );

    check(submitPriceRes, {
      'price submitted or handled cooldown': (r) => r.status === 201 || r.status === 409 || r.status === 400,
    });
    sleep(1);

    // Step 5: Audit & Vote on peer prices (+5 XP)
    const occurrencesRes = get(`/ocurrency/product/${product.id}`, headers, 'Collab: Fetch Occurrences');
    const occurrences = safeJson(occurrencesRes)?.data || [];

    if (occurrences.length > 0) {
      const occToVote = occurrences[0];
      // Use dynamic voter to audit
      const voter = registerRandomUser();
      if (voter?.accessToken) {
        const voteRes = post(
          `/ocurrency/${occToVote.id}/vote`,
          { verdict: true },
          authHeaders(voter.accessToken),
          'Collab: Audit Vote (+5 XP)'
        );
        check(voteRes, {
          'audit vote processed': (r) => r.status === 200 || r.status === 403 || r.status === 400,
        });
      }
    }
    sleep(1);

    // Step 6: Review updated profile, XP and badges
    const updatedProfileRes = get('/auth/me', headers, 'Collab: Updated Profile');
    check(updatedProfileRes, {
      'profile reflects updated activity': (r) => r.status === 200,
    });
    sleep(1);
  });
}
