# COMMITS.md - Project Modification Log

Chronological record of all system modifications, additions, and refactorings.

---

## Mandatory Commit Format

All project changes MUST be appended using the exact structure below:

```markdown
## [YYYY-MM-DD HH:mm] - [TYPE](scope): Short title

- **Description:** Technical summary of changes and rationale.
- **Files Modified:**
  - `path/to/file1`
  - `path/to/file2`
- **Impact / Next Steps:** System impact, required testing, or follow-up tasks.
```

Allowed Types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`.

---

## Modification History

## [2026-08-15 11:26] - fix(backend): define SERVER_PORT=3333 in .env and align server.ts fallback

- **Description:** Configured `SERVER_PORT=3333` in `src/backend/.env` and updated `server.ts` fallback from port 3000 to 3333 to align with `start_project.sh` and project architecture specifications.
- **Files Modified:**
  - `src/backend/.env`
  - `src/backend/src/server.ts`
- **Impact / Next Steps:** `start_project.sh` now successfully detects the backend server starting on port 3333 and proceeds with localtunnel and frontend initialization.

---

- **Description:** Updated `start_project.sh` to dynamically parse `REDIS_URL`, `DATABASE_URL`, and `SERVER_PORT` from `src/backend/.env`. Fixed issue where the startup script was hardcoded to check `localhost:6379`, causing timeouts when using remote Redis instances (e.g. Upstash over TLS).
- **Files Modified:**
  - `start_project.sh`
- **Impact / Next Steps:** `./start_project.sh` now correctly detects remote Redis and DB connections defined in `.env` without blocking.

---

- **Description:** Rewrote `product.controller.ts` to use `success()` from `response.helper.ts`, `ValidationError` for missing inputs, `ConflictError` for duplicate EAN, and `next(e)` in all catch blocks — matching `authController` pattern. Previously, product errors bypassed the global `errorHandler`, causing silent failures.
- **Files Modified:**
  - `src/backend/src/modules/product/product.controller.ts`
- **Impact / Next Steps:** Product endpoint responses now follow the same envelope as all other routes. ISSUES.md entry marked fixed.

---

## [2026-08-11 19:41] - fix(backend): correct id/name swap in updateMarket and raw WKB in getMarket/getAllMarkets

- **Description:** Fixed critical bug in `market.repository.ts` where `updateMarket` returned `id: Market.name` and `name: Market.id` (swapped). Also corrected `getMarket` and `getAllMarkets` to use `ST_AsGeoJson()` instead of returning raw WKB binary, following AGENTS.md §3.6.
- **Files Modified:**
  - `src/backend/src/shared/database/repositories/market.repository.ts`
- **Impact / Next Steps:** Any client calling `PUT /markets/:id` was receiving `id` and `name` reversed. Now correct.

---

## [2026-08-11 19:41] - refactor(frontend): replace direct apiRequest with fetchProductByEan in scanner

- **Description:** `scannerProduct.tsx` was calling `apiRequest('/products/barcode/:ean')` directly, bypassing the domain service layer. Replaced with `fetchProductByEan` from `productService.ts`. Adjusted error handling since `fetchProductByEan` returns `null` on 404 rather than throwing.
- **Files Modified:**
  - `src/frontend/app/scannerProduct.tsx`
- **Impact / Next Steps:** Scanner now follows AGENTS.md §4.1 service layer pattern.

---

## [2026-08-11 19:41] - fix(backend): remove duplicate .default() in schema and dead code

- **Description:** Removed duplicate `.default(0)` on `points` and `.default(false)` on `dangerFlag` in `schema.ts`. Removed the commented-out `spatialRefSys` table block (dead code). Removed empty `destroyRefreshToken` function from `redis/server.ts`.
- **Files Modified:**
  - `src/backend/src/shared/database/schema.ts`
  - `src/backend/src/shared/redis/server.ts`
- **Impact / Next Steps:** No runtime impact; schema output is identical. Removes confusion for future readers.

---

## [2026-08-11 19:41] - style(backend/frontend): remove comments violating AGENTS.md §7.1

- **Description:** Removed 7 comments across 7 files that restate what the code does, describe standard patterns, or contain informal/speculative text. These violate the comments policy in AGENTS.md §7.1. The PostGIS workaround note in `schema.ts` was preserved as it documents a genuine non-obvious constraint.
- **Files Modified:**
  - `src/backend/src/modules/product/product.routes.ts`
  - `src/backend/src/modules/auth/auth.controller.ts`
  - `src/backend/src/modules/auth/auth.service.ts`
  - `src/backend/src/shared/database/repositories/auth.repository.ts`
  - `src/backend/src/shared/database/repositories/user.repository.ts`
  - `src/frontend/services/api.ts`
  - `src/frontend/services/productService.ts`
- **Impact / Next Steps:** No behavioral change.

---

## [2026-08-15 10:51] - feat(settings): complete settings features with backup export/import, real password change, and cache management

- **Description:** Implemented complete settings suite across frontend and backend. Added `PATCH /auth/password` endpoint with bcrypt current password verification, integrated real authenticated password change and account deletion in `auth.ts`, added JSON backup export (native Share) and import with live theme synchronization in `themeContent.tsx`, implemented non-destructive local cache clearing, and added scanner haptic/interaction preferences.
- **Files Modified:**
  - `src/backend/src/modules/auth/auth.routes.ts`
  - `src/backend/src/modules/auth/auth.controller.ts`
  - `src/backend/src/modules/auth/auth.service.ts`
  - `src/frontend/services/auth.ts`
  - `src/frontend/content/themeContent.tsx`
  - `src/frontend/app/settings.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Settings screen is now fully functional and connected to the backend API without simulated mocks.

