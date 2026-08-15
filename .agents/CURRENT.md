# CURRENT.md - Project State & Navigation Index

Executive summary and direct file index for token-efficient agent navigation. Read this file first on every task.

---

## 1. Executive Summary

INI3A-EQ3 is a full-stack mobile price comparison and EAN barcode scanner app. Users scan a barcode, the backend queries a local DB then falls back to OpenFoodFacts, and price reports (`ocurrency`) are submitted against a `market` and `product`. A moderation system (`cured`) and gamification (`points`, `badge`, `role`) are partially defined in the schema.

**Backend** runs on port 3333 (Express). All routes are prefixed:
- `POST /auth/register` — create user, returns tokens
- `POST /auth/login` — authenticate, returns tokens
- `POST /auth/refresh` — rotate refresh token
- `POST /auth/logout` — blacklist access token JTI (requireAuth)
- `PATCH /auth/password` — change password with current password verification (requireAuth)
- `DELETE /auth/account` — delete own account (requireAuth)
- `GET /products/barcode/:ean` — lookup product by EAN (local DB → OpenFoodFacts)
- `POST /products/custom` — create internal product without EAN

**Frontend** is a React Native Expo app. Screens live in `src/frontend/app/` (Expo Router). All API calls go through `services/api.ts → apiRequest`.

---

## 2. Navigation Index

Direct relative paths from project root. Use `grep_search` on the symbol name to get line numbers before opening with `view_file`.

### Backend

| File | Key exports / purpose |
|---|---|
| `src/backend/src/app.ts` | Express app, mounts `/auth` and `/products` routers, `errorHandler` last |
| `src/backend/src/server.ts` | `bootstrap()` — connects Redis, starts HTTP on `SERVER_PORT` |
| `src/backend/src/modules/auth/auth.routes.ts` | Auth Router with `requireAuth` on logout, password change and delete |
| `src/backend/src/modules/auth/auth.controller.ts` | `authController` singleton — register, login, refresh, logout, changePassword, deleteAccount |
| `src/backend/src/modules/auth/auth.service.ts` | `authService` singleton — register, login, refreshTokens, logout, changePassword, updateUser, deleteUser, getUserById |
| `src/backend/src/modules/product/product.routes.ts` | Product Router — GET `/barcode/:ean`, POST `/custom` |
| `src/backend/src/modules/product/product.controller.ts` | `productController` singleton — getProductByBarcode, createCustomProduct (NOTE: uses raw JSON response, not `success()`) |
| `src/backend/src/modules/product/product.service.ts` | `productService` singleton — getProductByBarcode (local then OpenFoodFacts), createCustomProduct |
| `src/backend/src/shared/database/schema.ts` | All Drizzle table definitions: `role, scope, user, badge, product, market, ocurrency, cart, cured, roleScope, userBadge, cartProduct` |
| `src/backend/src/shared/database/database.ts` | `db`, `pool`, `testDatabaseConnection`, `checkDatabaseHealth` |
| `src/backend/src/shared/database/healthCheck.ts` | Standalone CLI DB & Redis health verification script |
| `reload_services.sh` | Service manager script to auto-reconnect, check, and restart PostgreSQL & Redis (`npm run db:reload`, `npm run db:restart`) |
| `src/backend/src/shared/database/repositories/user.repository.ts` | `UserRepository` — createUser, getUserById, getUserByEmail, updateUser, deleteUser |
| `src/backend/src/shared/database/repositories/auth.repository.ts` | `AuthRepository` — Redis only. storeRefreshToken, revokeRefreshToken, rotateRefreshToken, blacklistAccessToken, isAccessTokenBlacklisted |
| `src/backend/src/shared/database/repositories/product.repository.ts` | `ProductRepository` — getProductFromOpenFoodFacts (HTTP fetch), getProductByEan, createProduct |
| `src/backend/src/shared/database/repositories/market.repository.ts` | `MarketRepository` — createMarket, updateMarket, deleteMarket, getMarket, getAllMarkets, getMarketsByRadius (PostGIS `ST_DWithin`) |
| `src/backend/src/shared/errors/errors.ts` | `AppError` base + `ValidationError (422)`, `UnauthorizedError (401)`, `ConflictError (409)`, `JTIrefused (401)`, `MultipleApiError (400)`, `NotImplemented (501)`, `InternalError` |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Express global error handler — maps `AppError` to JSON, 500 for unknown errors |
| `src/backend/src/shared/middlewares/authMiddleware.ts` | `requireAuth` — verifies Bearer JWT, checks Redis blacklist, populates `req.user` |
| `src/backend/src/shared/redis/server.ts` | `redisClient`, `connectRedis`, helpers (`invalidateJWT`, `setRefreshToken`, `getUserIdByRefreshToken`) |
| `src/backend/src/shared/util/jwt.ts` | `signAccessToken`, `generateRefreshToken` (48-byte hex), `verifyAccessToken`, `getTokenRemainingSeconds`. Expiry: access=15m, refresh=7d |
| `src/backend/src/shared/helpers/response.helper.ts` | `success(data, code?)` → `{ success: true, code: 200, data }` |
| `src/backend/src/shared/types/services.ts` | `CreateUser { name, email, password }`, `UpdateUser` |
| `src/backend/src/shared/types/repositories.ts` | `CreateUser { name, email, passHash }`, `UpdateUser` |
| `src/backend/src/shared/types/product.ts` | `ProductInfo`, `OpenFoodFactsResponse`, `OpenFoodFactsProduct` |

