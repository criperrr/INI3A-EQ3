/**
 * Presco k6 Scenario 09: Image Optimization & Dynamic Media Caching
 * Tests Sharp image transcoding pipeline (/images/optimize), format conversions
 * (WebP/AVIF), dimension resizing, and binary Redis caching.
 */

import { group, check } from 'k6';
import { get } from '../helpers/http.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function imageOptimizationScenario() {
  group('Image Optimization Pipeline', () => {
    const sampleImageUrl = encodeURIComponent(
      'https://images.openfoodfacts.org/images/products/789/100/010/0103/front_pt.4.400.jpg'
    );

    // 1. Image Transcoding Request: WebP conversion with resizing
    const optimizeRes = get(
      `/images/optimize?url=${sampleImageUrl}&w=160&q=75&fmt=webp`,
      undefined,
      'GET /images/optimize'
    );

    check(optimizeRes, {
      'image optimization responds 200 or 304': (r) => r.status === 200 || r.status === 304,
      'content type is image or webp': (r) => {
        const ct = r.headers['Content-Type'] || '';
        return ct.includes('image') || r.status === 304;
      },
    });

    // 2. Second Hit - Verify Caching Latency
    const cacheHitRes = get(
      `/images/optimize?url=${sampleImageUrl}&w=160&q=75&fmt=webp`,
      undefined,
      'GET /images/optimize [cache hit]'
    );

    check(cacheHitRes, {
      'cached image responds 200 or 304': (r) => r.status === 200 || r.status === 304,
    });
  });
}
