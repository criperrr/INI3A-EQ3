# AGENTS.md - System Guidelines & Architecture Index

Strict behavioral rules, code encapsulation patterns, project architecture, and token-saving navigation protocols for AI models working in this workspace.

---

## 1. Context Efficiency & Navigation Rules

### 1.1. Read CURRENT.md First
Always read `.agents/CURRENT.md` at the start of any task before calling `list_dir` or running broad `grep_search`. It contains the active task context and direct relative file pointers.

### 1.2. Surgical Tool Usage
- Use `view_file` with `StartLine` and `EndLine` to inspect only the function you need.
- Use `grep_search` with exact symbol names (e.g., `authController`, `ProductRepository`) to get line numbers before opening files.
- Avoid `list_dir` unless creating new folders or updating `CURRENT.md`.

### 1.3. Skills (Load Only When Relevant)
Deep architecture references are split into skills — load them only if the task touches that area:

- **Backend** (Express, Drizzle, Redis, Auth): `.agents/skills/presco-backend/SKILL.md`
  Covers: layer responsibilities, DB schema, error classes, Redis keys, `requireAuth`, `requireAdmin`, type namespaces, endpoint checklist, module file structure.
- **Frontend** (React Native, Expo Router, services, gestures, i18n): `.agents/skills/presco-frontend/SKILL.md`
  Covers: `apiRequest`, domain service patterns, screen map, component list, design token spec, Reanimated swipe navigation, localization in 7 languages.
- **Design tokens** (colors, typography, spacing, Monet): `.agents/DESIGN.md` or root `DESIGN.md`.
- **CRITICAL TOKEN RULE:** NEVER load `frontend-design` (23.5k tokens, web-only desktop CSS). For all Presco visual and UI tasks, use `presco-frontend`, `mobile-design`, and `DESIGN.md`.

---

## 2. Project Architecture

### 2.1. Technology Stack
- **Backend:** Node.js, Express 5, TypeScript. Path alias `@/*` resolves to `src/backend/src/*`.
- **ORM:** Drizzle ORM targeting PostgreSQL with PostGIS extension (for `geography` columns on `user` and `market`).
- **Session layer:** Redis (`redis` package). All token data lives in Redis; no token columns on DB tables.
- **Auth:** JWT access tokens (15 min, signed with `JWT_SECRET`, carry `id, email, name, roleId, jti`). Refresh tokens are 96-byte hex strings stored in Redis as `refresh:<token> → userId`.
- **Permissions:** Multi-role authority system with `requireAuth`, `requireAdmin` (roleId 5), `requireMinAuthority`.
- **Frontend:** React Native 0.86.3, Expo SDK 57, Expo Router for file-based routing, AsyncStorage for token persistence.
- **Motion & Gestures:** React Native Reanimated 4 with 1:1 finger tracking, `react-native-gesture-handler` 2, and `expo-haptics`.
- **Design:** Dynamic theming with Light, Dark, and AMOLED modes + System Monet color extraction via `useTheme()`.
- **i18n:** Type-safe translation engine with 7 languages (pt-BR, en-US, es-ES, de-DE, ru-RU, zh-CN, ja-JP).

### 2.2. Environment & Startup
Required `.env` variables for the backend (`src/backend/.env`):
```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
SERVER_PORT=3333
JWT_SECRET=<secret>
```

Dev startup: run `./start_project.sh` from project root:
- Default: Tunneling mode (`ini3a-eq3-api` on port 3333 and `ini3a-eq3-app` on port 8081).
- Local Wi-Fi NAT mode: `./start_project.sh --local-nat` (or `npm run dev:local`) for zero-latency local network testing with Expo Go QR code scanning.
- Services manager: `npm run db:status`, `npm run db:restart`, `npm run db:reload`, `npm run db:check`.

---

## 3. Backend: Code Encapsulation Rules

### 3.1. Layer Responsibilities and Flow

Request flow: `Routes → Controller → Service → Repository → DB/Redis`

**Routes** (`modules/[module]/[module].routes.ts`)
- Instantiate `Router()`. Mount middleware (`requireAuth`, `requireAdmin`) on protected routes. Delegate to controller method. No logic here.
- Protected routes pass `req` as `Api.Request` (augmented with `req.user: { id, email, name, roleId, jti, exp }`).
- Mounting in `app.ts`: `app.use("/auth", authRouter)`, `app.use("/products", productRouter)`, `app.use("/ocurrency", ocurrencyRouter)`, `app.use("/markets", marketRouter)`.