### Frontend

| File | Key exports / purpose |
|---|---|
| `src/frontend/services/api.ts` | `apiRequest<T>`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `src/frontend/services/auth.ts` | `registerUser`, `loginUser`, `logoutUser`, `getStoredTokens`, `changePassword`, `deleteAccount`, `AuthUser`, `AuthTokens` |
| `src/frontend/services/productService.ts` | `fetchProductByEan(ean)` → `ProductData | null` |
| `src/frontend/app/_layout.tsx` | Root stack layout and theme provider |
| `src/frontend/app/index.tsx` | Home screen |
| `src/frontend/app/login.tsx` | Login screen |
| `src/frontend/app/registerUser.tsx` | Registration screen |
| `src/frontend/app/scannerProduct.tsx` | Camera EAN barcode scanning |
| `src/frontend/app/scannerConfirmation.tsx` | Confirm scanned EAN before submitting |
| `src/frontend/app/customRegisterProduct.tsx` | Manual product entry without EAN |
| `src/frontend/app/registerProduct.tsx` | Price submission for a product at a market |
| `src/frontend/app/search.tsx` | Product text search |
| `src/frontend/app/productDetails.tsx` | Product detail view |
| `src/frontend/app/profile.tsx` | User profile and gamification points |
| `src/frontend/app/settings.tsx` | Full settings management: theme, Monet, scanner haptics, backup/export/import JSON, cache clearing, password change, account deletion |
| `src/frontend/app/map.native.tsx` | Native map (proximity market lookup — largest file, 28KB) |
| `src/frontend/content/themeContent.tsx` | Contexto de tema e cores dinâmicas (Monet) |
| `src/frontend/content/i18nContext.tsx` | Contexto global de internacionalização, hook `useI18n()` e persistência de idioma |
| `src/frontend/i18n/index.ts` | Registro dos 7 idiomas (PT, EN, ES, DE, RU, ZH, JA) e dicionários tipados |
| `src/frontend/i18n/types.ts` | Schema TypeScript `TranslationSchema` e tipos de chaves de tradução |
| `src/frontend/i18n/locales/` | Dicionários completos: `pt.ts`, `en.ts`, `es.ts`, `de.ts`, `ru.ts`, `zh.ts`, `ja.ts` |
| `src/frontend/content/authContext.tsx` | Contexto de autenticação do usuário |
| `src/frontend/content/tabNavigationContext.tsx` | Contexto de navegação e sincronização dinâmica da direção da animação de abas (`slide_from_left` / `slide_from_right`) |
| `src/frontend/components/Header.tsx` | Shared header component |
| `src/frontend/components/Footer.tsx` | Shared footer/nav component |
| `src/frontend/components/Sidebar.tsx` | Sidebar component |
| `src/frontend/components/SwipeTabNavigator.tsx` | Gesture handler wrapper para transição horizontal estilo TikTok entre as 5 abas principais |
| `src/frontend/components/productCard.tsx` | Product card component |
| `.agents/DESIGN.md` | UI design token spec — `useTheme()` keys, typography, spacing, component rules |

---

## 3. Active Tasks & Roadmap

- [x] Modular DDD backend with Drizzle ORM and JWT + Redis auth.
- [x] Frontend HTTP abstraction (`apiRequest`) with auto-refresh on 401.
- [x] Agent guidelines (`AGENTS.md`), project index (`CURRENT.md`), commit log (`COMMITS.md`).
- [x] Align `productController` to use `success()` helper — done (2026-08-11).
- [x] Fix `market.repository.ts` id/name swap in `updateMarket` — done (2026-08-11).
- [x] Fix `getMarket`/`getAllMarkets` to use `ST_AsGeoJson` — done (2026-08-11).
- [x] Replace direct `apiRequest` in scanner with `fetchProductByEan` domain service — done (2026-08-11).
- [x] Complete settings functionalities (export/import JSON backup, live password change via `PATCH /auth/password`, account deletion, cache clearing, scanner haptics) — done (2026-08-15).
- [x] Fix navigation screen stacking when switching tabs, footer home, and header logo — done (2026-08-15).
- [x] Horizontal pan/swipe tab navigation between main screens (TikTok-style) with haptic feedback — done (2026-08-15).
- [x] Database & Redis auto-reconnect, idle error handling, `/health` endpoint, and `reload_services.sh` manager (`npm run db:reload`, `npm run db:restart`) — done (2026-08-15).
- [x] Fix scanner connection failure, tunnel resilience, database product persistence, and error propagation — done (2026-08-15).
- [x] Full multilingual i18n support across 7 main languages (pt-BR, en-US, es-ES, de-DE, ru-RU, zh-CN, ja-JP) with AsyncStorage persistence and high-polish selection modal — done (2026-08-15).
- [ ] Wire `scannerProduct.tsx` → `scannerConfirmation.tsx` flow with market selection.
- [ ] Implement `ocurrency` (price report) submission endpoint and service.
- [ ] Implement market proximity lookup in frontend map screen.
- [ ] Add missing module routes and controllers for `market` and `ocurrency`.

---

## 4. AI Agent Operational Instructions

1. Read `.agents/CURRENT.md` first on every task to locate target files without directory scans.
2. After any code change: update sections 1 and 2 of this file if context or file inventory changed.
3. Append a commit log entry to `.agents/COMMITS.md` for every change made.
