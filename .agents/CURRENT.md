# CURRENT.md - Project State & Navigation Index

Executive summary and direct file index for token-efficient agent navigation. Read this file first on every task.

---

## 1. Executive Summary

**Snapshot:** Presco (`INI3A-EQ3`, `v1.6.0`) — Express 5 + TS + Drizzle (PostgreSQL/PostGIS) + Redis API on `:3333` (`https://eq.projetoscti.com.br/26-presco`), and RN 0.86.3 + Expo SDK 57 + Expo Router + Reanimated 4 + Monet + 7-lang i18n app. Specs: `.agents/skills/presco-backend/SKILL.md`, `.agents/skills/presco-frontend/SKILL.md`. Archive: `.agents/HISTORY.md`.

**Recent Sprints (Top 4):**
- **Waterfall Validation, PLU & Quarantine (`v1.6.0` - `feat/existential-product-validation`):** 3-tier waterfall (`OpenFoodFacts/UPCitemdb -> VTEX circuit breaker -> Cosmos`) + 0ms local/LRU pass, GS1 prefix-`2` PLU detection (`barcodeValidator.ts`), `pending_review` quarantine (`is_suspended=true`) needing 3 distinct users (`product_submission`) for `+25 XP`, live `GET /products/validate-existence`, and enriched `adminModeration.tsx` tabs; 51/51 backend + 32/32 root tests, 0 `typecheck` errors, `versionCode: 35`.
- **Management Docs Reorganization (`gestao/`):** Removed 4 duplicates, standardized names into `01-planejamento/`..`06-identidade-e-assets/`, indexed in `gestao/README.md`.
- **Map Filtering, Cart No-Price Fix, Photos & GS1 (`v1.5.3`):** Fixed HERE `600-6300-*` categories, `isLocationResolved` deadlock, `.full.jpg`/`.400.jpg` fallback & `onError`, dropped fake cart fallback prices, added GS1 Mod-10 check & `marketId` filter in `search.tsx` (`versionCode: 34`).
- **Stress, Journeys & Redis Chaos Audit (`test/aggressive-stress-chaos-audit`):** k6 100-VU ramp (cart solver, Z-score outliers, vote quorum, GIN/GiST search), Redis stop/fallback chaos in `nightly-audit.yml`, 8 DB integrity checks (`verify_database_integrity.ts`).

---

## 2. Navigation Index

Direct relative paths from project root.

### Backend

