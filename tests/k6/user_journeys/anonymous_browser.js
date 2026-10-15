/**
 * Presco k6 User Journey: Anonymous Guest Shopper
 * Simulates a consumer opening the app without logging in:
 * - Checks API health and catalog feed
 * - Browses products by category
 * - Searches for everyday groceries
 * - Views detailed price comparisons across markets
 * - Examines price history graph
 * - Includes realistic think times (sleep 1-2s)
 */

import { group, check, sleep } from 'k6';
import { get, safeJson } from '../helpers/http.js';
import { getRandomLocation, randomItem } from '../helpers/generator.js';

export const options = {
  vus: 3,
  duration: '15s',
};

const GROCERY_SEARCH_QUERIES = ['Arroz', 'Feijão', 'Leite', 'Café', 'Açúcar', 'Óleo'];

export default function anonymousBrowserJourney() {
  group('User Journey: Anonymous Shopper', () => {
    // Step 1: App launch - load initial catalog and categories
    const categoriesRes = get('/products/categories', undefined, 'Guest: Categories');
    const catalogRes = get('/products?page=1&limit=20', undefined, 'Guest: Initial Catalog');

    check(catalogRes, {
      'guest catalog loaded': (r) => r.status === 200,
    });
    sleep(1);

    // Step 2: Search for a specific staple grocery item
    const query = randomItem(GROCERY_SEARCH_QUERIES);
    const searchRes = get(`/products?search=${query}&limit=10`, undefined, 'Guest: Search Product');
    
    check(searchRes, {
      'guest search succeeded': (r) => r.status === 200,
    });
    sleep(1.5);

    // Step 3: Open details of the first search result
    const searchItems = safeJson(searchRes)?.data?.items || [];
    if (searchItems.length > 0) {
      const selectedProduct = searchItems[0];
      
      const detailRes = get(`/products/${selectedProduct.id}`, undefined, 'Guest: Product Details');
      const historyRes = get(`/products/${selectedProduct.id}/history`, undefined, 'Guest: Price History');
      const occurrencesRes = get(`/ocurrency/product/${selectedProduct.id}`, undefined, 'Guest: Market Occurrences');

      check(detailRes, {
        'guest product details loaded': (r) => r.status === 200,
      });
      check(historyRes, {
        'guest price history loaded': (r) => r.status === 200,
      });
      check(occurrencesRes, {
        'guest market occurrences loaded': (r) => r.status === 200,
      });
    }
    sleep(1);

    // Step 4: Check nearby markets map
    const loc = getRandomLocation();
    const mapMarketsRes = get(
      `/markets?latitude=${loc.latitude}&longitude=${loc.longitude}&radius=15000`,
      undefined,
      'Guest: Nearby Markets'
    );
    check(mapMarketsRes, {
      'guest nearby markets loaded': (r) => r.status === 200,
    });
    sleep(1.5);
  });
}
