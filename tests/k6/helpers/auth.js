/**
 * Presco k6 Test Suite - Authentication Helpers
 */

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environments.js';
import { generateUserPayload } from './generator.js';

// In-memory token cache to prevent repeated login overhead when running continuous load
let cachedAdminToken = null;
let cachedUserToken = null;

export const ADMIN_CREDENTIALS = {
  email: __ENV.ADMIN_EMAIL || 'admin@admin.org',
  password: __ENV.ADMIN_PASSWORD || 'admin',
};

export const USER_CREDENTIALS = {
  email: __ENV.USER_EMAIL || 'usuario@presco.com',
  password: __ENV.USER_PASSWORD || 'user123',
};

/**
 * Logs in with specified credentials and returns full auth payload
 */
export function login(email, password) {
  const url = `${BASE_URL}/auth/login`;
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: DEFAULT_HEADERS,
    tags: { type: 'auth', name: 'POST /auth/login' },
  };

  const res = http.post(url, payload, params);
  const isOk = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns tokens': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.data && body.data.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!isOk) {
    return null;
  }

  const json = JSON.parse(res.body);
  return json.data;
}

/**
 * Gets or fetches the Admin auth tokens
 */
export function getAdminAuth() {
  if (cachedAdminToken) return cachedAdminToken;
  const auth = login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  if (auth) cachedAdminToken = auth;
  return auth;
}

/**
 * Gets or fetches the Regular Test User auth tokens
 */
export function getUserAuth() {
  if (cachedUserToken) return cachedUserToken;
  const auth = login(USER_CREDENTIALS.email, USER_CREDENTIALS.password);
  if (auth) cachedUserToken = auth;
  return auth;
}

/**
 * Creates an authorized header object for a given access token
 */
export function authHeaders(accessToken) {
  return {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Registers a brand new random user and returns tokens + credentials
 */
export function registerRandomUser() {
  const userPayload = generateUserPayload();
  const url = `${BASE_URL}/auth/register`;
  const params = {
    headers: DEFAULT_HEADERS,
    tags: { type: 'auth', name: 'POST /auth/register' },
  };

  const res = http.post(url, JSON.stringify(userPayload), params);
  const isOk = check(res, {
    'register status is 201': (r) => r.status === 201,
    'register returns access token': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b && b.data && b.data.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!isOk) return null;
  const body = JSON.parse(res.body);
  return {
    ...body.data,
    credentials: userPayload,
  };
}
