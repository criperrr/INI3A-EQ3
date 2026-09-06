# CURRENT.md - Project State & Navigation Index

Executive summary and direct file index for token-efficient agent navigation. Read this file first on every task.

---

## 1. Executive Summary

INI3A-EQ3 (Presco) is a full-stack mobile price comparison and EAN barcode scanner app. Users scan a barcode, the backend queries a local DB then falls back to OpenFoodFacts (with auto-caching to PostgreSQL), and price reports (`ocurrency`) are submitted against a `market` and `product`. A complete role-based permission system differentiates **Administrators** (full delete/edit access across all products and price occurrences) and **Regular Users** (product analysis, market price suggestions, and community price auditing). Gamification tracks user points, unlocks badges, and levels up contributor ranks.

**Backend** runs on port 3333 (Express 5, TypeScript, Drizzle ORM, Redis, PostGIS).
Routes:
- `POST /auth/register` — create user, returns tokens
- `POST /auth/login` — authenticate, returns tokens
- `POST /auth/refresh` — rotate refresh token
- `GET /auth/me` — authenticated user profile with level, XP progress, stats, badges, and contribution grid (requireAuth)
- `POST /auth/logout` — blacklist access token JTI (requireAuth)
- `PATCH /auth/password` — change password with current password verification (requireAuth)
- `DELETE /auth/account` — delete own account (requireAuth)
- `GET /products` — list products (paginated, trigram/ilike search, category filter, sorting)
- `GET /products/categories` — list distinct product categories
- `GET /products/barcode/:ean` — lookup product by EAN (local DB → OpenFoodFacts fallback with auto-cache)
- `GET /products/:id` — get product details with latest price, min/max/avg statistics (average calculated from the 5 most recent/common prices), creation date, brand, multiple categories, and occurrence history
- `GET /products/:id/history` — get price history timeline for charts
- `POST /products/:id/report` — report product/price issues with structured reason (requireAuth)
- `POST /products/custom` / `POST /products` — create product (+25 XP for user, multi-category support, promo flag, brand/unit, requireAuth)
- `PUT /products/:id` / `PATCH /products/:id` — update product (requireAdmin, multi-category support)
- `DELETE /products/:id` — delete product from database (requireAdmin)
- `POST /ocurrency` — submit price report occurrence (+15 XP, promotional flag support, requireAuth)
- `GET /ocurrency/product/:productId` — list price reports for a product across markets
- `POST /ocurrency/:id/vote` — audit / vote on price reliability (+5 XP strictly on new votes, requireAuth)
- `PUT /ocurrency/:id` — update price occurrence (requireAuth, author or admin)
- `DELETE /ocurrency/:id` — delete price occurrence (requireAuth, author or admin)
- `GET /markets` — list available markets
- `POST /markets` — register new market (requireAuth)
- `GET /customizations/shop` — list all profile customization items with ownership, equipped status, and points balance (requireAuth)
- `POST /customizations/buy/:itemId` — buy a customization item using contribution points/XP (requireAuth)
- `POST /customizations/equip/:itemId` — equip an owned banner, avatar frame or level badge (requireAuth)
- `POST /customizations/unequip/:category` — restore a customization category to default (requireAuth)
- `GET /images/optimize` — dynamic media transcoding to WebP/AVIF with Sharp and 7-day Redis binary cache
- `GET /health` — inspect database and Redis health

**Caching & Performance Architecture:** Multi-tier caching with HTTP ETag (304 Not Modified), Brotli/Gzip payload compression (`compression`), Redis cache-aside on product routes with in-memory fallback and pattern invalidation, and Sharp dynamic image pipeline.

**Frontend** is a React Native Expo app (SDK 57, React Native 0.86.3, React 19.2.3, Expo Router). Screens live in `src/frontend/app/`. All API calls go through `services/api.ts → apiRequest` and domain services in `services/`.
- `login.tsx` features automatic Expo Go / Dev environment detection with 1-tap quick login for `admin@admin.org` (password `admin`) and regular test user.
- `profile.tsx` is 100% dynamic without mock data, displaying real XP levels, ranks, badges, stats, contribution activity heatmap, dynamic visual banners, animated/glow avatar frames, custom level badges, and an interactive Customization Shop modal with live avatar preview.
- `productDetails.tsx` displays market prices list, allows community price voting, interactive timeline chart starting at the right edge with newest prices, and grants exclusive edit/delete controls to admins.
- `registerProduct.tsx` connects to `/markets` and `/ocurrency` to persist price reports and award +15 XP.
- `settings.tsx` manages themes, system Monet color palettes, encoded config backup/import, cache clearing, and account security.
- `SwipeTabNavigator.tsx` provides 1:1 real-time finger-tracking horizontal swipe navigation between main tabs using Reanimated spring physics.

---

## 2. Navigation Index

Direct relative paths from project root.

### Backend