**Controller** (`modules/[module]/[module].controller.ts`)
- Class singleton: `export const xController = new XControllerClass()`.
- Every method signature: `async method(req, res, next)` — always wrap in `try/catch`, forward to `next(e)` on error.
- Validate `req.body`/`req.params` here. Build `errors: { field, message }[]` array and throw `new ValidationError(errors)` if invalid.
- On success: `return res.status(200 | 201).json(success(result))`. The `success()` helper returns `{ success: true, code: 200, data }`.

**Service** (`modules/[module]/[module].service.ts`)
- Class singleton: `export const xService = new XServiceClass()`.
- All business logic, hashing (`bcrypt` cost 10), JWT signing (`signAccessToken`), token rotation, gamification XP calculation, and domain validation live here.
- Throws typed AppError subclasses (see Section 3.3). Never returns HTTP status codes.
- Calls only Repository singletons for data access.

**Repository** (`shared/database/repositories/[entity].repository.ts`)
- Class singleton: `export const EntityRepository = new EntityRepositoryClass(db)` (or without `db` for Redis-only repos).
- The ONLY location where Drizzle ORM calls or Redis calls are made. No ORM/Redis outside repositories.

### 3.2. Database Schema (Drizzle — `shared/database/schema.ts`)

| Table | Key columns |
|---|---|
| `role` | `id, name, minPoints, authority` |
| `scope` | `id, scopeName` |
| `role_scope` | `roleId, scopeId` (composite PK) |
| `user` | `id, name, email, passHash, birthdate, points, dangerFlag, location (geography/PostGIS), roleId (FK→role), createdAt, updatedAt` |
| `badge` | `id, name, icon, minPoints` |
| `user_badge` | `userId, badgeId, awardedAt` (composite PK) |
| `product` | `id, ean (nullable text), ncm, name, description, icon, createdAt` — GIN index on `name` for trigram search |
| `market` | `id, name, location (geography/PostGIS), createdAt` — GiST index for proximity queries |
| `ocurrency` | `id, userId, marketId, productId, value (numeric 12,2), trustFlag, isSuspended, isResolved, upvoteCount, downvoteCount, volate, createdAt` — core price report entity |
| `cart` | `id, userId, createdAt` |
| `cart_product` | `cartId, productId, addedAt` (composite PK) |
| `cured` | `userId, ocurrencyId, verdict, date` — user moderation votes on ocurrencies |

Important: `geography` is a custom Drizzle type wrapping PostGIS. To write it: `{ lat, lng }`. To read it use `ST_AsGeoJson(col)` via `sql\`\``. Direct Drizzle `.select()` on geography columns returns raw WKB — always wrap with `sql`.

### 3.3. Error Classes (`shared/errors/errors.ts`)

All extend `AppError(internalCode, customMessage, httpCode)`:

| Class | `internalCode` | `httpCode` | Notes |
|---|---|---|---|
| `ForbiddenError` | `FORBIDDEN` | 403 | Insufficient role or authority |
| `NotFoundError` | `NOT_FOUND` | 404 | Resource not found in database |
| `ValidationError` | `VALIDATION_ERROR` | 422 | Carries `errors: { field, message }[]` |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Default message: "Invalid credentials." |
| `ConflictError` | `CONFLICT` | 409 | Default message: "Resource already exists." |
| `JTIrefused` | `JTI_REFUSED` | 401 | JTI blacklisted or missing |
| `MultipleApiError` | `MULTIPLE_ERRORS` | 400 (configurable) | Carries `errors: any[]` |
| `NotImplemented` | `<code>` | 501 | Stub placeholder |
| `InternalError` | `<code>` | `<code>` | Generic internal |

`errorHandler` middleware (last `app.use`) catches all `AppError` subclasses and produces:
```json
{ "success": false, "code": "INTERNAL_CODE", "message": "...", "errors": [...] }
```
Non-`AppError` exceptions produce HTTP 500 with `INTERNAL_SERVER_ERROR`.

### 3.4. Auth Middleware (`requireAuth`, `requireAdmin`)

- `requireAuth` (`shared/middlewares/authMiddleware.ts`):
  1. Reads `Authorization: Bearer <token>` header.
  2. Calls `verifyAccessToken(token)`.
  3. Checks Redis `blacklist:<jti>` via `AuthRepository.isAccessTokenBlacklisted(jti)`.
  4. Attaches decoded payload to `req.user: { id, email, name, roleId, jti, exp }`.
- `requireAdmin`: Ensures `req.user.roleId >= 5` or authority level matches administrator privilege.

### 3.5. Redis Key Schema

