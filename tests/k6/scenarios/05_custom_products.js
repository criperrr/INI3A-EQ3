/**
 * Presco k6 Scenario 05: Custom Product Creation & Catalog Management
 * Simulates user creating a new custom product (+25 XP), verifying instant
 * search indexing, and administrative update/deletion lifecycle.
 */

import { group, check } from 'k6';
import { get, post, put, del, safeJson } from '../helpers/http.js';
import { getAdminAuth, authHeaders } from '../helpers/auth.js';
import { generateProductPayload } from '../helpers/generator.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function customProductsScenario(data) {
  group('Custom Products Creation & Catalog Management', () => {
    const admin = data?.admin || getAdminAuth();
    if (!admin?.accessToken) {
      console.warn('Admin authentication required for custom product test');
      return;
    }

    // 1. Create a custom product (+25 XP)
    const payload = generateProductPayload();
    const createRes = post('/products/custom', payload, authHeaders(admin.accessToken), 'POST /products/custom');

    check(createRes, {
      'custom product created responds 201': (r) => r.status === 201,
      'returns created product with ID': (r) => {
        const json = safeJson(r);
        return Boolean(json?.data?.id && json?.data?.name === payload.name);
      },
    });

    const createdProduct = safeJson(createRes)?.data;
    if (!createdProduct?.id) return;

    // 2. Verify instant indexation in search results
    const encodedSearch = encodeURIComponent(payload.name);
    const searchRes = get(`/products?search=${encodedSearch}`, undefined, 'GET /products?search [custom]');
    check(searchRes, {
      'custom product immediately discoverable': (r) => {
        const json = safeJson(r);
        const items = json?.data?.items || [];
        return items.some((item) => item.id === createdProduct.id);
      },
    });

    // 3. Admin Update Product Details: PUT /products/:id
    const updateRes = put(
      `/products/${createdProduct.id}`,
      {
        name: `${payload.name} (Atualizado)`,
        category: payload.category,
        categories: payload.categories,
        brand: payload.brand,
        ean: payload.ean,
      },
      authHeaders(admin.accessToken),
      'PUT /products/:id'
    );

    check(updateRes, {
      'product update responds 200': (r) => r.status === 200,
    });

    // 4. Admin Delete Product (Clean up): DELETE /products/:id
    const deleteRes = del(
      `/products/${createdProduct.id}`,
      authHeaders(admin.accessToken),
      'DELETE /products/:id'
    );

    check(deleteRes, {
      'product deletion responds 200': (r) => r.status === 200,
    });
  });
}