| File | Key exports / purpose |
|---|---|
| `src/backend/src/app.ts` | Express app, mounts `/auth`, `/products`, `/ocurrency`, `/markets`, `/customizations` routers, `/health`, `errorHandler` last |
| `src/backend/src/server.ts` | `bootstrap()` — connects Redis, verifies DB, executes idempotent seed, starts HTTP |
| `src/backend/src/shared/database/seed.ts` | `seedDatabase()` — seeds roles, badges, customization items (banners, avatar frames, level frames), markets, test admin (`admin@admin.org`/`admin`), regular test user |
| `src/backend/src/modules/auth/auth.routes.ts` | Auth Router (`/register`, `/login`, `/refresh`, `/me`, `/logout`, `/password`, `/account`) |
| `src/backend/src/modules/auth/auth.controller.ts` | `authController` singleton — register, login, refresh, getMe, logout, changePassword, deleteAccount |
| `src/backend/src/modules/auth/auth.service.ts` | `authService` singleton — register, login, refreshTokens, getProfile, logout, changePassword, updateUser, deleteUser |
| `src/backend/src/modules/customization/customization.routes.ts` | Customization Router (`GET /shop`, `POST /buy/:itemId`, `POST /equip/:itemId`, `POST /unequip/:category`) |
| `src/backend/src/modules/customization/customization.controller.ts` | `customizationController` singleton — getCatalog, buyItem, equipItem, unequipItem |
| `src/backend/src/modules/customization/customization.service.ts` | `customizationService` singleton — catalog calculation, purchase with XP points, equip, and unequip logic |
| `src/backend/src/modules/product/product.routes.ts` | Product Router — REST CRUD with `requireAdmin` on PUT/PATCH/DELETE |
| `src/backend/src/modules/product/product.controller.ts` | `productController` singleton — list, getById, getByBarcode, createCustomProduct (+25 XP), updateProduct, deleteProduct |
| `src/backend/src/modules/product/product.service.ts` | `productService` singleton — full CRUD logic, dynamic price computation, statistics, OpenFoodFacts |
| `src/backend/src/modules/ocurrency/ocurrency.routes.ts` | Ocurrency Router (`GET /product/:productId`, `POST /`, `POST /:id/vote`, `PUT /:id`, `DELETE /:id`) |
| `src/backend/src/modules/ocurrency/ocurrency.controller.ts` | `ocurrencyController` singleton — create, getByProduct, vote, update, delete |
| `src/backend/src/modules/ocurrency/ocurrency.service.ts` | `ocurrencyService` singleton — occurrence management, XP rewards (+15 XP create, +5 XP vote), admin vs author permissions |
| `src/backend/src/modules/market/market.routes.ts` | Market Router (`GET /`, `GET /:id`, `POST /`) |
| `src/backend/src/modules/market/market.controller.ts` | `marketController` singleton — getAllMarkets, getMarketById, createMarket |
| `src/backend/src/modules/market/market.service.ts` | `marketService` singleton — market listing and creation |
| `src/backend/src/modules/image/image.routes.ts` | Image Router (`GET /optimize?url=&w=&q=&fmt=`) |
| `src/backend/src/modules/image/image.controller.ts` | `imageOptimizerController` — Sharp image transcoding (WebP/AVIF), resizing, and 7-day Redis binary cache |
| `src/backend/src/shared/constants/productCategories.ts` | Predefined product categories (15 essential types with emoji, icon, description, and normalization helpers) |
| `src/backend/src/shared/database/schema.ts` | All Drizzle table definitions: `role, scope, user, badge, customizationItem, userCustomization, product, market, ocurrency, cart, cured, roleScope, userBadge, cartProduct` |