Managed exclusively through `AuthRepository`:
- `refresh:<token>` → `userId` string. TTL = `REFRESH_TOKEN_EXPIRY_SECONDS` (7 days).
- `blacklist:<jti>` → `"1"`. TTL = remaining seconds of the access token's lifetime.

Rotation (on `/auth/refresh`): atomic Redis multi — sets new `refresh:` key, deletes old one.

---

## 4. Frontend: Code Encapsulation Rules

### 4.1. HTTP Layer (`services/api.ts`)

`apiRequest<T>(endpoint, options, retry = true)`:
- Prepends `EXPO_PUBLIC_API_URL` (or `http://localhost:3333` fallback).
- Injects `Authorization: Bearer <token>` from AsyncStorage key `@presco:accessToken`.
- Sets `Bypass-Tunnel-Reminder: true` header (required for localtunnel).
- Enforces 15-second timeout via `AbortController`. Throws `ApiError(408, "TIMEOUT", ...)` on abort.
- On HTTP 401 with `retry = true`: calls `tryRefreshToken()`, then retries once.
- Throws `ApiError(status, code, message, errors)` on non-OK responses.

Storage keys (`STORAGE_KEYS`):
- `@presco:accessToken`
- `@presco:refreshToken`

Never call `fetch` directly inside screens or components. Always use `apiRequest` or a domain service.

### 4.2. Domain Services (`services/`)

- `auth.ts`: Authentication, profile data, password change, account deletion.
- `productService.ts`: Product CRUD, barcode search, category filter, price stats and history.
- `ocurrencyService.ts`: Price reports submission (+15 XP), product occurrence lists, voting (+5 XP), edit/delete.
- `marketService.ts`: Market listings and registration.

### 4.3. Screens (`app/`) & Expo Router

Key screens:
- `_layout.tsx` — root stack + theme, i18n and gesture providers
- `index.tsx` — home / dashboard screen
- `login.tsx` / `registerUser.tsx` — authentication flows (with 1-tap dev login)
- `scannerProduct.tsx` — camera EAN barcode scanning
- `scannerConfirmation.tsx` — confirm scanned product
- `customRegisterProduct.tsx` — manual product entry (+25 XP)
- `registerProduct.tsx` — price submission for a product (+15 XP)
- `search.tsx` — text-based and barcode debounced search
- `productDetails.tsx` — dynamic product view with statistics, charts, occurrences and voting
- `profile.tsx` — 100% dynamic profile with XP progress bar, unlocked badges and contribution grid
- `settings.tsx` — preferences, Monet palettes, backup export/import, cache clear, account controls
- `map.native.tsx` / `map.web.tsx` / `map.tsx` — proximity markets map

---

## 5. Adding New Backend Endpoints (Checklist)

1. Schema/Types: add table or column to `shared/database/schema.ts`; add DTO types to `shared/types/services.ts` and `shared/types/repositories.ts`.
2. Repository: add method(s) to the relevant class in `shared/database/repositories/`.
3. Service: add method(s) to the relevant class in `modules/[module]/[module].service.ts`.
4. Controller: add method to the class in `modules/[module]/[module].controller.ts`. Validate inputs, call service, respond with `success()`.
5. Routes: wire method in `modules/[module]/[module].routes.ts`. Apply `requireAuth` or `requireAdmin` if protected.
6. Mount: if a new module, `app.use("/route", newRouter)` in `src/backend/src/app.ts`.

---

## 6. Mandatory Update Rules

After any file modification or addition:
1. Update `.agents/CURRENT.md`: refresh task status, executive summary, and add new files to the Navigation Index.
2. Append entry to `.agents/COMMITS.md`.
   > **CRITICAL TOKEN RULE:** NEVER read `COMMITS.md` before appending (it contains 52k+ tokens of historical logs). Append directly to the end using this exact template:
   ```markdown
   ## `YYYY-MM-DD HH:MM` - `type(scope)`: Short title

   - **Description:** Summary of changes...
   - **Files Modified:**
     - `path/to/file`
   - **Impact / Next Steps:** Outcome and next steps.
   ```

---

## 7. Code Style & Conventions

- **Comments:** Write minimal comments. Self-documenting code through clear naming.
- **TypeScript:** Use `type` for DTOs; `interface` for extensible object shapes. Use `import type` for type-only imports. Use `async/await` throughout.
- **Singletons:** Controllers and Services are exported as singleton instances (`export const authController = new AuthControllerClass()`).
- **Geography/PostGIS:** Write as `{ lat, lng }`; read with `sql\`ST_AsGeoJson(${table.location})\``.