| File | Key exports / purpose |
|---|---|
| `src/backend/src/app.ts` | Express app, routers, `/health`, `errorHandler` |
| `src/backend/src/server.ts` | `bootstrap()` — Redis, DB, seed, HTTP |
| `src/backend/src/shared/database/seed.ts` | `seedDatabase()` — roles, badges, shop, markets, users |
| `src/backend/src/modules/auth/auth.routes.ts` | Auth routes (`/register`, `/login`, `/refresh`, `/me`, `/logout`) |
| `src/backend/src/modules/auth/auth.controller.ts` | `authController` |
| `src/backend/src/modules/auth/auth.service.ts` | `authService` — auth, tokens, profile, account |
| `src/backend/src/modules/customization/customization.routes.ts` | Customization routes (`/shop`, `/buy`, `/equip`, `/unequip`) |
| `src/backend/src/modules/customization/customization.controller.ts` | `customizationController` |
| `src/backend/src/modules/customization/customization.service.ts` | `customizationService` — catalog, XP unlock, equip |
| `src/backend/src/modules/product/product.routes.ts` | Product routes (CRUD, `validate-existence`, admin review) |
| `src/backend/src/modules/product/product.controller.ts` | `productController` |
| `src/backend/src/modules/product/product.service.ts` | `productService` — waterfall, quarantine, CRUD, stats |
| `src/backend/src/modules/ocurrency/ocurrency.routes.ts` | Ocurrency routes (`/product/:id`, `/`, `/:id/vote`, `/:id`) |
| `src/backend/src/modules/ocurrency/ocurrency.controller.ts` | `ocurrencyController` |
| `src/backend/src/modules/ocurrency/ocurrency.service.ts` | `ocurrencyService` — prices, XP, outlier detection |
| `src/backend/src/modules/market/market.routes.ts` | Market routes (`/`, `/:id`, `/reallocate`) |
| `src/backend/src/modules/market/market.controller.ts` | `marketController` |
| `src/backend/src/modules/market/market.service.ts` | `marketService` — listing, bounds check, creation |
| `src/backend/src/shared/services/hereMarketDiscovery.service.ts` | `HereMarketDiscovery` — HERE Places v7 + PostGIS sync |
| `src/backend/src/modules/image/image.routes.ts` | Image routes (`/optimize?url=&w=&q=&fmt=`) |
| `src/backend/src/modules/image/image.controller.ts` | `imageOptimizerController` — Sharp WebP/AVIF + Redis cache |
| `src/backend/src/modules/cart/cart.routes.ts` | Cart routes (`/`, `/items`, `/optimize`) |
| `src/backend/src/modules/cart/cart.controller.ts` | `cartController` |
| `src/backend/src/modules/cart/cart.service.ts` | `cartService` — cart ops & multi-store optimizer |
| `src/backend/src/shared/database/repositories/cart.repository.ts` | `CartRepository` — cart persistence & prices |
| `src/backend/src/shared/services/routing.service.ts` | `RoutingService` — HERE Routing v8, Haversine, TSP |
| `src/backend/src/shared/constants/productCategories.ts` | 15 canonical categories & alias normalization |
| `src/backend/src/shared/database/schema.ts` | Drizzle tables (`user`, `product`, `market`, `ocurrency`, `cart`) |
| `src/backend/src/shared/database/database.ts` | `db`, `pool`, `testDatabaseConnection`, `checkDatabaseHealth` |
| `src/backend/src/shared/database/healthCheck.ts` | CLI DB & Redis health check |
| `src/backend/src/shared/database/repositories/customization.repository.ts` | `CustomizationRepository` — shop & equipped items |
| `src/backend/src/shared/services/email.service.ts` | `EmailService` — Resend 2FA email transport |
| `src/backend/src/shared/database/repositories/user.repository.ts` | `UserRepository` — users, XP, roles, badges, rank |
| `src/backend/src/shared/database/repositories/auth.repository.ts` | `AuthRepository` — Redis refresh, blacklists, 2FA |
| `src/backend/src/shared/database/repositories/ocurrency.repository.ts` | `OcurrencyRepository` — prices, votes, activity grid |
| `src/backend/src/shared/database/repositories/product.repository.ts` | `ProductRepository` — catalog, EAN, quarantine, stats |
| `src/backend/src/shared/database/repositories/market.repository.ts` | `MarketRepository` — PostGIS `ST_DWithin`/`ST_Distance` |
| `src/backend/src/shared/errors/errors.ts` | `AppError` subclasses (`400`–`501`) |
| `src/backend/src/shared/middlewares/cacheMiddleware.ts` | `cacheResponse` (ETag + Redis/Memory), invalidation |
| `src/backend/src/shared/middlewares/rateLimiter.ts` | `authRateLimiter`, `searchRateLimiter`, `createRateLimiter` |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Global Express error handler |
| `src/backend/src/shared/middlewares/authMiddleware.ts` | `requireAuth`, `requireAdmin`, `requireMinAuthority` |
| `src/backend/src/shared/config/env.ts` | Multi-path env loader |
| `src/backend/src/shared/redis/server.ts` | `redisClient`, `connectRedis`, `inMemoryStore` |
| `src/backend/src/shared/util/jwt.ts` | `signAccessToken`, `generateRefreshToken`, `verifyAccessToken` |
| `src/backend/src/shared/helpers/response.helper.ts` | `success(data, code?)` helper |
| `src/backend/src/shared/util/crashLogger.ts` | Crash logger to `logs/crash.log` |

### Dev Tooling & Launchers

