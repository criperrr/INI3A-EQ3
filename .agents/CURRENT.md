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
- `GET /products/:id` — get product details with latest price, min/max/avg statistics and occurrence history
- `GET /products/:id/history` — get price history timeline for charts
- `POST /products/custom` / `POST /products` — create product (+25 XP for user)
- `PUT /products/:id` / `PATCH /products/:id` — update product (requireAdmin)
- `DELETE /products/:id` — delete product from database (requireAdmin)
- `POST /ocurrency` — submit price report occurrence (+15 XP, requireAuth)
- `GET /ocurrency/product/:productId` — list price reports for a product across markets
- `POST /ocurrency/:id/vote` — audit / vote on price reliability (+5 XP, requireAuth)
- `PUT /ocurrency/:id` — update price occurrence (requireAuth, author or admin)
- `DELETE /ocurrency/:id` — delete price occurrence (requireAuth, author or admin)
- `GET /markets` — list available markets
- `POST /markets` — register new market (requireAuth)
- `GET /health` — inspect database and Redis health

**Frontend** is a React Native Expo app (SDK 54, React Native 0.81.5, Expo Router). Screens live in `src/frontend/app/`. All API calls go through `services/api.ts → apiRequest` and domain services in `services/`.
- `login.tsx` features automatic Expo Go / Dev environment detection with 1-tap quick login for `admin@admin.org` (password `admin`) and regular test user.
- `profile.tsx` is 100% dynamic without mock data, displaying real XP levels, ranks, badges, stats, and contribution activity heatmap.
- `productDetails.tsx` displays market prices list, allows community price voting, and grants exclusive edit/delete controls to admins.
- `registerProduct.tsx` connects to `/markets` and `/ocurrency` to persist price reports and award +15 XP.
- `settings.tsx` manages themes, system Monet color palettes, encoded config backup/import, cache clearing, and account security.
- `SwipeTabNavigator.tsx` provides 1:1 real-time finger-tracking horizontal swipe navigation between main tabs using Reanimated spring physics.

---

## 2. Navigation Index

Direct relative paths from project root.

### Backend

