/**
 * Presco k6 Scenario 02: Full Auth Lifecycle & Security Verification
 * Simulates complete user registration, authentication, token rotation,
 * profile retrieval, password alteration, 2FA code generation, logout & cleanup.
 */

import { group, check, sleep } from 'k6';
import { get, post, safeJson } from '../helpers/http.js';
import { authHeaders, login, registerRandomUser } from '../helpers/auth.js';
import { generateUserPayload } from '../helpers/generator.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environments.js';
import http from 'k6/http';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function authLifecycleScenario() {
  group('Authentication Lifecycle & Security', () => {
    // 1. Register a fresh unique user
    const userPayload = generateUserPayload();
    const regRes = post('/auth/register', userPayload, undefined, 'POST /auth/register');
    
    check(regRes, {
      'register responds 201': (r) => r.status === 201,
      'register returns access and refresh tokens': (r) => {
        const json = safeJson(r);
        return Boolean(json?.data?.accessToken && json?.data?.refreshToken);
      },
    });

    const regData = safeJson(regRes)?.data;
    if (!regData) return;

    let accessToken = regData.accessToken;
    let refreshToken = regData.refreshToken;

    // 2. Conflict: Duplicate registration attempt with same email
    const duplicateRes = post('/auth/register', userPayload, undefined, 'POST /auth/register [duplicate]');
    check(duplicateRes, {
      'duplicate email rejected with 409 Conflict': (r) => r.status === 409,
    });

    // 3. Login with invalid password
    const invalidLoginRes = post('/auth/login', {
      email: userPayload.email,
      password: 'WrongPassword999!',
    }, undefined, 'POST /auth/login [invalid]');
    check(invalidLoginRes, {
      'invalid password rejected with 401 Unauthorized': (r) => r.status === 401,
    });

    // 4. Login with valid credentials
    const validLoginRes = post('/auth/login', {
      email: userPayload.email,
      password: userPayload.password,
    }, undefined, 'POST /auth/login [valid]');
    check(validLoginRes, {
      'valid login responds 200': (r) => r.status === 200,
      'login returns user role and identity': (r) => {
        const json = safeJson(r);
        return json?.data?.user?.email === userPayload.email;
      },
    });

    // 5. Token rotation: POST /auth/refresh
    const refreshRes = post('/auth/refresh', { refreshToken }, undefined, 'POST /auth/refresh');
    check(refreshRes, {
      'refresh returns 200': (r) => r.status === 200,
      'refresh provides new access token': (r) => {
        const json = safeJson(r);
        return Boolean(json?.data?.accessToken);
      },
    });

    const refreshedData = safeJson(refreshRes)?.data;
    if (refreshedData?.accessToken) {
      accessToken = refreshedData.accessToken;
      if (refreshedData.refreshToken) refreshToken = refreshedData.refreshToken;
    }

    // 6. Authenticated Profile: GET /auth/me
    const meRes = get('/auth/me', authHeaders(accessToken), 'GET /auth/me');
    check(meRes, {
      'profile responds 200': (r) => r.status === 200,
      'profile returns name and points balance': (r) => {
        const json = safeJson(r);
        return json?.data?.email === userPayload.email && json?.data?.points !== undefined;
      },
    });

    // 7. Request 2FA code generation: POST /auth/2fa/send
    const send2FARes = post('/auth/2fa/send', {}, authHeaders(accessToken), 'POST /auth/2fa/send');
    check(send2FARes, {
      '2fa send responds with success or rate-limit status': (r) => r.status === 200 || r.status === 429,
    });

    // 8. Password Modification: PATCH /auth/password
    const newPassword = userPayload.password + '_updated';
    const changePassRes = http.patch(
      `${BASE_URL}/auth/password`,
      JSON.stringify({
        currentPassword: userPayload.password,
        newPassword: newPassword,
      }),
      {
        headers: authHeaders(accessToken),
        tags: { name: 'PATCH /auth/password' },
      }
    );
    check(changePassRes, {
      'password change responds 200': (r) => r.status === 200,
    });

    // 9. Logout: POST /auth/logout
    const logoutRes = post('/auth/logout', { refreshToken }, authHeaders(accessToken), 'POST /auth/logout');
    check(logoutRes, {
      'logout responds 200': (r) => r.status === 200,
    });

    // 10. Security: Access with blacklisted token must be rejected with 401
    const blacklistedAccessRes = get('/auth/me', authHeaders(accessToken), 'GET /auth/me [blacklisted]');
    check(blacklistedAccessRes, {
      'blacklisted token rejected with 401': (r) => r.status === 401,
    });

    // Re-login with new password to clean up / delete account
    const reLogin = login(userPayload.email, newPassword);
    if (reLogin?.accessToken) {
      // 11. Delete Account: DELETE /auth/account
      const deleteRes = http.del(`${BASE_URL}/auth/account`, JSON.stringify({ refreshToken: reLogin.refreshToken }), {
        headers: authHeaders(reLogin.accessToken),
        tags: { name: 'DELETE /auth/account' },
      });
      check(deleteRes, {
        'account deletion responds 200': (r) => r.status === 200,
      });
    }
  });
}
