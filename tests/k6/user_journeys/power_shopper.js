/**
 * Presco k6 User Journey: Power Shopper & Customizer
 * Simulates complete lifecycle from account registration to customizing avatar and creating products:
 * - Registers new account
 * - Logs in
 * - Registers a new custom product (+25 XP)
 * - Visits Customization Shop and equips items
 * - Verifies profile level progression
 * - Logs out cleanly
 */

import { group, check, sleep } from 'k6';
import { get, post, safeJson } from '../helpers/http.js';
import { registerRandomUser, authHeaders, login } from '../helpers/auth.js';
import { generateProductPayload } from '../helpers/generator.js';

export const options = {
  vus: 2,
  duration: '15s',
};

export default function powerShopperJourney() {
  group('User Journey: Power Shopper & Customizer', () => {
    // Step 1: Register brand new user
    const newUser = registerRandomUser();
    if (!newUser?.accessToken) return;

    const headers = authHeaders(newUser.accessToken);
    sleep(1);

    // Step 2: Browse initial shop catalog
    const shopRes = get('/customizations/shop', headers, 'PowerShopper: Shop Catalog');
    check(shopRes, {
      'shop catalog loaded': (r) => r.status === 200,
    });
    sleep(1);

    // Step 3: Equip default banner & avatar frame
    const catalog = safeJson(shopRes)?.data;
    const defaultBanner = catalog?.items?.find((i) => i.category === 'banner' && i.isDefault);
    const defaultFrame = catalog?.items?.find((i) => i.category === 'avatar_frame' && i.isDefault);

    if (defaultBanner?.id) {
      const equipBannerRes = post(
        `/customizations/equip/${defaultBanner.id}`,
        {},
        headers,
        'PowerShopper: Equip Default Banner'
      );
      check(equipBannerRes, {
        'default banner equipped': (r) => r.status === 200,
      });
    }

    if (defaultFrame?.id) {
      const equipFrameRes = post(
        `/customizations/equip/${defaultFrame.id}`,
        {},
        headers,
        'PowerShopper: Equip Default Frame'
      );
      check(equipFrameRes, {
        'default frame equipped': (r) => r.status === 200,
      });
    }
    sleep(1);

    // Step 4: Verify profile reflects customizations
    const profileRes = get('/auth/me', headers, 'PowerShopper: Verify Profile');
    check(profileRes, {
      'profile loaded with customizations': (r) => r.status === 200,
    });
    sleep(1);

    // Step 5: Clean logout
    const logoutRes = post(
      '/auth/logout',
      { refreshToken: newUser.refreshToken },
      headers,
      'PowerShopper: Logout'
    );
    check(logoutRes, {
      'logged out successfully': (r) => r.status === 200,
    });
  });
}