---

## [2026-08-15 10:53] - refactor(settings): replace raw JSON with encoded configuration code for export and import

- **Description:** Replaced raw multi-line JSON export with a compact Base64-encoded configuration code format (`PRESCO-CONFIG-...`). Added an interactive export modal with code viewer and native share, and updated the import modal with automatic decoding and backward-compatibility for raw JSON payloads.
- **Files Modified:**
  - `src/frontend/app/settings.tsx`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Exporting and importing settings is now significantly more compact and user-friendly.

---

## [2026-08-15 10:59] - feat(settings): instant real-time auto-saving on any setting toggle

- **Description:** Updated `settings.tsx` so all preference toggles, theme selections, Monet palettes, languages, scanner settings, and security options persist immediately to `AsyncStorage` upon user interaction. Added visual feedback pill ("✓ Salvo") in the header that triggers instantly on every click.
- **Files Modified:**
  - `src/frontend/app/settings.tsx`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Removed manual save button requirement; all changes are persisted in real time.

---

## [2026-08-15 11:07] - fix(frontend): fix navigation stack buildup and menu stacking across Header, Footer, and Sidebar

- **Description:** Fixed issue where alternating between tabs in the Footer and clicking the Presco logo in the Header stacked multiple duplicate screens and menus in the navigation history. `Header.tsx` was calling `router.navigate("/")`, which performed a stack push because `Footer.tsx` was using `router.replace()`. Replaced `router.navigate("/")` in Header with a safe dismiss and `router.replace("/")`, added dismiss guards and active checks in `Footer.tsx` and `Sidebar.tsx`, guarded duplicate settings pushes in `_layout.tsx`, and added resilient fallback in subpage back buttons (`aboutUs.tsx`, `helpUser.tsx`).
- **Files Modified:**
  - `src/frontend/components/Header.tsx`
  - `src/frontend/components/Footer.tsx`
  - `src/frontend/components/Sidebar.tsx`
  - `src/frontend/app/_layout.tsx`
  - `src/frontend/app/aboutUs.tsx`
  - `src/frontend/app/helpUser.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Clean, single-instance navigation without history buildup or duplicate stacked menus.

---

## [2026-08-15 11:25] - feat(frontend): horizontal decisive swipe navigation between main tabs (TikTok-style)

- **Description:** Implemented horizontal swipe navigation between the 5 primary tabs (`/`, `/search`, `/scannerProduct`, `/map`, `/profile`) using `react-native-gesture-handler` (`Gesture.Pan()`) and `SwipeTabNavigator`. Configured decisive swipe thresholds (`|translationX| >= 80px` or `|velocityX| >= 650px/s` with angle lock `failOffsetY: [-35, 35]` and `|translationX| > |translationY| * 1.5`) to prevent accidental triggers during vertical scrolling on lists. Added light haptic feedback via `expo-haptics` and isolated secondary screens (`/settings`, `/login`, etc.) from swipe gesture handling.
- **Files Modified:**
  - `src/frontend/components/SwipeTabNavigator.tsx`
  - `src/frontend/app/_layout.tsx`
  - `menu-swipe-navigation.md`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Users can now fluidly flick/swipe between Home, Search, Scanner, Map, and Profile menus with synced Footer state and haptic feedback.

---

## [2026-08-15 11:30] - fix(frontend): dynamic directional screen animations matching user gesture and tab transitions

- **Description:** Fixed issue where screen transition animations did not match the physical direction of the user's swipe gestures (previously hardcoded to `slide_from_right` for all navigations). Created `TabNavigationContext` to dynamically compute and supply the correct transition animation: swiping left (advancing) animates the incoming screen from the right (`slide_from_right`), swiping right (going back) animates the incoming screen from the left (`slide_from_left`), and tapping footer tabs automatically evaluates target index vs current index to select the matching directional slide.
- **Files Modified:**
  - `src/frontend/content/tabNavigationContext.tsx`
  - `src/frontend/components/SwipeTabNavigator.tsx`
  - `src/frontend/components/Footer.tsx`
  - `src/frontend/components/Header.tsx`
  - `src/frontend/app/_layout.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Transitions now strictly adhere to natural physics and match the user's gesture direction across all tabs.

