/**
 * Presco k6 Scenario 07: Gamification, XP Progression & Customization Shop
 * Tests shop catalog calculation, purchasing banners and avatar frames with XP points,
 * equipping custom items, unequipping categories, and profile synchronization.
 */

import { group, check } from 'k6';
import { get, post, safeJson } from '../helpers/http.js';
import { getAdminAuth, authHeaders } from '../helpers/auth.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  thresholds: SMOKE_THRESHOLDS,
  vus: 1,
  iterations: 1,
};

export default function gamificationAndShopScenario(data) {
  group('Gamification & Customization Shop', () => {
    const admin = data?.admin || getAdminAuth();
    if (!admin?.accessToken) {
      console.warn('Authentication required for gamification test');
      return;
    }

    // 1. Fetch Customization Shop Catalog
    const shopRes = get('/customizations/shop', authHeaders(admin.accessToken), 'GET /customizations/shop');
    check(shopRes, {
      'shop catalog responds 200': (r) => r.status === 200,
      'shop returns items catalog and user points': (r) => {
        const json = safeJson(r);
        return json?.data && Array.isArray(json.data.items) && json.data.userPoints !== undefined;
      },
    });

    const catalog = safeJson(shopRes)?.data;
    const items = catalog?.items || [];

    // Find default items or cheap items
    const bannerItem = items.find((i) => i.category === 'banner' && i.isDefault) || items[0];
    const frameItem = items.find((i) => i.category === 'avatar_frame' && i.isDefault) || items[1];

    // 2. Buy Item with XP points (if not already owned)
    const purchasableItem = items.find((i) => !i.isOwned && i.price <= (catalog?.userPoints || 0));
    if (purchasableItem) {
      const buyRes = post(
        `/customizations/buy/${purchasableItem.id}`,
        {},
        authHeaders(admin.accessToken),
        'POST /customizations/buy/:itemId'
      );
      check(buyRes, {
        'buy item responds 200': (r) => r.status === 200,
      });
    }

    // 3. Equip an owned Banner: POST /customizations/equip/:itemId
    if (bannerItem?.id) {
      const equipRes = post(
        `/customizations/equip/${bannerItem.id}`,
        {},
        authHeaders(admin.accessToken),
        'POST /customizations/equip/:itemId [banner]'
      );
      check(equipRes, {
        'equip item responds 200': (r) => r.status === 200,
      });
    }

    // 4. Equip an owned Avatar Frame
    if (frameItem?.id) {
      const equipFrameRes = post(
        `/customizations/equip/${frameItem.id}`,
        {},
        authHeaders(admin.accessToken),
        'POST /customizations/equip/:itemId [frame]'
      );
      check(equipFrameRes, {
        'equip avatar frame responds 200': (r) => r.status === 200,
      });
    }

    // 5. Unequip Category: POST /customizations/unequip/:category
    const unequipRes = post(
      '/customizations/unequip/banner',
      {},
      authHeaders(admin.accessToken),
      'POST /customizations/unequip/:category'
    );
    check(unequipRes, {
      'unequip banner category responds 200': (r) => r.status === 200,
    });

    // 6. Verify User Profile Reflects Customization & Level
    const profileRes = get('/auth/me', authHeaders(admin.accessToken), 'GET /auth/me [sync]');
    check(profileRes, {
      'profile reflects badges and gamification state': (r) => {
        const json = safeJson(r);
        return json?.data && json.data.level !== undefined && Array.isArray(json.data.badges);
      },
    });
  });
}