| `src/backend/src/shared/database/database.ts` | `db`, `pool`, `testDatabaseConnection`, `checkDatabaseHealth` |
| `src/backend/src/shared/database/healthCheck.ts` | Standalone CLI DB & Redis health verification script |
| `src/backend/src/shared/database/repositories/customization.repository.ts` | `CustomizationRepository` — getAllItems, getItemById, getUserInventory, isItemOwnedByUser, addCustomizationToUser, updateUserEquipped, getUserEquippedCustomizations |
| `src/backend/src/shared/database/repositories/user.repository.ts` | `UserRepository` — createUser, getUserById, getUserByEmail, incrementPoints, getUserWithRole, getUserBadges, getAllBadges, awardBadge, getUserRank, updateUser, deleteUser |
| `src/backend/src/shared/database/repositories/auth.repository.ts` | `AuthRepository` — Redis only. storeRefreshToken, revokeRefreshToken, rotateRefreshToken, blacklistAccessToken, isAccessTokenBlacklisted |
| `src/backend/src/shared/database/repositories/ocurrency.repository.ts` | `OcurrencyRepository` — create, findById, findByProduct, findByUser, countByUser, update, delete, vote, getUserContributionGrid |
| `src/backend/src/shared/database/repositories/product.repository.ts` | `ProductRepository` — getProductFromOpenFoodFacts, getProductByEan, getProductById, searchProducts, countProducts, createProduct, updateProduct, deleteProduct, getCategories, getPriceStats, getPriceHistory |
| `src/backend/src/shared/database/repositories/market.repository.ts` | `MarketRepository` — createMarket, updateMarket, deleteMarket, getMarket, getAllMarkets, getMarketsByRadius (PostGIS `ST_DWithin`) |
| `src/backend/src/shared/errors/errors.ts` | `AppError` base + `ForbiddenError (403)`, `NotFoundError (404)`, `ValidationError (422)`, `UnauthorizedError (401)`, `ConflictError (409)`, `TooManyRequestsError (429)`, `JTIrefused (401)`, `MultipleApiError (400)`, `NotImplemented (501)`, `InternalError` |
| `src/backend/src/shared/middlewares/cacheMiddleware.ts` | `cacheResponse` (ETag + Redis/Memory cache-aside), `invalidateCachePattern` |
| `src/backend/src/shared/middlewares/rateLimiter.ts` | `authRateLimiter`, `searchRateLimiter`, `createRateLimiter` (Redis atomic bucket with in-memory fallback) |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Express global error handler — maps `AppError` to JSON, sanitized 500 in production |
| `src/backend/src/shared/middlewares/authMiddleware.ts` | `requireAuth`, `requireAdmin`, `requireMinAuthority` |
| `src/backend/src/shared/config/env.ts` | Unified environment config loader with multi-path resolution and type-safe fallbacks |
| `src/backend/src/shared/redis/server.ts` | `redisClient`, `connectRedis`, `inMemoryStore` (resilient in-memory fallback, TLS support, JWT revocation & session helpers) |
| `src/backend/src/shared/util/jwt.ts` | `signAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `getTokenRemainingSeconds` |
| `src/backend/src/shared/helpers/response.helper.ts` | `success(data, code?)` → `{ success: true, code: 200, data }` |

### Dev Tooling & Launchers

| File | Key exports / purpose |
|---|---|
| `turbo.json` | Turborepo pipeline: `dev` (persistent, concurrent), `build`, `typecheck`, `lint`, `db:seed`, `db:migrate`, `db:check` tasks |
| `docker-compose.yml` | Docker Compose: `postgis/postgis:16-3.4` (multi-arch PostGIS on 5433:5432) + `redis:7-alpine` (Redis on 6380:6379) with health checks |
| `package.json` | Root monorepo: workspaces (`src/backend`, `src/frontend`), turbo build/lint/typecheck, dev network launchers |
| `scripts/dev_launcher.ts` | Unified cross-platform dev launcher: interactive network mode selector (LAN, Corporate Tunnel, Localhost), process tree lifecycle manager |
| `scripts/start_api_tunnel.ts` | Cloud tunnel manager for Backend API on port 3333 with health verification |
| `scripts/verify_connection.ts` | Cross-platform network and services diagnostic tool |
| `start_project.sh` | Shell launcher for macOS/Linux supporting `--lan`, `--corp`, `--localhost` or interactive menu |
| `start_project.ps1` / `start.bat` | PowerShell and Batch launchers for Windows supporting `-Mode lan`, `-Mode corp` or double-click execution |
| `setup.sh` / `setup.ps1` / `setup.bat` | Automated multi-platform environment setup, cache resilience, Docker auto-start, migrations & seed |
| `src/frontend/metro.config.js` | Metro config with monorepo `watchFolders` and `nodeModulesPaths` for workspace hoisting |

**Dev workflow:**
```bash
./setup.sh           → run once to install dependencies, configure .env, start Docker, migrate & seed
./start_project.sh   → interactive launcher (or ./start_project.sh --lan / --corp)
# Windows: .\start_project.ps1 (or double click start.bat)
# Turbo mode: npm run dev:turbo
```

### Frontend

| File | Key exports / purpose |
|---|---|
| `src/frontend/services/api.ts` | `apiRequest<T>`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `src/frontend/services/auth.ts` | `registerUser`, `loginUser`, `logoutUser`, `getStoredTokens`, `changePassword`, `deleteAccount`, `fetchUserProfile`, `AuthUser`, `UserProfileData` |
| `src/frontend/services/customizationService.ts` | `fetchCustomizationCatalog`, `buyCustomizationItem`, `equipCustomizationItem`, `unequipCustomizationCategory`, `CustomizationItem`, `ShopCatalogData` |
| `src/frontend/services/productService.ts` | `fetchProducts`, `fetchProductById`, `fetchProductByEan`, `createCustomProduct`, `updateProduct`, `deleteProduct`, `fetchCategories`, `fetchPriceHistory` |
| `src/frontend/services/ocurrencyService.ts` | `submitPriceOccurrence`, `fetchProductOccurrences`, `voteOccurrence`, `updateOccurrence`, `deleteOccurrence` |
| `src/frontend/services/marketService.ts` | `fetchMarkets`, `createMarket` |
| `src/frontend/app/_layout.tsx` | Root stack layout, gesture navigator wrapper and theme/i18n providers |
| `src/frontend/app/index.tsx` | Home screen with dynamic products loading and item navigation |
| `src/frontend/app/login.tsx` | Login screen with Expo Go / Dev detection and 1-tap quick login for `admin@admin.org` and regular test user |
| `src/frontend/app/registerUser.tsx` | Registration screen |
| `src/frontend/app/scannerProduct.tsx` | Camera EAN barcode scanning |
| `src/frontend/app/scannerConfirmation.tsx` | Confirm scanned EAN before submitting |
| `src/frontend/app/customRegisterProduct.tsx` | Manual product entry without EAN |
| `src/frontend/app/registerProduct.tsx` | Price submission for a product at a selected market (+15 XP reward) |
| `src/frontend/app/search.tsx` | Full live text & barcode search with debounce, category chips, pull-to-refresh, empty states, and product navigation |
| `src/frontend/app/productDetails.tsx` | Dynamic product detail view with price statistics, interactive history chart, market occurrences list with community voting, and admin-only edit/delete controls |
| `src/frontend/app/profile.tsx` | 100% dynamic profile screen with real XP levels, rank, badges, stats, contribution heatmap, visual banners, avatar frames, custom level badges, and interactive shop modal with live preview |
| `src/frontend/app/settings.tsx` | Full settings management: theme, Monet, scanner haptics, backup/export/import encoded config, cache clearing, password change, account deletion |
| `src/frontend/app/map.native.tsx` | Native proximity market map with instant (0ms) in-memory filtering, unified Overpass pre-fetch, and OSRM distance caching |
| `src/frontend/app/help.tsx` | Help Center screen with FAQ accordions, search, and support contact |
| `src/frontend/app/about.tsx` | About Us screen with mission, version, tech stack, open data, and repository links |
| `src/frontend/theme/index.ts` | Design System root: primitives, semantics, ThemeProvider, `useTheme()`, `useThemeTokens()`, Monet presets |
| `src/frontend/theme/tokens/primitives/` | Primitive tokens: colors (hex/alpha), spacing (4pt/8pt grid), typography, radii, shadows |
| `src/frontend/theme/tokens/semantics/` | Semantic tokens: surfaces, texts, borders, icons, feedbacks, spacing, typography, radii, elevations |
| `src/frontend/content/authContext.tsx` | `AuthProvider`, `useAuth()` with `user`, `profile`, `isAdmin`, `refreshProfile()` |
| `src/frontend/content/themeContent.tsx` | Retrocompatibility bridge to `src/frontend/theme` |
| `src/frontend/content/i18nContext.tsx` | `I18nProvider`, `useI18n()` / `useTranslation()` supporting 7 languages |
| `src/frontend/content/tabNavigationContext.tsx` | Directional screen navigation context for swipe gestures |
| `src/frontend/constants/productCategories.ts` | Predefined product categories (15 essential types with emoji, icon, and i18n localization helpers) |
| src/frontend/utils/dateUtils.ts | Safe date parsing and formatting utilities (parseDateSafe, parseDateSafeMs, formatDisplayDate, formatFullDisplayDate, formatShortDate, formatLongDateWithWeekday) |
| `src/frontend/utils/tutorialStorage.ts` | Tutorial onboarding storage manager under `@presco:hasSeenTutorial` |
| `src/frontend/components/OnboardingTutorialModal.tsx` | Hand-drawn / sketch doodle onboarding carousel modal with 6 pedagogical steps, Reanimated swipe gestures, Haptics, and useTheme integration |
| `src/frontend/components/CategorySelector.tsx` | Reusable category selector with preset chips, emoji/icon badges, custom category option, and theme accent highlighting |
| `src/frontend/components/SwipeTabNavigator.tsx` | 1:1 real-time finger-tracking Reanimated gesture navigator |

---

## 3. Active Tasks & Roadmap

- [x] Modular DDD backend with Drizzle ORM and JWT + Redis auth.
  - [x] Turborepo monorepo + Docker Compose infrastructure migration (Postgres/PostGIS + Redis in Docker, backend/frontend via `turbo run dev`, cross-platform, Expo Go LAN/tunnel support).
- [x] Frontend HTTP abstraction (`apiRequest`) with auto-refresh on 401.
- [x] Agent guidelines (`AGENTS.md`), project index (`CURRENT.md`), commit log (`COMMITS.md`).
- [x] Align `productController` to use `success()` helper.
- [x] Fix `market.repository.ts` and `getMarket`/`getAllMarkets` to use `ST_AsGeoJson`.
- [x] Complete settings functionalities (export/import encoded config, live password change via `PATCH /auth/password`, account deletion, cache clearing, scanner haptics).
- [x] Horizontal pan/swipe tab navigation between main screens (TikTok-style) with 1:1 finger tracking and haptic feedback.
- [x] Database & Redis auto-reconnect, idle error handling, `/health` endpoint, and `reload_services.sh` manager.
- [x] Full multilingual i18n support across 7 main languages (pt-BR, en-US, es-ES, de-DE, ru-RU, zh-CN, ja-JP).
- [x] Profile Customization Store & Inventory System with Points / XP milestone unlock, customizable banners, glow avatar frames, level badge frames, live avatar preview, categorized sections (Fundos, Molduras, Níveis) and multilingual support across all 7 languages without debiting user total XP score.
- [x] Achievements & Badges Expansion (15 progressive milestones from 0 to 10.000 XP) with description support, Drizzle schema enhancement, zero-overflow responsive contained grid layout, filter tabs (Todas, Conquistadas, A Conquistar), and interactive achievement detail modal in profile.tsx.
- [x] Standardized high-resolution banner image assets (`banner-*.jpg`) integrated into `profile.tsx` for `ProfileBanner`, shop previews, and item category swatches.
- [x] Renamed profile customization banners in `seed.ts` to natural, evocative names matching the actual visual line art (*Folhas Tropicais*, *Circuitos Digitais*, *Brisa Suave*, *Noite Estrelada*, *Ondas Cósmicas*, *Gemas & Cristais*, *Observatório Espacial*).
- [x] Design System Policy & Token Governance documentation in `DESIGN.md`, legacy dead screens cleanup (`aboutUs.tsx`, `helpUser.tsx`), and full unification of theme imports directly to `src/frontend/theme`.
- [x] Full-Stack Security Audit, Zero-Breaking Performance Optimization & Code Hygiene (Express defensive security headers, payload body limits, 18 ESLint warnings elimination to 0 warnings, and complete typecheck verification).
- [x] Security Vulnerabilities Remediation & Business Logic Hardening (`POST /products` requireAuth access control, infinite XP vote farm exploit patch, HTTP 500 error sanitization in production, and backend build/typecheck scripts).
- [x] Comprehensive Security Hardening & Vulnerability Sweep (seed admin password preservation, JWT revocation on account deletion, CORS whitelist policy, Redis rate limiting on auth & search endpoints, and strict geographic coordinate bounds validation).
- [x] Native Map Performance Optimization (instant 0ms client-side filter transitions, unified Overpass 10km pre-fetch with `nw` query, OSRM driving distance caching, and elimination of repeated network calls on filter changes).
- [x] Native Map Instant Startup Optimization (elimination of full-screen loading blocker, frame-0 optimistic map mount, module session memory persistence, and parallel Overpass mirror race via `Promise.any`).
- [x] Native Map Multi-Source Resilient Market Fetching (eliminated dead Overpass mirrors, added parallel Photon & Nominatim OpenStreetMap fallback, backend market radius fallback, and empty state banner).
- [x] Native Map Progressive Loading & False Empty State Fix (eliminated loading race condition where empty banner flashed before fetch finished, added progressive Nominatim streaming callback, and separated `isLoadingMarkets` and `isProcessingLocation`).
- [x] Native Map Duplicate Marker Keys Fix (guaranteed unique IDs and geo-hash deduplication across progressive Nominatim, Overpass, and Backend markets).
- [x] Pre-established Product Categories & Types System across full-stack (15 standardized categories with emoji, icon, multilingual i18n support in 7 languages, backend /types and /categories/details routes, CategorySelector interactive component, category chips in search.tsx, and enriched badges in productDetails.tsx and productCard.tsx).
- [x] Dynamic Theme Map Markers & UI Harmonization (map pin colors, filter controls, recenter button, loaders, and detail modal elements dynamically bind to the active theme accent color and Monet dynamic color system).
- [x] Product Proximity & Promotional Ranking (PostGIS `ST_DWithin` with 15km radius, smart promo detection `is_promotion`, distance & lowest price ranking, `userLocation.ts` session cache, dynamic badges in `HomeScreen` and `SearchScreen`, and 7-language i18n support).
- [x] Platform-Native Back Gestures & iPhone Sensitivity Calibration (restricted iOS interactive pop back gesture strictly to the left screen edge with `fullScreenGestureEnabled: false`, eliminating accidental triggers, and tuned `activeOffsetX: [-28, 28]`, `isDecisiveDistance: 60px` in `SwipeTabNavigator` for deliberate navigation).
- [x] Redundant Top-Left Back Button Navigation (added dynamic back button with haptic feedback to `Header.tsx` on all non-home screens and sub-screens, and added dedicated top-left back button on `registerUser.tsx`).
- [x] Nearest Market Auto-Selection & Progressive Currency Input Mask (integrated `getUserLocation()` on `registerProduct.tsx`, PostGIS `ST_Distance` proximity ordering in `MarketRepository`, auto-selection of closest market with distance badge pill, and progressive ATM-style centavos currency mask with digit-by-digit backspace).
- [x] Concise & Simplified Product Categories System (streamlined all 15 category names to short, 1-word/2-word terms like *Alimentos*, *Carnes*, *Laticínios*, *Padaria*, *Limpeza*, *Higiene*, *Bebês*, *Pets*, *Utilidades*, *Outros*, added backward-compatible alias resolver in backend and frontend, and updated translations across all 7 supported languages).
- [x] Full-Stack Category Deduplication & Alias Normalization (eliminated duplicate/rogue categories like "Líquido" vs "Limpeza" by embedding comprehensive keyword aliases in backend and frontend category definitions, mapping database rows to canonical categories in `ProductRepository.getCategories()`, normalizing categories in `formatProductDTO` and OpenFoodFacts fallback, and deduplicating category chips in `SearchScreen`).
- [x] Database Seeding Expansion (seeded 8 real supermarket chains with PostGIS coordinates, 36+ realistic products across all 15 canonical categories with high-res Unsplash imagery and EAN-13 barcodes, 170+ multi-market price occurrences with realistic discount variations and community votes, idempotent `npm run db:seed` script, and verification tools).
- [x] Scanned Product Confirmation Prompt & Zero-Scroll Layout (`scannerConfirmation.tsx` redesigned with explicit confirmation question "Este é o produto escaneado?", horizontal EAN & price chips, compact image container, tactile action buttons with haptic feedback, 100% contained single-screen viewport without unnecessary scrolling, and full 7-language i18n support).
- [x] Interactive & Visual Help Center Overhaul (`help.tsx` fully refactored with 18 comprehensive questions, 7 category filter chips with live counter badges, XP reward indicators, 4 quick action shortcuts, interactive feedback buttons with haptics, community guidelines card, real-time search with match counter, and 100% synchronized multilingual i18n support across all 7 languages).
- [x] Proximity Market Search & Proximity Ordering in Product Registration (strict 15km radius filtering with PostGIS `ST_DWithin` and `ST_Distance ASC` in `MarketRepository`, automated closest market pre-selection, distance badge chips, empty state card with retry mechanism and fallback to view all markets, and 7-language i18n localization).
- [x] React Native JSX Text Crash Remediation & Regional Markets Seeding (eliminated uncontained text string evaluation in `registerProduct.tsx` by replacing loose conditional logical ANDs with safe boolean ternary expressions, and seeded real supermarket chains in Bauru/Interior SP with PostGIS coordinates for accurate local proximity testing).
- [x] User Registration Query Failure & Role/Customization Initialization Fix (resolved PostgreSQL 23502 NOT NULL constraint failure on `user.role_id` during registration by setting explicit fallback defaults in `user.repository.ts` and `auth.service.ts`, enforcing schema-level `DEFAULT 1` in `seed.ts`, and automatically awarding starter milestone badge #1 *Pioneiro* and default inventory customizations).
- [x] Self-Voting Prevention & Duplicate Vote Notification Suppression (blocked authors from voting on their own price reports on backend with `ForbiddenError` and frontend disabled state, implemented `optionalAuth` for `GET /ocurrency/product/:productId` to return `userVote` state, suppressed redundant notifications on duplicate votes, and added multilingual translations across all 7 languages).
- [x] Autonomous Connection Diagnostic Agent & Startup Scripts Hardening (`scripts/verify_connection.ts` diagnostic verifier for PostgreSQL, Redis, Backend Local, Wi-Fi LAN IP and Tunnel, resolved Expo SDK 54 native `@expo/ngrok` `--tunnel` integration, dynamic backend tunnel discovery and fallback, and added `npm run dev:check`, `verify:local`, `verify:tunnel`).
- [x] Dedicated Backend Cloud Tunnel Provider & Settings Status Fix (`scripts/start_api_tunnel.ts` programmatic tunnel manager with health verification and `.tunnel_url` synchronization, fixed `settings.tsx` false offline status by redirecting health ping to `/health`, added `/ping` and `/products/barcode/ping` aliases in `app.ts`, and updated `start_project.sh` and `start_project.ps1`).
- [x] Unauthenticated 401 Missing Token Guard & 1-Tap Quick Connect (eliminated raw 401 "Token não fornecido" crashes when unauthenticated users register products or prices, added proactive `useAuth` verification in `customRegisterProduct.tsx`, `registerProduct.tsx`, and `productDetails.tsx`, added friendly login prompts with 1-tap dev quick connect, added inline XP reward banners, humanized backend/frontend 401 messages, and synchronized i18n across 7 languages).
- [x] Cloud Tunnel Remote Disconnection Diagnosis & Direct Wi-Fi LAN Mode Guidance (diagnosed and resolved `remote gone away` on `npm run dev:tunnel` caused by unauthenticated `@expo/ngrok` tunnel drop in Expo SDK 54, strengthened error handling in `scripts/start_api_tunnel.ts`, updated `start_project.sh`, verified local health with `scripts/verify_connection.ts`, and documented direct zero-latency Wi-Fi mode `npm run dev:local`).
- [x] Smart Network Priority Resolution & Dedicated Dev Ngrok Mode (`scripts/verify_connection.ts` and `start_project.sh` upgraded to prioritize direct USB Tethering (`172.20.10.x`, `192.168.3.x`) and Android Hotspot (`192.168.43.x`) over AP-isolated `10.x.x.x` campus networks; added `npm run dev:ngrok` in `package.json` to seamlessly tunnel Backend API on port 3333 with user static domain `https://premises-body-pogo.ngrok-free.dev` and inject into Expo).
- [x] Tailscale Mesh VPN Auto-Discovery & Zero-Config Local Mode (auto-detected active Tailscale IP `100.82.149.20` on macOS `utun4`, eliminated need for manual `LAN_IP` prefixing, and verified 6ms health check).
- [x] Help Center Action Tabs Refactor & Quick Actions Removal (removed confusing shortcut navigation cards from `help.tsx`, introduced dedicated Action Tabs bar with live question counters and haptics, added new 'Buscar & Comparar' action category with targeted questions for search and price comparison, and updated 100% of translations across all 7 languages).
- [x] Vote Toggle & Un-voting Capability (allowed users to tap the active vote button again to remove/undo their vote, deleting the row in `cured`, decrementing the occurrence counter, deducting 5 XP to prevent XP farming, resetting UI button states, and providing multilingual translations for `voteRemoved` in 7 languages).
- [x] Product Search Layout & Token Architecture Harmonization (`search.tsx` fully refactored with 100% strict semantic design tokens from `DESIGN.md`, eliminated undefined style properties, prevented card height deformation on unquoted products, balanced 2-column grid, integrated 1-tap barcode scanner button in search bar, and dynamic reactive search results counter).
- [x] iOS Material You System Sync Guard & Warning Alert (`settings.tsx` enhanced with iOS platform checks, warning haptic feedback, and informative `Alert.alert` dialog informing that dynamic wallpaper color sync is Android 12+ exclusive, keeping switch off and palette picker always active on iOS, with translations across all 7 languages).
- [x] React Native JSX Text Evaluation Guard & Theme Property Fallbacks (eliminated Invariant Violation crash caused by loose logical ANDs returning naked empty strings outside Text nodes in `search.tsx` and `productDetails.tsx`, sanitized route params, and turned `legacyStyles` into inspectable plain object literals in `themeContext.tsx`).
- [x] Strict Semantic Token Path & DesignSystemTokens Type Safety (`search.tsx` corrected `semantic.feedback.error` to `semantic.colors.feedback.error` in promo badge styling, and replaced generic `any` with `DesignSystemTokens` across all subcomponents for compile-time guarantee).
- [x] Spatial Proximity LEFT JOIN & Search Infinite Scroll Pagination (`product.repository.ts` upgraded spatial query to `LEFT JOIN` on `ocurrency` and `market` so all 68+ catalog products are returned with distance/price when available, and `search.tsx` implemented `onEndReached` infinite scroll pagination with category-aware icon placeholders and fixed price slots).
- [x] Strict Local Market Scope for Promotions & Catalog Metadata Normalization (`product.repository.ts` scoped price stats strictly to markets within user's radius preventing phantom promotion badges, normalized ID 68 to "Caneta Esferográfica Laranja" with HD image, and updated foreign categories).
- [x] Fixed 2-Column Grid Sizing & Elimination of Yoga Layout Collapse (`search.tsx` replaced flex: 1 / maxWidth with explicit `width: "48.2%"` and removed conflicting gap from `columnWrapper`, guaranteeing full-width cards and preventing capsule-like lateral shrinkage).
- [x] Explanatory Product Not Found Alert & 3-Way Action Routing (`scannerProduct.tsx` and `manualEanSearch.tsx` refactored to replace generic error messages with an informative, user-friendly alert when a product is missing from the database, offering 3 distinct actionable routes: "Cadastrar Produto" (+25 XP), "Digitar Código / Digitar Novamente", and "Escanear Novamente / Escanear pela Câmera", synchronized across all 7 supported languages).
- [x] Profile Title Customization Category & Sticky Live Preview Modal (extended `user` schema with `equippedTitleId`, seeded 21 initial titles/ranks across levels 1–6, synchronized default title item #30 *Iniciante*, updated `CustomizationRepository`, `auth.service.ts`, `customization.service.ts`, `customizationService.ts`, all 7 locale files, and redesigned `CustomizationShopModal` in `profile.tsx` with a sticky preview header, title pill badge, category switcher, preview reset indicator, and category cards).
- [x] Profile Customization Live Preview Layout & Proportion Alignment (`ProfileBanner` enhanced with configurable `height`, `previewMiniStage` expanded to `minHeight: 200`, `LevelCustomBadge` anchored cleanly at the bottom edge of `previewAvatarWrapper`, and dedicated `previewUserInfoCol` created for user name and title pill badge without overlapping or clipping).
- [x] Real Supermarket Catalog Alignment & Defunct Market Remediation (removed defunct supermarket *Supermercados Paulistão - Bauru* from PostgreSQL database and `seed.ts`, cleanly migrated legacy price occurrences to *Atacadão - Bauru*, added missing prominent supermarkets in Bauru including *Tenda Atacado*, *Supermercado Panelão*, *Supermercados Jaú Serve*, *Confiança Nações*, *Tauste Rio Branco*, updated exact PostGIS GPS coordinates, and automatically seeded comprehensive price comparison occurrences for both São Paulo capital and Bauru/Interior regional markets).
- [x] Dynamic OpenStreetMap Real-World Supermarket Discovery & Auto-Persistence (`OsmMarketDiscovery` service created in `src/backend/src/shared/services/osmMarketDiscovery.service.ts` integrating Photon, Nominatim, and Overpass with auto-deduplication, geo-cell caching, and automatic synchronization with PostgreSQL PostGIS, enabling real supermarkets to appear dynamically and accurately anywhere in Brazil based on user GPS location).
- [x] Native Map Hardening & Coordinate Bounds Crash Remediation (`map.native.tsx` fully hardened against NaN/undefined coordinates, non-numeric strings, and out-of-bounds latitude/longitude values across backend PostGIS feeds and raw OSM streams; backend `market.service.ts` decoupled from blocking OSM HTTP calls into fire-and-forget background execution; protected distance formatting and Marker rendering against runtime exceptions).
- [x] Multi-Platform Setup & Network Mode Dev Launcher (`setup.sh`, `setup.ps1`, `setup.bat`, `start_project.sh`, `start_project.ps1`, `start.bat`, `scripts/dev_launcher.ts`, `scripts/start_api_tunnel.ts`, `scripts/verify_connection.ts`; multi-arch Apple Silicon & Windows Docker PostGIS 16-3.4; interactive network mode selector for Ultra-low Latency LAN [0-5ms] vs Corporate AP-isolated Tunnel [<50ms]; automatic .env port configuration, Drizzle extensions migration pre-flight, and cross-platform process tree cleanup).
- [x] macOS Docker Desktop Path Auto-Detection & Setup Script Hardening (`setup.sh` upgraded to automatically inject macOS Docker paths `~/.docker/bin`, `/Applications/Docker.app/Contents/Resources/bin`, `/usr/local/bin`, and `/opt/homebrew/bin` into execution PATH, replaced macOS-incompatible `grep -oP` with portable `sed -E`, auto-starts Docker Desktop if daemon is not running, and updated Expo CLI detection to use project-local `npx expo`).
- [x] Apple Silicon ARM64 Docker PostGIS Compatibility (`docker-compose.yml` configured with native multi-arch `postgis/postgis:16-3.4`, starting healthy containers, and executing Drizzle migrations and seed).
- [x] Backend ESM `__dirname` Remediation & Hoisted Types Resolution (`src/backend/src/server.ts` updated to construct `__dirname` via `fileURLToPath(import.meta.url)` eliminating ESM ReferenceError, and `src/backend/tsconfig.json` updated with hoisted `../../node_modules/@types` path ensuring clean typecheck).
- [x] Full-Stack Upgrade to Expo SDK 57 & React Native 0.86 (upgraded `expo@57.0.20`, `react-native@0.86.3`, `react@19.2.3`, `expo-router@~57.0.19`, `react-native-reanimated@4.5.1`, and 28 companion native modules in `src/frontend`; resolved `StyleSheet.absoluteFill` compatibility in `map.native.tsx` and `profile.tsx`; declared global `Buffer` fallback in `settings.tsx`; adjusted `eslint.config.js` with Reanimated SharedValue immutability and React 19 rules; verified 0 errors on `tsc --noEmit` and `npm run lint`).
- [x] Streamlined Guided Onboarding & Admin QA Testing Suite (`OnboardingTutorialModal.tsx` simplified to 6 clean, direct pedagogical steps with buttery-smooth Reanimated 4 transitions, 1:1 gesture tracking, haptics, bottom-right white Next button and Skip text button, auto-trigger on first access in `index.tsx`, and exclusive `isAdmin`-only testing and first-access reset tools in `settings.tsx`).
- [x] AI Ecosystem Sanitization & Core Markdown Integration (`.agents` audit and bloat removal; deleted irrelevant skills like game-development, rust, python, nextjs, tailwind, seo, geo, and red-team; created native `.agents/skills/presco-backend` and `presco-frontend`; aligned `MEMORY.md`, `tech-decisions.md` and `project-conventions.md` to Presco tech stack; updated `mobile-developer` and `backend-specialist` agents; consolidated `ARCHITECTURE.md` inventory with 0 errors on validation; and preserved 100% integrity of `AGENTS.md`, `COMMITS.md`, `CURRENT.md`, `DESIGN.md`, and `ISSUES.md`).
- [x] Windows Node.js spawn EINVAL & Dev Launcher Remediation (resolved Node.js >= 22.0.0 CVE-2024-27980 child_process restriction requiring `shell: true` when spawning `.cmd` files in `scripts/dev_launcher.ts`; added defensive try/catch around `migrate()` in `src/backend/src/server.ts` and synchronized `drizzle.__drizzle_migrations`; removed non-plugin runtime modules `expo-image` and `expo-status-bar` from `src/frontend/app.json` `plugins` list eliminating Expo CLI PluginError; hardened cross-platform entrypoint resolution in `scripts/verify_connection.ts` and `scripts/start_api_tunnel.ts`).
- [x] Monorepo Expo SDK 57 Dependency Synchronization & Node Modules Alignment (resolved stale Expo 54.0.37 binaries in root node_modules by executing clean workspace installation; updated `@expo/cli` to 57.0.22 and verified `npx expo --version` returns 57.0.22 in both root and frontend; synchronized `MEMORY.md`, `tech-decisions.md`, `ARCHITECTURE.md`, and `mobile-developer.md` to Expo SDK 57 / React Native 0.86.3; verified 0 errors on `tsc --noEmit`, `npx expo config`, and `npm run lint`).
- [x] Token Efficiency Optimization & AI Guardrails Hardening (configured `.vscode/settings.json` with 4-tab limit and preview mode; optimized `/enhance` workflow specifically for Presco; barred 23.5k-token `frontend-design` in favor of `presco-frontend` and `DESIGN.md`; embedded direct commit template in `AGENTS.md` preventing 52k-token `COMMITS.md` historical reads; created `scripts/measure_tokens.mjs` diagnostic utility).
- [x] Phantom Markets Elimination & Location-Driven OpenStreetMap Discovery (completely eradicated ghost markets like Jaú Serve, Confiança, Tauste, and SP seed chains appearing in unassociated regions; stripped static fake occurrence generators and market IDs from `seed.ts`; executed database purge of 470 dummy price occurrences and legacy SP seed markets; enforced spatial proximity filtering on `GET /ocurrency/product/:productId` so product details only show prices within user's radius; eliminated hardcoded mock market strings from `index.tsx`; guarded `map.native.tsx` against querying São Paulo default coordinates before device GPS resolves; filtered out street names and house numbers from Nominatim and Photon across frontend and backend; verified 0 errors on both frontend and backend `tsc --noEmit`).
- [x] RAM Memory & Resource Optimization (eliminated camera hardware retention in `scannerProduct.tsx` by unmounting `CameraView` when unfocused; optimized `map.native.tsx` with `tracksViewChanges={false}` and 60-nearest market capping preventing GPU memory spikes; switched `expo-image` across `search.tsx`, `productCard.tsx`, `index.tsx`, `productDetails.tsx`, and `profile.tsx` to `cachePolicy="disk"` with `recyclingKey` eliminating uncollected RAM bitmaps; fine-tuned `FlatList` virtualization parameters `windowSize={5}` and `maxToRenderPerBatch={8}`; verified 0 errors on `tsc --noEmit` and `npm run lint`).
- [x] JS 60 FPS Restoration & Price Occurrences Recovery (eradicated infinite render loop in `productDetails.tsx` caused by unstable array references in `priceHistory` dependency array; restored `cachePolicy="memory-disk"` across all screens eliminating continuous disk reads and JPEG decompression on JS thread; re-seeded 163 realistic multi-market price occurrences across existing database supermarkets in `seed.ts`; added resilient spatial proximity fallback in `OcurrencyRepository.findByProduct` ensuring prices and occurrences always display; verified 0 errors on both frontend and backend `tsc --noEmit`).
- [x] CameraView Native Lifecycle Restoration in Scanner (`scannerProduct.tsx` reverted dynamic conditional unmounting `isFocused` that tore down Camera2 surface textures and caused native camera capture sessions to freeze in Expo SDK 57 / React 19 New Architecture; restored continuous surface binding with focused barcode processing).
- [x] Camera Scanner Layout Overhaul & Instant 1D Barcode Acceleration (`scannerProduct.tsx` redesigned with a dedicated 3-band mask overlay [Top Info Card, Center Viewfinder with 4 Monet accent corners and Reanimated sweeping laser scan line, and Bottom Mask with flashlight toggle and manual entry]; streamlined `barcodeScannerSettings` to high-priority retail formats `["ean13", "ean8", "upc_a", "code128"]` eliminating 2D matrix overhead for 30+ FPS MLKit decoding; added flashlight/torch toggle with haptic feedback for dim supermarket aisles; backend `product.repository.ts` optimized with concurrent `fetchFastest` race cutting external product lookup latency from ~3.5s to ~0.8s; verified 0 errors on frontend and backend `tsc --noEmit`).
- [x] Generation & Persistence of Architecture Diagrams in gestao/ (generated 200 DPI high-resolution UML Class Diagram and Database ERD with Crow's foot cardinalities in gestao/diagrama_classes.png and gestao/diagrama_banco_de_dados.png, eliminating all label overlaps and parallel edge collisions).
- [x] FetchRequestCanceledException & Network Auto-Sync Remediation (diagnosed root cause of iOS Native `FetchRequestCanceledException` caused by stale `10.153.0.145` IP in `src/frontend/.env` and dead `loca.lt` tunnels; upgraded `src/frontend/services/api.ts` with iOS native fetch cancellation detection and dynamic Metro `hostUri` fallback; synchronized `scripts/dev_launcher.ts` to auto-update `src/frontend/.env` on every start; and added health validation to `scripts/start_api_tunnel.ts`).
- [x] System Ngrok 3.x Tunnel Auto-Discovery & Zero-Freeze Cloud Mode (`scripts/start_api_tunnel.ts` upgraded to detect and launch the authenticated system Ngrok 3.x binary (`/opt/homebrew/bin/ngrok`), bypassing obsolete Expo 2.x `ERR_NGROK_121` binaries and broken `loca.lt` servers; binds directly to `127.0.0.1:3333` using the user's permanent static domain `https://premises-body-pogo.ngrok-free.dev` in <1 second; added `ngrok-skip-browser-warning: true` header to `src/frontend/services/api.ts`).
- [x] Dev Launcher Boot Order & Port 4040 Orphan Zombie Remediation (fixed `scripts/dev_launcher.ts` sequence to boot and verify Backend API on port 3333 before initializing cloud tunnel, eliminating false-negative tunnel health checks; added port 4040 cleanup to pre-flight checks and implemented `getActiveNgrokTunnel()` in `scripts/start_api_tunnel.ts` to seamlessly reuse existing active ngrok tunnels without `ERR_NGROK_334` collisions).
- [x] Production Multi-Tier Backend Caching & Media Pipeline (`BACKEND_CACHING_GUIDE.md` implemented with HTTP ETag / 304 validation, Brotli/Gzip payload compression via `compression`, Redis cache-aside with `inMemoryStore` fallback and regex keys support in `cacheMiddleware.ts`, automatic route invalidation on write operations in `product.service.ts` and `ocurrency.service.ts`, dynamic Sharp WebP/AVIF image transcoding and binary caching in `image.controller.ts` & `image.routes.ts`, and clean backend typecheck verification).
- [x] Home Screen Overscroll Background & White Flash Remediation (`index.tsx` wrapped with root `View` and `ScrollView` styled with `flex: 1` and `semantic.colors.surface.background` plus `paddingBottom: 32`; `_layout.tsx` updated with `contentStyle: { backgroundColor: semantic.colors.surface.background }` on `Stack` and `contentWrapper`; `SwipeTabNavigator.tsx` container given theme background; resolved React Compiler memoization lint error in `productDetails.tsx`; verified 0 errors on `tsc --noEmit` and `npm run lint`).
- [x] Atomic Commit Decomposition Policy Strictly On-Demand (`AGENTS.md`, `code-rules.md`, `project-conventions.md`, and `CURRENT.md` updated with strict protocol: AI never commits spontaneously; large changes are sliced into logical, cohesive atomic commits grouped by layer/domain with Conventional Commits exclusively when the user requests).

---

## 4. AI Agent Operational Instructions

1. Read `.agents/CURRENT.md` first on every task to locate target files without directory scans.
2. After any code change: update sections 1 and 2 of this file if context or file inventory changed.
3. Append a commit log entry to `.agents/COMMITS.md` for every change made.
4. Git commits are strictly on-demand: NEVER execute `git commit` spontaneously; decompose large changes into atomic commits using Conventional Commits only when the user explicitly requests it.
