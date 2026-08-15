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
Deep architecture references and domain playbooks are organized as Antigravity Skills in `.agents/skills/`. Load them only if the task touches that domain:

- **Backend** (`.agents/skills/backend/SKILL.md`): Layer flow, Drizzle schema, PostGIS geography, Redis keys, error classes, auth middleware, endpoint checklist.
- **Frontend** (`.agents/skills/frontend/SKILL.md`): `apiRequest`, domain services, screen map, component registry, design token usage.
- **Design Tokens** (`.agents/DESIGN.md`): UI palette, spacing, typography, radii, input/button specifications.
- **TypeScript Pro** (`.agents/skills/typescript-pro/SKILL.md`): Strict typing, generics, advanced utility types, type narrowing.
- **Node.js Backend Patterns** (`.agents/skills/nodejs-backend-patterns/SKILL.md`): Resilient Express architecture, async error safety, middleware chaining.
- **React Native Architecture** (`.agents/skills/react-native-architecture/SKILL.md`): Expo Router best practices, safe area handling, native modules, offline storage.
- **API Design Principles** (`.agents/skills/api-design-principles/SKILL.md`): RESTful standards, semantic HTTP codes, DTO consistency.
- **PostgreSQL & Database Architect** (`.agents/skills/postgresql/SKILL.md`, `.agents/skills/database-architect/SKILL.md`): Indexing strategies, relational design, PostGIS spatial queries.
- **Backend Security Coder** (`.agents/skills/backend-security-coder/SKILL.md`): Threat modeling, input sanitization, injection defense, auth validation.
- **Unit Testing** (`.agents/skills/unit-testing-test-generate/SKILL.md`): Unit test generation, test runners, mocks/stubs.
- **Code Review** (`.agents/skills/code-review-ai-ai-review/SKILL.md`): Clean code audit, complexity reduction, refactoring.
- **Error Diagnostics** (`.agents/skills/error-debugging-error-analysis/SKILL.md`): Systematic debugging, stack trace analysis, root cause resolution.
- **On-Demand Skill Catalog**: Search and install from 300+ skills in `CATALOG.md` via `python3 .agents/tools/skills_cli.py search <term>` / `install <skill_id>`.

### 1.4. Antigravity Modular Toolkit & Memory
- **Rules (`.agents/rules/`):** `core-protocol.md` (P0), `universal-rules.md` (P0), `code-rules.md` (P0), `design-rules.md` (P0), `request-routing.md` (P1), `quick-reference.md` (P2).
- **Persistent Memory (`.agents/memory/`):** Read `MEMORY.md` for project conventions, technical decisions, and user preferences.
- **Workflows (`.agents/workflows/`):** Repeatable slash commands (`/plan`, `/coordinate`, `/create`, `/debug`, `/test`, `/verify`, `/remember`, `/status`).
- **Specialist Agents (`.agents/agent/`):** 20 domain roles (`mobile-developer`, `backend-specialist`, `database-architect`, `security-auditor`, `debugger`, `test-engineer`, `orchestrator`, etc.).
- **Native Safety Hook (`.agents/hooks/`):** `PreToolUse` gate in `hooks.json` validated by `validate-tool-call.mjs`.
- **Validation Scripts (`.agents/scripts/`):** `validate_kit.py`, `generate_manifest.py`, `dependency_graph.py`, `checklist.py`.

---

## 2. Project Architecture

### 2.1. Technology Stack
- **Backend:** Node.js, Express, TypeScript. Path alias `@/*` resolves to `src/backend/src/*`.
- **ORM:** Drizzle ORM targeting PostgreSQL with PostGIS extension (for `geography` columns on `user` and `market`).
- **Session layer:** Redis (`redis` package). All token data lives in Redis; no token columns on DB tables.
- **Auth:** JWT access tokens (15 min, signed with `JWT_SECRET`, carry `id, email, name, roleId, jti`). Refresh tokens are 96-byte hex strings stored in Redis as `refresh:<token> → userId`.
- **Frontend:** React Native, Expo (SDK), Expo Router for file-based routing, AsyncStorage for token persistence.
- **Design:** Single design token source at `DESIGN.md`. All components must consume `useTheme()`.

