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
- `GET /products` — list all products (with optional ?search=, ?limit=, ?offset=)
- `GET /products/:id` — get product by ID
- `GET /products/barcode/:ean` — lookup product by EAN (local DB → OpenFoodFacts)
- `POST /products` — create new product (name, ean, ncm, description, icon)
- `POST /products/custom` — create internal product without EAN
- `PUT /products/:id` / `PATCH /products/:id` — update existing product
- `DELETE /products/:id` — delete product by ID

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
| `src/backend/src/modules/product/product.routes.ts` | Product Router — GET `/`, GET `/barcode/:ean`, GET `/:id`, POST `/`, POST `/custom`, PUT/PATCH `/:id`, DELETE `/:id` |
| `src/backend/src/modules/product/product.controller.ts` | `productController` singleton — listProducts, getProductById, getProductByBarcode, createProduct, createCustomProduct, updateProduct, deleteProduct |
| `src/backend/src/modules/product/product.service.ts` | `productService` singleton — listProducts, getProductById, getProductByBarcode (local then OpenFoodFacts), createProduct, createCustomProduct, updateProduct, deleteProduct |
| `src/backend/src/shared/database/schema.ts` | All Drizzle table definitions: `role, scope, user, badge, product, market, ocurrency, cart, cured, roleScope, userBadge, cartProduct` |
| `src/backend/src/shared/database/database.ts` | `db` — Drizzle client instance |
| `src/backend/src/shared/database/repositories/user.repository.ts` | `UserRepository` — createUser, getUserById, getUserByEmail, updateUser, deleteUser |
| `src/backend/src/shared/database/repositories/auth.repository.ts` | `AuthRepository` — Redis only. storeRefreshToken, revokeRefreshToken, rotateRefreshToken, blacklistAccessToken, isAccessTokenBlacklisted |
| `src/backend/src/shared/database/repositories/product.repository.ts` | `ProductRepository` — getProductFromOpenFoodFacts, getAllProducts, getProductById, getProductByEan, createProduct, updateProduct, deleteProduct |
| `src/backend/src/shared/database/repositories/market.repository.ts` | `MarketRepository` — createMarket, updateMarket, deleteMarket, getMarket, getAllMarkets, getMarketsByRadius (PostGIS `ST_DWithin`) |
| `src/backend/src/shared/errors/errors.ts` | `AppError` base + `ValidationError (422)`, `UnauthorizedError (401)`, `ConflictError (409)`, `NotFoundError (404)`, `JTIrefused (401)`, `MultipleApiError (400)`, `NotImplemented (501)`, `InternalError` |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Express global error handler — maps `AppError` to JSON, 500 for unknown errors |
| `src/backend/src/shared/middlewares/authMiddleware.ts` | `requireAuth` — verifies Bearer JWT, checks Redis blacklist, populates `req.user` |
| `src/backend/src/shared/redis/server.ts` | `redisClient`, `connectRedis`, helpers (`invalidateJWT`, `setRefreshToken`, `getUserIdByRefreshToken`) |
| `src/backend/src/shared/util/jwt.ts` | `signAccessToken`, `generateRefreshToken` (48-byte hex), `verifyAccessToken`, `getTokenRemainingSeconds`. Expiry: access=15m, refresh=7d |
| `src/backend/src/shared/helpers/response.helper.ts` | `success(data, code?)` → `{ success: true, code: 200, data }` |
| `src/backend/src/shared/types/services.ts` | `CreateUser`, `UpdateUser`, `Product`, `CreateProduct`, `UpdateProduct`, `ProductFilter` |
| `src/backend/src/shared/types/repositories.ts` | `CreateUser`, `UpdateUser`, `Product`, `CreateProduct`, `UpdateProduct`, `ProductFilter` |
| `src/backend/src/shared/types/product.ts` | `ProductInfo`, `OpenFoodFactsResponse`, `OpenFoodFactsProduct` |

### Frontend

| File | Key exports / purpose |
|---|---|
| `src/frontend/services/api.ts` | `apiRequest<T>`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `src/frontend/services/auth.ts` | `registerUser`, `loginUser`, `logoutUser`, `getStoredTokens`, `changePassword`, `deleteAccount`, `AuthUser`, `AuthTokens` |
| `src/frontend/services/productService.ts` | `fetchProducts`, `fetchProductById`, `fetchProductByEan`, `createProduct`, `updateProduct`, `deleteProduct`, `ProductItem`, `ProductData` |
| `src/frontend/app/_layout.tsx` | Root stack layout and theme provider |
| `src/frontend/app/index.tsx` | Home screen with real product grid and pull-to-refresh |
| `src/frontend/app/login.tsx` | Login screen |
| `src/frontend/app/registerUser.tsx` | Registration screen |
| `src/frontend/app/scannerProduct.tsx` | Camera EAN barcode scanning |
| `src/frontend/app/scannerConfirmation.tsx` | Confirm scanned EAN before submitting |
| `src/frontend/app/customRegisterProduct.tsx` | Manual product create & edit screen |
| `src/frontend/app/registerProduct.tsx` | Price submission for a product at a market |
| `src/frontend/app/search.tsx` | Live product text search & filter |
| `src/frontend/app/productDetails.tsx` | Product detail view with dynamic load, edit and delete actions |
| `src/frontend/app/profile.tsx` | User profile and gamification points |
| `src/frontend/app/settings.tsx` | Full settings management: theme, Monet, scanner haptics, backup/export/import JSON, cache clearing, password change, account deletion |
| `src/frontend/app/map.native.tsx` | Native map (proximity market lookup — largest file, 28KB) |
| `src/frontend/app/map.tsx` / `map.web.tsx` | Web platform stubs for map screen |
| `src/frontend/components/Header.tsx` | Shared header component |
| `src/frontend/components/Footer.tsx` | Shared footer/nav component |
| `src/frontend/components/Sidebar.tsx` | Sidebar component |
| `src/frontend/components/productCard.tsx` | Product card component |
| `.agents/DESIGN.md` | UI design token spec — `useTheme()` keys, typography, spacing, component rules |

