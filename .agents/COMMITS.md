# COMMITS.md - Project Modification Log

Chronological record of all system modifications, additions, and refactorings.

---

## Mandatory Commit Format

All project changes MUST be appended using the exact structure below:

```markdown
## [YYYY-MM-DD HH:mm] - `TYPE(scope)`: Short title

- **Description:** Technical summary of changes and rationale.
- **Files Modified:**
  - `path/to/file1`
  - `path/to/file2`
- **Impact / Next Steps:** System impact, required testing, or follow-up tasks.
```

Allowed Types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`.

---

## Modification History

## [2026-08-11 19:41] - fix(backend): align productController with success() helper and errorHandler pattern

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

## [2026-08-15 10:37] - feat(backend/frontend): implement complete product CRUD operations

- **Description:** Implemented full end-to-end CRUD for products. Added `NotFoundError` error class, DTO types, and repository methods (`getAllProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`). Added service logic with EAN uniqueness validation, controller endpoints using `success()` envelope and `ValidationError`, and RESTful Express routes. On frontend, implemented domain service functions in `productService.ts`, connected `index.tsx` (real products + pull-to-refresh), `search.tsx` (debounced search), `customRegisterProduct.tsx` (create and edit modes), and `productDetails.tsx` (dynamic load + edit and delete action buttons).
- **Files Modified:**
  - `src/backend/src/shared/errors/errors.ts`
  - `src/backend/src/shared/types/services.ts`
  - `src/backend/src/shared/types/repositories.ts`
  - `src/backend/src/shared/database/repositories/product.repository.ts`
  - `src/backend/src/modules/product/product.service.ts`
  - `src/backend/src/modules/product/product.controller.ts`
  - `src/backend/src/modules/product/product.routes.ts`
  - `src/frontend/services/productService.ts`
  - `src/frontend/app/index.tsx`
  - `src/frontend/app/search.tsx`
  - `src/frontend/app/customRegisterProduct.tsx`
  - `src/frontend/app/productDetails.tsx`
  - `src/frontend/app/manualEanSearch.tsx`
  - `src/frontend/app/scannerProduct.tsx`
  - `.agents/CURRENT.md`
- **Impact / Next Steps:** Full product lifecycle management is now available in both API and UI. Next step on roadmap is wiring the scanner flow with market selection and ocurrency creation.

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

## [2026-08-15 11:05] - feat(agents): complete fusion and customization of AG-Kit with local INI3A-EQ3 architecture

- **Description:** Successfully unified the local surgical efficiency protocol of INI3A-EQ3 with the complete capability matrix of AG-Kit (`vudovn/ag-kit`). Configured modular trigger-based rules in `.agents/rules/`, persistent memory architecture in `.agents/memory/`, 20 specialist agent personas in `.agents/agent/` custom-tailored for INI3A-EQ3 (React Native Expo mobile, Express DDD backend, PostGIS spatial database), 13 slash-command workflows in `.agents/workflows/`, 60 SemVer-compliant skills in `.agents/skills/`, native PreToolUse safety gate in `.agents/hooks/` and `hooks.json`, runtime contract in `antigravity.json`, MCP integration in `mcp_config.json`, and automated validation scripts (`validate_kit.py`, `generate_manifest.py`, `dependency_graph.py`). Verified with 100% passing test suites and 0 validation errors.
- **Files Modified:**
  - `.agents/rules/*`
  - `.agents/memory/*`
  - `.agents/agent/*`
  - `.agents/workflows/*`
  - `.agents/skills/*`
  - `.agents/hooks/*`
  - `.agents/scripts/*`
  - `.agents/antigravity.json`
  - `.agents/hooks.json`
  - `.agents/mcp_config.json`
  - `.agents/manifest.json`
  - `.agents/manifest.lock.json`
  - `.agents/DEPENDENCY_GRAPH.md`
  - `.agents/ARCHITECTURE.md`
  - `.agents/README.md`
  - `.agents/VERSION`
  - `.agents/AGENTS.md`
  - `.agents/CURRENT.md`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Workspace is now an enterprise-grade Google Antigravity environment with surgical context efficiency, full self-validation, safety enforcement, and custom project playbooks.

---

## [2026-08-15 11:15] - fix(security/architecture): comprehensive backend security hardening and frontend robustness

- **Description:** Executed full security, architectural, and bug fixes across backend and frontend:
  1. **Backend User Data Sanitization:** Stripped `passHash` in `authService.getUserById` and `authService.updateUser`; replaced raw generic errors with typed `NotFoundError`, `ValidationError`, and `InternalError`.
  2. **500 Error Disclosure Prevention:** Masked unexpected 500 error messages in `errorHandler.ts` to prevent internal database and stack trace exposure.
  3. **Input Validation Strengthening:** Added RFC 5322 regex and length constraints (2-100 name, 6-128 password) in `authController`.
  4. **PostGIS SQL Injection Hardening:** Converted `market.repository.ts` from string interpolation into parameterized `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`.
  5. **External API Defense:** Added alphanumeric sanitization, User-Agent, and 8-second `AbortController` timeout to OpenFoodFacts API integration in `product.repository.ts`.
  6. **JWT Algorithm Confusion Defense:** Specified `algorithms: ["HS256"]` in `jwt.ts` verification.
  7. **Redis Server Fix:** Corrected `verifyJTI` prefix to `blacklist:${jti}`.
  8. **Product Controller Standard:** Enforced `NotFoundError` in `getProductByBarcode`.
  9. **Frontend UTF-8 Base64 Safe Decoding:** Upgraded `decodeJwtPayload` in `authContext.tsx` with full UTF-8/Unicode decoding support for React Native / Hermes.
  10. **Profile Auth Connection:** Connected `profile.tsx` to `useAuth()` state with real dynamic user details and real logout.
  11. **Image Fallback Normalization:** Replaced broken placeholder URLs across `scannerProduct.tsx`, `scannerConfirmation.tsx`, `registerProduct.tsx`, and `manualEanSearch.tsx` with reliable Unsplash assets.
- **Files Modified:**
  - `src/backend/src/shared/database/repositories/user.repository.ts`
  - `src/backend/src/shared/database/repositories/product.repository.ts`
  - `src/backend/src/shared/database/repositories/market.repository.ts`
  - `src/backend/src/shared/middlewares/errorHandler.ts`
  - `src/backend/src/shared/util/jwt.ts`
  - `src/backend/src/shared/redis/server.ts`
  - `src/backend/src/modules/auth/auth.service.ts`
  - `src/backend/src/modules/auth/auth.controller.ts`
  - `src/backend/src/modules/product/product.controller.ts`
  - `src/frontend/content/authContext.tsx`
  - `src/frontend/app/profile.tsx`
  - `src/frontend/app/scannerProduct.tsx`
  - `src/frontend/app/scannerConfirmation.tsx`
  - `src/frontend/app/registerProduct.tsx`
  - `src/frontend/app/manualEanSearch.tsx`
  - `.agents/COMMITS.md`
- **Impact / Next Steps:** Full test suite, static typechecking, and AG-Kit validation pass with 0 errors. Backend and frontend are hardened against OWASP vulnerabilities and runtime edge cases.