---

## [2026-08-15 11:35] - feat(frontend): real-time interactive 1:1 finger-tracking swipe transitions with Reanimated spring physics (TikTok-style)

- **Description:** Upgraded `SwipeTabNavigator.tsx` with `react-native-reanimated` shared values (`translateX`, `opacity`, `scale`) to track the user's finger 1:1 in real time across the UI thread (60/120fps). Added rubber-band elastic dampening at carousel boundaries, smooth release fling to edge on transition with haptic trigger, bounceless spring snap-back (`withSpring`) when gestures are cancelled, and gliding entry animation for the incoming tab.
- **Files Modified:**
  - `src/frontend/components/SwipeTabNavigator.tsx`
  - `src/frontend/app/_layout.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** True TikTok/Instagram-style interactive gesture physics where the screen moves seamlessly with the user's finger.

---

## [2026-08-15 11:45] - feat(backend): resilient PostgreSQL & Redis auto-reconnect, idle client error handling, /health API, and reload_services manager

- **Description:** Fixed frequent backend crashes and dropped database connections during code modifications and dev watch restarts. Handled `pg.Pool` `'error'` events on idle clients to prevent uncaught exceptions from terminating Node.js, added connection pooling keep-alive configuration, implemented startup retry with exponential backoff for PostgreSQL and Redis in `database.ts` and `redis/server.ts`, added graceful shutdown handlers in `server.ts`, implemented `GET /health` in `app.ts` to inspect DB/Redis readiness, and created `reload_services.sh` + `restart_db.sh` (`npm run db:reload`, `npm run db:restart`, `npm run db:status`, `npm run db:check`) to automatically detect, revive, and verify PostgreSQL and Redis services and notify the active tmux session.
- **Files Modified:**
  - `src/backend/src/shared/database/database.ts`
  - `src/backend/src/shared/redis/server.ts`
  - `src/backend/src/server.ts`
  - `src/backend/src/app.ts`
  - `src/backend/src/shared/database/healthCheck.ts`
  - `src/backend/package.json`
  - `package.json`
  - `reload_services.sh`
  - `restart_db.sh`
  - `start_project.sh`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Node.js no longer crashes on database connection hiccups or file edits, and developers can reload/restart services instantly with a single command.

---

## [2026-08-15 11:58] - fix(scanner/backend): resolve scanner connection failures, tunnel 503, database product caching, and error propagation

- **Description:** Diagnosed and fixed the root causes for scanner failures:
  1. **Tunnel 503 Outage**: The background `localtunnel` process was crashing and returning `503 Service Unavailable`. Added an auto-restart loop in `start_project.sh` and automatic fallback to the machine's local LAN IP (`http://<LAN_IP>:3333`).
  2. **Error Swallowing**: `productService.ts` was catching all errors and returning `null`, which fooled `scannerProduct.tsx` into displaying "Produto Não Encontrado" even on database/network/tunnel crashes. Refined error propagation so only genuine 404s return `null` and real errors bubble up to trigger connection alerts.
  3. **Port & Prefix Fallbacks**: Fixed `api.ts` default fallback port to `3333` (was `3000`), removed invalid `/api` prefix in `customRegisterProduct.tsx`, and replaced raw `fetch` with `createCustomProduct` domain service.
  4. **Database Product Caching**: Updated `product.service.ts` to automatically persist external OpenFoodFacts products into the PostgreSQL `product` table upon lookup so that local DB gets populated for offline/fast future queries.
  5. **Scanner Manual Flow**: Fixed "Cadastrar Manual" action in `scannerProduct.tsx` to route directly to `customRegisterProduct` with scanned EAN instead of placeholder confirmation screen.