| File | Key exports / purpose |
|---|---|
| `turbo.json` | Turborepo tasks (`dev`, `build`, `typecheck`, `lint`, `db:*`) |
| `docker-compose.yml` | PostGIS (`5433:5432`) + Redis (`6380:6379`) |
| `package.json` | Monorepo root scripts & version |
| `scripts/dev_launcher.ts` | Unified launcher (LAN, tunnel, localhost, remote) |
| `scripts/configure_env.ts` | Frontend `.env` mode switcher |
| `scripts/bump_version.ts` | Multi-package SemVer bumper |
| `.agents/skills/semver/SKILL.md` | SemVer 2.0.0 & release policy |
| `.agents/HISTORY.md` | Archived sprint logs, routes & `[x]` roadmap |
| `scripts/patch_ios_swift6.js` | Swift 6.1 / Xcode 16.4 patcher |
| `.github/workflows/release.yml` | Release Android APK & GitHub Releases workflow |
| `scripts/deploy_remote.sh` | Remote backend sync orchestrator |
| `deploy/deploy.sh` | Production deploy (`/var/www/equipes/26-presco`) |
| `ecosystem.config.cjs` | PM2 process config |
| `scripts/start_api_tunnel.ts` | Tunnel manager for API `:3333` |
| `scripts/verify_connection.ts` | Network, DB, Redis, API health verifier |
| `start_project.sh` | macOS/Linux launcher (`--lan`, `--corp`, `--localhost`) |
| `start_project.ps1` / `start.bat` | Windows launchers |
| `setup.sh` / `setup.ps1` / `setup.bat` | Initial setup, Docker, migrate & seed |
| `src/frontend/metro.config.js` | Metro monorepo config |

### Frontend

| File | Key exports / purpose |
|---|---|
| `src/frontend/services/api.ts` | `apiRequest<T>`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `src/frontend/services/auth.ts` | Auth, tokens, password, delete account, profile |
| `src/frontend/services/customizationService.ts` | Shop catalog, buy, equip, unequip |
| `src/frontend/services/productService.ts` | Products CRUD, EAN, validation, categories, history |
| `src/frontend/services/ocurrencyService.ts` | Price submit, occurrences, vote, update, delete |
| `src/frontend/services/marketService.ts` | `fetchMarkets`, `createMarket` |
| `src/frontend/services/cartService.ts` | Offline-first cart, travel settings, `/cart/optimize` |
| `src/frontend/app/_layout.tsx` | Root stack, gestures, theme/i18n/auth providers |
| `src/frontend/app/index.tsx` | Home dashboard with nearby products & promos |
| `src/frontend/app/cart.tsx` | Smart shopping list, store groups & GPS route |
| `src/frontend/components/cart/SavingsHeroCard.tsx` | Net savings card |
| `src/frontend/components/cart/OptimizationStrategyControl.tsx` | Strategy selector (`max_savings`, `balanced`, `single_store`) |
| `src/frontend/components/cart/StoreGroupCard.tsx` | Store group items, steppers, reallocation modal |
| `src/frontend/components/cart/TravelSettingsModal.tsx` | Fuel km/L, price, radius & round-trip modal |
| `src/frontend/components/cart/RoutePreviewModal.tsx` | Stop order, route metrics, maps launcher |
| `src/frontend/app/login.tsx` | Login & 1-tap dev quick login |
| `src/frontend/app/registerUser.tsx` | User registration |
| `src/frontend/app/scannerProduct.tsx` | Camera EAN scanner |
| `src/frontend/app/scannerConfirmation.tsx` | Scanned EAN confirmation |
| `src/frontend/app/customRegisterProduct.tsx` | Custom product entry & quarantine feedback |
| `src/frontend/app/registerProduct.tsx` | Price submission (`+15 XP`) |
| `src/frontend/app/search.tsx` | Debounced search, category & market chips, paging |
| `src/frontend/app/productDetails.tsx` | Product details, chart, prices, votes, admin |
| `src/frontend/app/profile.tsx` | XP, badges, heatmap, banners & shop modal |
| `src/frontend/app/settings.tsx` | Themes, Monet, haptics, backup, cache, security |
| `src/frontend/app/map.native.tsx` | Proximity map with HERE discovery & filters |
| `src/frontend/app/help.tsx` | Help center FAQ & search |
| `src/frontend/app/adminModeration.tsx` | Admin moderation tabs (products & held prices) |
| `src/frontend/app/about.tsx` | About screen, version & repository links |
| `src/frontend/theme/index.ts` | Design System root, `useTheme()`, Monet presets |
| `src/frontend/theme/tokens/primitives/` | Primitive tokens (colors, spacing, type, radii) |
| `src/frontend/theme/tokens/semantics/` | Semantic tokens (surfaces, texts, borders, icons) |
| `src/frontend/content/authContext.tsx` | `AuthProvider`, `useAuth()` |
| `src/frontend/content/themeContent.tsx` | Theme context bridge |
| `src/frontend/content/i18nContext.tsx` | `I18nProvider`, `useI18n()` (7 languages) |
| `src/frontend/content/tabNavigationContext.tsx` | Swipe tab navigation context |
| `src/frontend/constants/productCategories.ts` | 15 canonical categories & i18n helpers |
| `src/frontend/utils/dateUtils.ts` | Safe date parsing & display formatters |
| `src/frontend/utils/tutorialStorage.ts` | Tutorial flag (`@presco:hasSeenTutorial`) |
| `src/frontend/utils/imageUtils.ts` | `getOptimizedImageUrl` normalization |
| `src/frontend/components/TwoFactorModal.tsx` | 6-digit 2FA verification modal |
| `src/frontend/components/OnboardingTutorialModal.tsx` | Guided onboarding carousel |
| `src/frontend/components/CategorySelector.tsx` | Category chip selector |
| `src/frontend/components/SwipeTabNavigator.tsx` | 1:1 Reanimated swipe navigator |
| `src/frontend/components/KeyboardAwareScrollView.tsx` | Keyboard-aware scroll container |
| `src/frontend/components/FocusedInputWrapper.tsx` | Focused input highlight wrapper |