| File | Key exports / purpose |
|---|---|
| `src/backend/src/app.ts` | Express app, mounts `/auth`, `/products`, `/ocurrency`, `/markets` routers, `/health`, `errorHandler` last |
| `src/backend/src/server.ts` | `bootstrap()` — connects Redis, verifies DB, executes idempotent seed, starts HTTP |
| `src/backend/src/shared/database/seed.ts` | `seedDatabase()` — seeds roles, badges, markets, test admin (`admin@admin.org`/`admin`), regular test user |
| `src/backend/src/modules/auth/auth.routes.ts` | Auth Router (`/register`, `/login`, `/refresh`, `/me`, `/logout`, `/password`, `/account`) |
| `src/backend/src/modules/auth/auth.controller.ts` | `authController` singleton — register, login, refresh, getMe, logout, changePassword, deleteAccount |
| `src/backend/src/modules/auth/auth.service.ts` | `authService` singleton — register, login, refreshTokens, getProfile, logout, changePassword, updateUser, deleteUser |
| `src/backend/src/modules/product/product.routes.ts` | Product Router — REST CRUD with `requireAdmin` on PUT/PATCH/DELETE |
| `src/backend/src/modules/product/product.controller.ts` | `productController` singleton — list, getById, getByBarcode, createCustomProduct (+25 XP), updateProduct, deleteProduct |
| `src/backend/src/modules/product/product.service.ts` | `productService` singleton — full CRUD logic, dynamic price computation, statistics, OpenFoodFacts |
| `src/backend/src/modules/ocurrency/ocurrency.routes.ts` | Ocurrency Router (`GET /product/:productId`, `POST /`, `POST /:id/vote`, `PUT /:id`, `DELETE /:id`) |
| `src/backend/src/modules/ocurrency/ocurrency.controller.ts` | `ocurrencyController` singleton — create, getByProduct, vote, update, delete |
| `src/backend/src/modules/ocurrency/ocurrency.service.ts` | `ocurrencyService` singleton — occurrence management, XP rewards (+15 XP create, +5 XP vote), admin vs author permissions |
| `src/backend/src/modules/market/market.routes.ts` | Market Router (`GET /`, `GET /:id`, `POST /`) |
| `src/backend/src/modules/market/market.controller.ts` | `marketController` singleton — getAllMarkets, getMarketById, createMarket |
| `src/backend/src/modules/market/market.service.ts` | `marketService` singleton — market listing and creation |
| `src/backend/src/shared/database/schema.ts` | All Drizzle table definitions: `role, scope, user, badge, product, market, ocurrency, cart, cured, roleScope, userBadge, cartProduct` |
| `src/backend/src/shared/database/database.ts` | `db`, `pool`, `testDatabaseConnection`, `checkDatabaseHealth` |
| `src/backend/src/shared/database/healthCheck.ts` | Standalone CLI DB & Redis health verification script |
| `src/backend/src/shared/database/repositories/user.repository.ts` | `UserRepository` — createUser, getUserById, getUserByEmail, incrementPoints, getUserWithRole, getUserBadges, getAllBadges, awardBadge, getUserRank, updateUser, deleteUser |
| `src/backend/src/shared/database/repositories/auth.repository.ts` | `AuthRepository` — Redis only. storeRefreshToken, revokeRefreshToken, rotateRefreshToken, blacklistAccessToken, isAccessTokenBlacklisted |
| `src/backend/src/shared/database/repositories/ocurrency.repository.ts` | `OcurrencyRepository` — create, findById, findByProduct, findByUser, countByUser, update, delete, vote, getUserContributionGrid |
| `src/backend/src/shared/database/repositories/product.repository.ts` | `ProductRepository` — getProductFromOpenFoodFacts, getProductByEan, getProductById, searchProducts, countProducts, createProduct, updateProduct, deleteProduct, getCategories, getPriceStats, getPriceHistory |
| `src/backend/src/shared/database/repositories/market.repository.ts` | `MarketRepository` — createMarket, updateMarket, deleteMarket, getMarket, getAllMarkets, getMarketsByRadius (PostGIS `ST_DWithin`) |
| `src/backend/src/shared/errors/errors.ts` | `AppError` base + `ForbiddenError (403)`, `NotFoundError (404)`, `ValidationError (422)`, `UnauthorizedError (401)`, `ConflictError (409)`, `JTIrefused (401)`, `MultipleApiError (400)`, `NotImplemented (501)`, `InternalError` |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Express global error handler — maps `AppError` to JSON, 500 for unknown errors |
| `src/backend/src/shared/middlewares/authMiddleware.ts` | `requireAuth`, `requireAdmin`, `requireMinAuthority` |
| `src/backend/src/shared/redis/server.ts` | `redisClient`, `connectRedis`, helpers (`invalidateJWT`, `setRefreshToken`, `getUserIdByRefreshToken`) |
| `src/backend/src/shared/util/jwt.ts` | `signAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `getTokenRemainingSeconds` |
| `src/backend/src/shared/helpers/response.helper.ts` | `success(data, code?)` → `{ success: true, code: 200, data }` |

### Frontend

| File | Key exports / purpose |
|---|---|
| `src/frontend/services/api.ts` | `apiRequest<T>`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `src/frontend/services/auth.ts` | `registerUser`, `loginUser`, `logoutUser`, `getStoredTokens`, `changePassword`, `deleteAccount`, `fetchUserProfile`, `AuthUser`, `UserProfileData` |
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
| `src/frontend/app/profile.tsx` | 100% dynamic profile screen with real XP levels, rank, badges, stats, contribution heatmap, admin banner, and logout |
| `src/frontend/app/settings.tsx` | Full settings management: theme, Monet, scanner haptics, backup/export/import encoded config, cache clearing, password change, account deletion |
| `src/frontend/app/map.native.tsx` | Native map (proximity market lookup) |
| `src/frontend/app/help.tsx` | Help Center screen with FAQ accordions, search, and support contact |
| `src/frontend/app/about.tsx` | About Us screen with mission, version, tech stack, open data, and repository links |
| `src/frontend/content/authContext.tsx` | `AuthProvider`, `useAuth()` with `user`, `profile`, `isAdmin`, `refreshProfile()` |
| `src/frontend/content/themeContent.tsx` | `ThemeProvider`, `useTheme()` with light/dark/amoled modes and dynamic Monet palette presets |
| `src/frontend/content/i18nContext.tsx` | `I18nProvider`, `useI18n()` / `useTranslation()` supporting 7 languages |
| `src/frontend/content/tabNavigationContext.tsx` | Directional screen navigation context for swipe gestures |
| `src/frontend/components/SwipeTabNavigator.tsx` | 1:1 real-time finger-tracking Reanimated gesture navigator |

---

## 3. Active Tasks & Roadmap

- [x] Modular DDD backend with Drizzle ORM and JWT + Redis auth.
- [x] Frontend HTTP abstraction (`apiRequest`) with auto-refresh on 401.
- [x] Agent guidelines (`AGENTS.md`), project index (`CURRENT.md`), commit log (`COMMITS.md`).
- [x] Align `productController` to use `success()` helper.
- [x] Fix `market.repository.ts` and `getMarket`/`getAllMarkets` to use `ST_AsGeoJson`.
- [x] Complete settings functionalities (export/import encoded config, live password change via `PATCH /auth/password`, account deletion, cache clearing, scanner haptics).
- [x] Horizontal pan/swipe tab navigation between main screens (TikTok-style) with 1:1 finger tracking and haptic feedback.
- [x] Database & Redis auto-reconnect, idle error handling, `/health` endpoint, and `reload_services.sh` manager.
- [x] Full multilingual i18n support across 7 main languages (pt-BR, en-US, es-ES, de-DE, ru-RU, zh-CN, ja-JP).
- [x] Complete Admin vs Regular User permission scheme, leveling and gamification (+15 XP price, +25 XP product, +5 XP vote), 100% dynamic profile screen without placeholders, Expo Go auto-detection with 1-tap admin login (`admin@admin.org`/`admin`), and occurrence submission across markets.
- [x] Full mobile native performance optimization suite (Phase 0 Audit, Android 13-16 Predictive Back & Edge-to-Edge insets, iOS pop transitions, Metro `inlineRequires` lazy loading, full migration to `expo-image` with `memory-disk` cache, `@shopify/flash-list`, and pure UI thread memoization).
- [x] Unify `.taagents` into `.agents` and generate comprehensive project documentation.
- [x] Fix and polish Start Menu / ActionMenu layout on Home screen (activeView indicators, Monet tokens, concise i18n labels across 7 languages) and Sidebar drawer menu (safe area insets, brand header with close button, vector icons, user profile card).
- [x] Fix PostgreSQL schema synchronization (`role.authority`, `user.birthdate`, PostGIS geography, drizzle migration tracking) and resolve Reanimated worklet `useRef` serialization warning in `SwipeTabNavigator`.
- [x] Fix EAN product lookup and navigation pipeline: Open Food Facts, Open Beauty Facts, Open Products Facts and Open Pet Food Facts multi-endpoint parallel fallback, barcode digit/leading-zero normalization, string length safety in PostgreSQL, auto-lookup during search, and ID propagation across `scannerProduct` → `scannerConfirmation` → `registerProduct`.
- [ ] Implement market proximity lookup in frontend map screen.

---

## 4. AI Agent Operational Instructions

1. Read `.agents/CURRENT.md` first on every task to locate target files without directory scans.
2. After any code change: update sections 1 and 2 of this file if context or file inventory changed.
3. Append a commit log entry to `.agents/COMMITS.md` for every change made.
