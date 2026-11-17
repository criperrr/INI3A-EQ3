/**
 * Presco k6 Test Suite - HTTP Utility Helpers
 */

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environments.js';

export const expectedStatuses = http.expectedStatuses;

/**
 * Safely parse JSON response body with fallback
 */
export function safeJson(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Perform a GET request with standard headers and tags
 */
export function get(endpoint, headers = DEFAULT_HEADERS, tag = '', extraParams = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `GET ${endpoint.split('?')[0]}` },
    ...extraParams,
  };
  return http.get(url, params);
}

/**
 * Perform a POST request with standard headers and tags
 */
export function post(endpoint, data = {}, headers = DEFAULT_HEADERS, tag = '', extraParams = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `POST ${endpoint}` },
    ...extraParams,
  };
  return http.post(url, JSON.stringify(data), params);
}

/**
 * Perform a PUT request with standard headers and tags
 */
export function put(endpoint, data = {}, headers = DEFAULT_HEADERS, tag = '', extraParams = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `PUT ${endpoint}` },
    ...extraParams,
  };
  return http.put(url, JSON.stringify(data), params);
}

/**
 * Perform a PATCH request with standard headers and tags
 */
export function patch(endpoint, data = {}, headers = DEFAULT_HEADERS, tag = '', extraParams = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `PATCH ${endpoint}` },
    ...extraParams,
  };
  return http.patch(url, JSON.stringify(data), params);
}

/**
 * Perform a DELETE request with standard headers and tags
 */
export function del(endpoint, headers = DEFAULT_HEADERS, tag = '', extraParams = {}, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `DELETE ${endpoint}` },
    ...extraParams,
  };
  return http.del(url, body ? JSON.stringify(body) : null, params);
}