### Testing, QA Automation & CI/CD Infrastructure

| File | Key exports / purpose |
|---|---|
| `.github/workflows/pr-gatekeeper.yml` | Layer 1 PR gatekeeper (lint, typecheck, SAST, tests) |
| `.github/workflows/staging.yml` | Layer 2 `dev` tests & conditional staging APK |
| `.github/workflows/production.yml` | Layer 3 `main` validation, deploy, prod APK |
| `.github/workflows/nightly-audit.yml` | Layer 4 daily Docker + k6 stress + Redis chaos |
| `tests/concurrency/race_conditions.test.ts` | Race condition & quorum tests |
| `src/frontend/app.config.js` | Expo `devFlavor` vs `prodFlavor` config |
| `.cursorrules` | Branch, commit & test protection rules |
| `tests/k6/main.js` | k6 runner with `setup()` auth & HTML report |
| `tests/k6/config/environments.js` | Local vs remote k6 targets |
| `tests/k6/config/thresholds.js` | SLA thresholds |
| `tests/k6/scenarios/*.js` | 9 API scenario test suites |
| `tests/k6/user_journeys/*.js` | Multi-persona user journeys |
| `tests/k6/stress_and_soak/*.js` | 100-VU stress & spike tests |
| `tests/maestro/config.yaml` | Maestro app config (`com.presco.app`) |
| `tests/maestro/subflows/*.yaml` | Maestro login/logout/tutorial subflows |
| `tests/maestro/flows/*.yaml` | 10+ Maestro E2E mobile flows |
| `tests/maestro/run_maestro.sh` | Maestro CLI runner |
| `tests/cartOptimizer.test.ts` | Cart optimizer unit tests (AC1–AC5) |
| `src/backend/tests/cart.test.ts` | Backend cart API integration tests |

---

## 3. Active Tasks & Roadmap

- [ ] Monitoramento e Notificação de Preços para Produto Individual e Grupos/Listas de Compras (listas customizadas no perfil como "Compras do Mês" ou "Compras da Semana", tabelas `user_shopping_list` e `shopping_list_item`, botão de sino em `productDetails.tsx`, menor total da região e alertas de variação).

> Completed `[x]` roadmap items and historical sprint entries are archived in `.agents/HISTORY.md`.

---

## 4. AI Agent Operational Instructions

1. Read `.agents/CURRENT.md` first via `read_file` on every task to locate target files without broad directory scans.
2. After any code change, update Sections 1 and 2 of `.agents/CURRENT.md` if context or file inventory changed (archive old entries to `.agents/HISTORY.md` to stay under 15 KB / 300 lines).
3. Append a commit log entry directly to `.agents/COMMITS.md` without reading it first.
4. Git commits are strictly on-demand: NEVER execute `git commit` spontaneously; slice multi-layer changes into atomic Conventional Commits only when the user explicitly requests it.