### 2.2. Environment
Required `.env` variables for the backend (`src/backend/.env`):
```
DATABASE_URL   postgres://user:password@localhost:5432/dbname
REDIS_URL      redis://localhost:6379
SERVER_PORT    3333
JWT_SECRET     <secret>
```
Dev startup: run `./start_project.sh` from project root. It opens a `tmux` session named `dev` with two panes (backend left, frontend right) and two localtunnel subdomains: `ini3a-eq3-api` (port 3333) and `ini3a-eq3-app` (port 8081). The backend must respond on port 3333 before the frontend starts. Frontend receives `EXPO_PUBLIC_API_URL` pointing at the tunnel URL.

---

## 3. Backend: Code Encapsulation Rules

### 3.1. Layer Responsibilities and Flow

Request flow: `Routes → Controller → Service → Repository → DB/Redis`

**Routes** (`modules/[module]/[module].routes.ts`)
- Instantiate `Router()`. Mount middleware (`requireAuth`) on protected routes. Delegate to controller method. No logic here.
- Protected routes pass `req` as `Api.Request` (augmented with `req.user: { id, email, name, roleId, jti, exp }`).
- Mounting in `app.ts`: `app.use("/auth", authRouter)`, `app.use("/products", productRouter)`.

**Controller** (`modules/[module]/[module].controller.ts`)
- Class singleton: `export const xController = new XControllerClass()`.
- Every method signature: `async method(req, res, next)` — always wrap in `try/catch`, forward to `next(e)` on error.
- Validate `req.body`/`req.params` here. Build `errors: { field, message }[]` array and throw `new ValidationError(errors)` if invalid.
- On success: `return res.status(201).json(success(result))`. The `success()` helper returns `{ success: true, code: 200, data }`.
- NOTE: `product.controller.ts` currently does NOT use the `success()` helper — uses raw JSON. Fix to align pattern when touching that file.

**Service** (`modules/[module]/[module].service.ts`)
- Class singleton: `export const xService = new XServiceClass()`.
- All business logic, hashing (`bcrypt` cost 10), JWT signing (`signAccessToken`), token rotation, and domain validation live here.
- Throws typed AppError subclasses (see Section 3.3). Never returns HTTP status codes.
- Calls only Repository singletons for data access.

**Repository** (`shared/database/repositories/[entity].repository.ts`)
- Class singleton: `export const EntityRepository = new EntityRepositoryClass(db)` (or without `db` for Redis-only repos).
- The ONLY location where Drizzle ORM calls or Redis calls are made. No ORM/Redis outside repositories.
- `UserRepository` and `ProductRepository` take `db` in constructor. `AuthRepository` and `MarketRepository` use module-level imports.

### 3.2. Database Schema (Drizzle — `shared/database/schema.ts`)

All tables with their key columns:

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

### 3.4. Auth Middleware (`requireAuth`)

`requireAuth` (`shared/middlewares/authMiddleware.ts`):
1. Reads `Authorization: Bearer <token>` header.
2. Calls `verifyAccessToken(token)` (throws if invalid/expired).
3. Checks Redis `blacklist:<jti>` via `AuthRepository.isAccessTokenBlacklisted(jti)`. Throws `JTIrefused`/`UnauthorizedError` if blacklisted.
4. Attaches decoded payload to `req.user: { id, email, name, roleId, jti, exp }`.

### 3.5. Redis Key Schema

Managed exclusively through `AuthRepository`:
- `refresh:<token>` → `userId` string. TTL = `REFRESH_TOKEN_EXPIRY_SECONDS` (7 days as of `jwt.ts`).
- `blacklist:<jti>` → `"1"`. TTL = remaining seconds of the access token's lifetime.

Rotation (on `/auth/refresh`): atomic Redis multi — sets new `refresh:` key, deletes old one.

### 3.6. Type Namespaces

- `Services.*` (`shared/types/services.ts`): types used in Service method signatures. `CreateUser = { name, email, password }`. `UpdateUser` omits system-managed fields.
- `Repositories.*` (`shared/types/repositories.ts`): types used in Repository method signatures. `CreateUser = { name, email, passHash }` (note: has `passHash`, not `password`).
- `Api.Request` (`shared/@types/`): Express Request extended with `req.user`.
- `ProductInfo` (`shared/types/product.ts`): `{ barcode, name, category, imageUri, lastPrice }` — the DTO returned by product service.

