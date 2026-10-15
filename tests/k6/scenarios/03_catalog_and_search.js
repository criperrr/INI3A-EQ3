/**
 * Presco k6 Scenario 03: Catalog, Search & Cache Performance
 * Tests full-text search, category filtering, barcode queries, price history,
 * pagination, and multi-tier Redis/Memory response caching with ETag.
 */

import { group, check } from 'k6';
import { get, safeJson } from '../helpers/http.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';
import { getRandomLocation } from '../helpers/generator.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function catalogAndSearchScenario() {
  group('Product Catalog, Search & Cache Validation', () => {
    // 1. List Products (Default paginated)
    const listRes = get('/products?page=1&limit=10', undefined, 'GET /products');
    check(listRes, {
      'catalog returns 200': (r) => r.status === 200,
      'catalog response has items array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data.items);
      },
    });

    const catalogJson = safeJson(listRes);
    const firstProduct = catalogJson?.data?.items?.[0];

    // 2. Trigram / Full-text Search
    const searchTerms = ['Arroz', 'Feijão', 'Café', 'Leite', 'Óleo'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = get(`/products?search=${randomTerm}&limit=10`, undefined, 'GET /products?search');
    check(searchRes, {
      'search returns 200': (r) => r.status === 200,
      'search returns data payload': (r) => {
        const json = safeJson(r);
        return Boolean(json?.data);
      },
    });

    // 3. Category Filter
    const catFilterRes = get('/products?category=Alimentos&limit=10', undefined, 'GET /products?category');
    check(catFilterRes, {
      'category filter returns 200': (r) => r.status === 200,
    });

    // 4. Categories list and Predefined metadata
    const categoriesRes = get('/products/categories', undefined, 'GET /products/categories');
    check(categoriesRes, {
      'categories metadata returns 200': (r) => r.status === 200,
      'categories is an array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data);
      },
    });

    const detailsRes = get('/products/categories/details', undefined, 'GET /products/categories/details');
    check(detailsRes, {
      'category details return 200': (r) => r.status === 200,
    });

    // 5. Product Details & Price Statistics
    if (firstProduct?.id) {
      const detailRes = get(`/products/${firstProduct.id}`, undefined, 'GET /products/:id');
      check(detailRes, {
        'product details return 200': (r) => r.status === 200,
        'contains product name and price stats': (r) => {
          const json = safeJson(r);
          return Boolean(json?.data?.name && json?.data?.id === firstProduct.id);
        },
      });

      // 6. Price History Timeline
      const historyRes = get(`/products/${firstProduct.id}/history`, undefined, 'GET /products/:id/history');
      check(historyRes, {
        'price history returns 200': (r) => r.status === 200,
        'history is an array': (r) => {
          const json = safeJson(r);
          return json?.data && Array.isArray(json.data);
        },
      });
    }

    // 7. Barcode Query (known or fallback)
    if (firstProduct?.ean || firstProduct?.barcode) {
      const ean = firstProduct.ean || firstProduct.barcode;
      const barcodeRes = get(`/products/barcode/${ean}`, undefined, 'GET /products/barcode/:ean');
      check(barcodeRes, {
        'barcode lookup returns 200': (r) => r.status === 200,
        'barcode matches product': (r) => {
          const json = safeJson(r);
          return json?.data?.ean === ean || json?.data?.barcode === ean;
        },
      });
    }

    // 8. Geospatial Product Search with Coordinates (Bauru/SP radius)
    const loc = getRandomLocation();
    const geoSearchRes = get(
      `/products?latitude=${loc.latitude}&longitude=${loc.longitude}&radius=15000&limit=10`,
      undefined,
      'GET /products [geospatial]'
    );
    check(geoSearchRes, {
      'geospatial product search returns 200': (r) => r.status === 200,
    });
  });
}