- **Files Modified:**
  - `src/frontend/services/productService.ts`
  - `src/frontend/services/api.ts`
  - `src/frontend/app/scannerProduct.tsx`
  - `src/frontend/app/customRegisterProduct.tsx`
  - `src/backend/src/modules/product/product.service.ts`
  - `start_project.sh`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Scanner communicates reliably with backend and database, displays clear network alerts when connectivity is broken, and persists scanned items to PostgreSQL.

---

## [2026-08-15 12:15] - feat(i18n): full internationalization & localization engine supporting 7 major languages

- **Description:** Implemented a robust, lightweight, and type-safe internationalization (i18n) and localization engine across the entire frontend supporting 7 major languages:
  1. **Português (pt-BR)** 🇧🇷 (Default)
  2. **English (en-US)** 🇺🇸
  3. **Español (es-ES)** 🇪🇸
  4. **Deutsch (de-DE)** 🇩🇪
  5. **Русский (ru-RU)** 🇷🇺
  6. **简体中文 (zh-CN)** 🇨🇳
  7. **日本語 (ja-JP)** 🇯🇵

  Key architectural additions:
  - `src/frontend/i18n/types.ts`: Strictly typed `TranslationSchema` and dot-notation `TranslationKey` union types.
  - `src/frontend/i18n/locales/{pt,en,es,de,ru,zh,ja}.ts`: Comprehensive translation dictionaries for all 7 languages covering common actions, navigation, authentication, scanner, settings, products, profile, maps, and errors.
  - `src/frontend/content/i18nContext.tsx`: `I18nProvider` with `useI18n()` / `useTranslation()` hook, nested string lookup, parameter interpolation (`{param}`), missing-key fallback, and persistence in `AsyncStorage` (`@presco:language` + `app_settings` sync).
  - `src/frontend/app/_layout.tsx`: Root level `<I18nProvider>` integration for immediate reactive updates without app restart.
  - `src/frontend/app/settings.tsx`: Upgraded language selection from a basic alert to a full, high-polish Modal with flag icons, native and English names, active checkmark indicator, and haptic feedback.
  - Translated screens and components (`login.tsx`, `registerUser.tsx`, `index.tsx`, `profile.tsx`, `scannerProduct.tsx`, `Sidebar.tsx`, etc.).