---

## 4. Frontend: Code Encapsulation Rules

### 4.1. HTTP Layer (`services/api.ts`)

`apiRequest<T>(endpoint, options, retry = true)`:
- Prepends `EXPO_PUBLIC_API_URL` (or `http://localhost:3000` fallback).
- Injects `Authorization: Bearer <token>` from AsyncStorage key `@presco:accessToken`.
- Sets `Bypass-Tunnel-Reminder: true` header (required for localtunnel).
- Enforces 15-second timeout via `AbortController`. Throws `ApiError(408, "TIMEOUT", ...)` on abort.
- On HTTP 401 with `retry = true`: calls `tryRefreshToken()` (POSTs to `/auth/refresh`, updates both tokens in AsyncStorage), then retries once with `retry = false`.
- Throws `ApiError(status, code, message, errors)` on non-OK responses.

Storage keys (in `STORAGE_KEYS`):
- `@presco:accessToken`
- `@presco:refreshToken`

Never call `fetch` directly inside screens or components. Always use `apiRequest` or a domain service that wraps it.

### 4.2. Domain Services (`services/`)

- `auth.ts`: `registerUser(name, email, password)`, `loginUser(email, password)`, `logoutUser()`, `getStoredTokens()`. Registration and login store tokens in AsyncStorage. Logout calls `/auth/logout`, then clears storage regardless of API result.
- `productService.ts`: `fetchProductByEan(ean)` — GET `/products/barcode/:ean`. Returns `ProductData | null` (silences errors and returns null on failure).

When adding a new domain service file: import only `apiRequest` from `./api`, define typed interfaces for request/response, export named async functions.

### 4.3. Screens (`app/`)

File-based routing via Expo Router. Key screens:
- `_layout.tsx` — root stack + theme provider
- `index.tsx` — home/dashboard
- `login.tsx` / `registerUser.tsx` — authentication flows
- `scannerProduct.tsx` — camera EAN scan (uses `expo-barcode-scanner` or similar)
- `scannerConfirmation.tsx` — confirm scanned product before submission
- `customRegisterProduct.tsx` — manual product entry without EAN
- `registerProduct.tsx` — price entry for a scanned/found product
- `search.tsx` — text-based product search
- `productDetails.tsx` — product detail view
- `profile.tsx` — user profile and points
- `settings.tsx` — theme toggle and app preferences
- `map.native.tsx` / `map.web.tsx` / `map.tsx` — platform-split map screen (proximity markets)

### 4.4. Design System

All style values come from `useTheme()`. Available tokens (full spec in `DESIGN.md`):
- `themeStyles.bg`, `.card`, `.headerBg`, `.border`, `.text`, `.subText`, `.inputBg`
- `accent` — extracted from system Monet colors or preset fallback
- Typography: headings 22px bold, section titles 18px bold, labels 14px semibold, inputs 16px medium
- Border radius: cards 20–24, inputs/buttons 16–20, badges 12
- Inputs: height 50–54px, left Ionicons icon in `accent`

---

## 5. Adding New Backend Endpoints (Checklist)

1. Schema/Types: add table or column to `shared/database/schema.ts`; add DTO types to `shared/types/services.ts` and `shared/types/repositories.ts`.
2. Repository: add method(s) to the relevant class in `shared/database/repositories/`.
3. Service: add method(s) to the relevant class in `modules/[module]/[module].service.ts`.
4. Controller: add method to the class in `modules/[module]/[module].controller.ts`. Validate inputs, call service, respond with `success()`.
5. Routes: wire method in `modules/[module]/[module].routes.ts`. Apply `requireAuth` if protected.
6. Mount: if a new module, `app.use("/route", newRouter)` in `src/backend/src/app.ts`.

---

## 6. Mandatory Update Rules

After any file modification or addition:
1. Update `.agents/CURRENT.md`: refresh task status, executive summary, and add new files to the Navigation Index.
2. Append entry to `.agents/COMMITS.md` using the standard commit template.

---

## 7. Code Style & Conventions

### 7.1. Comments Policy

Write the minimum number of comments possible. Code should be self-documenting through clear naming. The only acceptable comment cases are:

