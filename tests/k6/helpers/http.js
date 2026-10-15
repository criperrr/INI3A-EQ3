/**
 * Presco k6 Test Suite - HTTP Utility Helpers
 */

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environments.js';

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
export function get(endpoint, headers = DEFAULT_HEADERS, tag = '') {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `GET ${endpoint.split('?')[0]}` },
  };
  return http.get(url, params);
}

/**
 * Perform a POST request with standard headers and tags
 */
export function post(endpoint, data = {}, headers = DEFAULT_HEADERS, tag = '') {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `POST ${endpoint}` },
  };
  return http.post(url, JSON.stringify(data), params);
}

/**
 * Perform a PUT request with standard headers and tags
 */
export function put(endpoint, data = {}, headers = DEFAULT_HEADERS, tag = '') {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `PUT ${endpoint}` },
  };
  return http.put(url, JSON.stringify(data), params);
}

/**
 * Perform a DELETE request with standard headers and tags
 */
export function del(endpoint, headers = DEFAULT_HEADERS, tag = '') {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers,
    tags: { name: tag || `DELETE ${endpoint}` },
  };
  return http.del(url, null, params);
}