- **Files Modified:**
  - `src/frontend/i18n/types.ts` (new)
  - `src/frontend/i18n/index.ts` (new)
  - `src/frontend/i18n/locales/pt.ts` (new)
  - `src/frontend/i18n/locales/en.ts` (new)
  - `src/frontend/i18n/locales/es.ts` (new)
  - `src/frontend/i18n/locales/de.ts` (new)
  - `src/frontend/i18n/locales/ru.ts` (new)
  - `src/frontend/i18n/locales/zh.ts` (new)
  - `src/frontend/i18n/locales/ja.ts` (new)
  - `src/frontend/content/i18nContext.tsx` (new)
  - `src/frontend/app/_layout.tsx`
  - `src/frontend/app/settings.tsx`
  - `src/frontend/app/login.tsx`
  - `src/frontend/app/registerUser.tsx`
  - `src/frontend/app/index.tsx`
  - `src/frontend/app/profile.tsx`
  - `src/frontend/app/scannerProduct.tsx`
  - `src/frontend/components/Sidebar.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** The application is now fully accessible in 7 international languages with instantaneous real-time language switching and persistent user preferences.

---

## [2026-08-16 14:05] - feat(products): complete product CRUD, full-text & barcode search, category filtering, price statistics, and interactive history charts

- **Description:** Implemented end-to-end CRUD for products across backend and frontend:
  1. **Backend API & Data Layer:** Added `GET /products` (paginated, ILIKE/trigram fuzzy search on name/EAN, category filter, custom sorting), `GET /products/categories`, `GET /products/:id` (with aggregated latest price, min, max, avg and occurrences count), `GET /products/:id/history`, `POST /products/custom` & `POST /products` (with EAN uniqueness conflict validation), `PUT /products/:id` & `PATCH /products/:id` (in-place update), and `DELETE /products/:id`. Added `NotFoundError (404)` subclass in `errors.ts`.
  2. **Frontend Domain Service & Screens:** Expanded `productService.ts` with all typed methods. Replaced static mock list in `search.tsx` with live API search, 350ms input debounce, clear button, category chip filters, pull-to-refresh, loading and empty states, and product details navigation. Upgraded `productDetails.tsx` to read route params, dynamically fetch product data and price statistics, display visual proportional price history charts, support modal editing, and handle item deletion with user feedback. Refactored `manualEanSearch.tsx`, `customRegisterProduct.tsx`, `registerProduct.tsx`, and `index.tsx` to use the unified product domain service and pass correct product identifiers.
- **Files Modified:**
  - `src/backend/src/shared/types/product.ts`
  - `src/backend/src/shared/errors/errors.ts`
  - `src/backend/src/shared/database/repositories/product.repository.ts`
  - `src/backend/src/modules/product/product.service.ts`
  - `src/backend/src/modules/product/product.controller.ts`
  - `src/backend/src/modules/product/product.routes.ts`
  - `src/frontend/services/productService.ts`
  - `src/frontend/app/search.tsx`
  - `src/frontend/app/productDetails.tsx`
  - `src/frontend/app/index.tsx`
  - `src/frontend/app/manualEanSearch.tsx`
  - `src/frontend/app/customRegisterProduct.tsx`
  - `src/frontend/app/registerProduct.tsx`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Product management, search, filtering, price aggregation, and detail views are now 100% operational with full stack integration.

---

## [2026-08-16 14:15] - feat(scripts): add --local-nat option for direct local network development and Expo Go QR scanning

- **Description:** Added `--local-nat` (and aliases `--local`, `--nat`, `-l`) non-default startup flag to `start_project.sh` and npm shortcuts (`npm run dev:local`, `npm run dev:nat`). When passed, the launcher detects the computer's local LAN IP (e.g. `192.168.1.x`), bypasses localtunnel entirely, configures `EXPO_PUBLIC_API_URL` and `REACT_NATIVE_PACKAGER_HOSTNAME` to point directly to the LAN IP, and starts Expo Metro with `--lan`. This eliminates tunnel lag and provides instant, 100% responsive testing via Expo Go QR code scanning on the home Wi-Fi. Default mode remains tunneling for restricted/school networks. Explicitly bound backend server in `server.ts` to `0.0.0.0`.
- **Files Modified:**
  - `start_project.sh`
  - `package.json`
  - `src/backend/src/server.ts`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Developers can run `npm run dev:local` at home for zero-latency direct Wi-Fi testing with Expo Go, while `npm run dev` continues to work with tunnels in school environments.