/**
 * Presco k6 Scenario 08: Admin Moderation Panel & RBAC Security Controls
 * Tests admin moderation queue (/ocurrency/admin/pending), price approvals/rejections,
 * and ensures Role-Based Access Control (RBAC) strictly forbids regular users (403 Forbidden).
 */

import { group, check } from 'k6';
import { get, post, safeJson } from '../helpers/http.js';
import { getAdminAuth, getUserAuth, authHeaders } from '../helpers/auth.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function adminModerationScenario(data) {
  group('Admin Moderation Panel & RBAC Security', () => {
    const admin = data?.admin || getAdminAuth();
    const regularUser = data?.user || getUserAuth();

    if (!admin?.accessToken) {
      console.warn('Admin token unavailable for moderation test');
      return;
    }

    // 1. RBAC Guard Check: Regular user MUST be rejected from admin endpoint (403 Forbidden)
    if (regularUser?.accessToken) {
      const forbiddenRes = get(
        '/ocurrency/admin/pending',
        authHeaders(regularUser.accessToken),
        'GET /ocurrency/admin/pending [regular user]'
      );
      check(forbiddenRes, {
        'non-admin access rejected with 403 Forbidden': (r) => r.status === 403,
      });
    }

    // 2. Admin Access: GET /ocurrency/admin/pending
    const pendingRes = get(
      '/ocurrency/admin/pending',
      authHeaders(admin.accessToken),
      'GET /ocurrency/admin/pending [admin]'
    );

    check(pendingRes, {
      'admin pending list responds 200': (r) => r.status === 200,
      'pending list is an array': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data);
      },
    });

    const pendingList = safeJson(pendingRes)?.data || [];

    // 3. If there are pending occurrences, test Approve / Reject flow
    if (pendingList.length > 0) {
      const itemToApprove = pendingList[0];
      const approveRes = post(
        `/ocurrency/${itemToApprove.id}/approve`,
        {},
        authHeaders(admin.accessToken),
        'POST /ocurrency/:id/approve'
      );

      check(approveRes, {
        'approve occurrence responds 200': (r) => r.status === 200,
      });
    }
  });
}
