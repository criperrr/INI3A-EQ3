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