### Skills & Agent Tooling (`.agents/`)

| File / Directory | Purpose |
|---|---|
| `.agents/rules/` | Modular rule triggers: `core-protocol.md`, `universal-rules.md`, `code-rules.md`, `design-rules.md`, `request-routing.md`, `quick-reference.md` |
| `.agents/memory/` | Persistent context: `MEMORY.md`, `project-conventions.md`, `tech-decisions.md`, `user-preferences.md`, `feedback-history.md` |
| `.agents/agent/` | 20 specialist roles: `mobile-developer.md`, `backend-specialist.md`, `database-architect.md`, `security-auditor.md`, `debugger.md`, `orchestrator.md`, etc. |
| `.agents/workflows/` | 13 slash commands: `brainstorm.md`, `coordinate.md`, `create.md`, `debug.md`, `deploy.md`, `enhance.md`, `orchestrate.md`, `plan.md`, `preview.md`, `remember.md`, `status.md`, `test.md`, `verify.md` |
| `.agents/hooks/` | Antigravity Doctor, MCP sync, PreToolUse safety gate (`validate-tool-call.mjs`), plugin builder |
| `.agents/scripts/` | `validate_kit.py`, `generate_manifest.py`, `dependency_graph.py`, `checklist.py`, `verify_all.py`, `component_registry.py` |
| `.agents/skills/backend/` | Backend architecture, Drizzle schema reference, PostGIS notes, implementation playbook |
| `.agents/skills/frontend/` | Frontend architecture, screen registry, domain service patterns, design token integration |
| `.agents/skills/typescript-pro/` | Advanced TypeScript typing, strict compiler compliance, type narrowing |
| `.agents/skills/nodejs-backend-patterns/` | Resilient Express patterns, middleware chains, async error handling |
| `.agents/skills/react-native-architecture/` | React Native / Expo best practices, navigation, safe area, native integration |
| `.agents/skills/api-design-principles/` | REST API standards, semantic HTTP status codes, consistent JSON envelopes |
| `.agents/skills/postgresql/` & `database-architect/` | PostgreSQL query optimization, relational indexing, PostGIS geo patterns |
| `.agents/skills/backend-security-coder/` | Security auditing, input sanitization, injection defense, JWT auth hardening |
| `.agents/skills/unit-testing-test-generate/` | Unit test generation and test harness scaffolding |
| `.agents/skills/code-review-ai-ai-review/` | Code quality review, cyclomatic complexity reduction, clean code enforcement |
| `.agents/skills/error-debugging-error-analysis/` | Systematic stack trace analysis, error diagnosis, root cause resolution |
| `.agents/skills/antigravity-skills-manager/` | On-demand skill installer and manager for Google Antigravity |
| `.agents/tools/skills_cli.py` | CLI for searching, listing bundles, and installing 300+ skills from catalog |
| `.agents/CATALOG.md` & `catalog.json` | Catalog of 300+ Antigravity skills available for on-demand installation |
| `.agents/bundles.json` & `aliases.json` | Curated skill bundles and short command aliases |
| `.agents/manifest.json` & `manifest.lock.json` | Deterministic component registry and SHA-256 integrity lock |
| `.agents/DEPENDENCY_GRAPH.md` | Auto-generated component dependency graph |
| `.agents/ARCHITECTURE.md` | Comprehensive capability and architecture inventory |

---

## 3. Active Tasks & Roadmap

- [x] Modular DDD backend with Drizzle ORM and JWT + Redis auth.
- [x] Frontend HTTP abstraction (`apiRequest`) with auto-refresh on 401.
- [x] Agent guidelines (`AGENTS.md`), project index (`CURRENT.md`), commit log (`COMMITS.md`).
- [x] Complete product CRUD on backend (`ProductRepository`, `ProductService`, `ProductController`, `product.routes.ts`).
- [x] Complete product CRUD on frontend (`productService.ts`, `customRegisterProduct.tsx`, `productDetails.tsx`, `search.tsx`, `index.tsx`).
- [x] Integrated Antigravity AG-Kit with INI3A-EQ3 (Rules, Memory, 20 Agents, 13 Workflows, 60 Skills, Hooks, Scripts).
- [x] Complete settings functionalities (export/import JSON backup, live password change via `PATCH /auth/password`, account deletion, cache clearing, scanner haptics).
- [ ] Wire `scannerProduct.tsx` → `scannerConfirmation.tsx` flow with market selection.
- [ ] Implement `ocurrency` (price report) submission endpoint and service.
- [ ] Implement market proximity lookup in frontend map screen.
- [ ] Add missing module routes and controllers for `market` and `ocurrency`.
- [ ] Wire `scannerProduct.tsx` → `scannerConfirmation.tsx` flow with market selection.
- [ ] Implement `ocurrency` (price report) submission endpoint and service.
- [ ] Implement market proximity lookup in frontend map screen.
- [ ] Add missing module routes and controllers for `market` and `ocurrency`.

---

## 4. AI Agent Operational Instructions

1. Read `.agents/CURRENT.md` first on every task to locate target files without directory scans.
2. After any code change: update sections 1 and 2 of this file if context or file inventory changed.
3. Append a commit log entry to `.agents/COMMITS.md` for every change made.