- A single-line note for a non-obvious workaround or known technical constraint (e.g., the PostGIS `geography` custom type quirk in `schema.ts`).
- A `// TODO:` marker for deferred work, with a brief reason.
- A JSDoc comment on exported utility functions that are not self-evident from their signature (e.g., `response.helper.ts`).

Do not add comments that restate what the code does. No section dividers, no "block headers", no inline explanations for standard patterns. Existing comments in files should not be removed unless they are actively misleading.

### 7.2. TypeScript Style

Follow the patterns already established in the codebase:

- Use `type` for all DTO and alias definitions. Use `interface` only for object shapes that may be extended (e.g., `OpenFoodFactsProduct` in `product.ts`).
- Import types with `import type` when the import is only used as a type (already done in services and controllers).
- Prefer named exports over default exports, except for routers (`export default r`) and the Express app (`export default app`), which already use default exports.
- Use `async/await` throughout. Never use `.then()` chains.
- In controllers, always declare the `errors` array explicitly before validation and push into it, then check `errors.length > 0` — do not throw inline on the first failing field.
- Avoid `any` types. When the shape is truly unknown, use `unknown` and narrow it. `any` is only acceptable in legacy spots already present in the codebase (e.g., `MultipleApiError.errors`).

### 7.3. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Classes | PascalCase suffixed with role | `AuthServiceClass`, `UserRepositoryClass` |
| Exported singletons | camelCase, no suffix | `authService`, `UserRepository` |
| Route files | `[module].routes.ts` | `auth.routes.ts` |
| Controller files | `[module].controller.ts` | `product.controller.ts` |
| Service files | `[module].service.ts` | `auth.service.ts` |
| Repository files | `[entity].repository.ts` | `user.repository.ts` |
| DB schema tables | camelCase variable, snake_case column names | `const user = pgTable("user", { passHash: varchar("pass_hash") })` |
| Frontend service files | camelCase, descriptive noun | `productService.ts`, `auth.ts` |
| React screens | camelCase, descriptive action | `registerUser.tsx`, `scannerProduct.tsx` |
| React components | PascalCase | `Header.tsx`, `productCard.tsx` |

### 7.4. Creating New Backend Module Files

When creating a new module (e.g., `ocurrency`), create exactly these four files mirroring the existing structure:

```
src/backend/src/modules/ocurrency/
  ocurrency.routes.ts     ← instantiate Router(), wire methods, export default
  ocurrency.controller.ts ← class + singleton export, try/catch, success()
  ocurrency.service.ts    ← class + singleton export, business logic only
```

The repository goes in `shared/database/repositories/ocurrency.repository.ts`.

Minimal skeleton for a new controller method:
```typescript
async createOcurrency(req: Api.Request, res: Response, next: NextFunction) {
  try {
    const { productId, marketId, value } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!productId) errors.push({ field: "productId", message: "Required." });
    if (!marketId)  errors.push({ field: "marketId",  message: "Required." });
    if (!value)     errors.push({ field: "value",     message: "Required." });

    if (errors.length > 0) throw new ValidationError(errors);

    const result = await ocurrencyService.create({ userId: req.user.id, productId, marketId, value });
    return res.status(201).json(success(result));
  } catch (e) {
    next(e);
  }
}
```

### 7.5. Creating New Frontend Service Files

Each domain service file follows this exact structure:

```typescript
import { apiRequest } from "./api";

export interface SomethingData { ... }

export async function doSomething(param: string): Promise<SomethingData> {
  return apiRequest<SomethingData>("/endpoint", {
    method: "POST",
    body: JSON.stringify({ param }),
  });
}
```

Rules:
- Only import `apiRequest` (and `STORAGE_KEYS` if storage access is needed) from `./api`.
- Define and export typed interfaces for all request and response shapes in the same file.
- Exported functions must be named and async.
- If the function is a safe read that should not throw on error (like `fetchProductByEan`), catch internally and return `null`.

### 7.6. Geography / PostGIS Handling

The `geography` custom type in `schema.ts` only accepts `{ lat, lng }` as input. When reading geography columns back from the DB:
- Direct Drizzle `.select()` returns raw WKB binary — do not use.
- Always wrap the column with `sql\`ST_AsGeoJson(${table.location})\`` in the select shape to get a GeoJSON string back.
- See `market.repository.ts` → `getMarketsByRadius` for the reference pattern.
