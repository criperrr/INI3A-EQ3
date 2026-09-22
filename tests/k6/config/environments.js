/**
 * Presco k6 Test Suite - Environment Configuration
 * Supports Localhost, Corporate Tunnel, and Remote Production/Staging CTI deployment
 */

export const ENVIRONMENTS = {
  local: {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3333',
    name: 'Local Development Server',
    timeout: '10s',
  },
  remote: {
    baseUrl: __ENV.BASE_URL || 'https://eq.projetoscti.com.br/26-presco',
    name: 'Remote CTI Production/Staging Server',
    timeout: '15s',
  },
};

// Target environment: determined by TARGET_ENV or falls back to remote if specified, else local
const target = __ENV.TARGET_ENV || (__ENV.BASE_URL ? 'custom' : 'remote');

export const CURRENT_ENV = target === 'local' 
  ? ENVIRONMENTS.local 
  : target === 'remote' 
  ? ENVIRONMENTS.remote 
  : {
      baseUrl: __ENV.BASE_URL || ENVIRONMENTS.remote.baseUrl,
      name: 'Custom Target Server',
      timeout: '15s',
    };

export const BASE_URL = CURRENT_ENV.baseUrl;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
  'User-Agent': 'Presco-k6-PerformanceTest/1.0',
};
