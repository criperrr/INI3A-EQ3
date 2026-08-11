---
name: backend
description: Backend architecture, layer encapsulation, Drizzle ORM schema, Redis key schema, error classes, auth middleware, and endpoint creation checklist for the Node.js/Express/TypeScript backend in src/backend.
---

# Backend Skill Reference

---

## Layer Responsibilities and Flow

Request flow: `Routes → Controller → Service → Repository → DB/Redis`

**Routes** (`modules/[module]/[module].routes.ts`)
- Instantiate `Router()`. Mount `requireAuth` on protected routes. Delegate to controller methods. No logic here.
- Protected routes type `req` as `Api.Request` (carries `req.user: { id, email, name, roleId, jti, exp }`).
- Mount in `app.ts`: `app.use("/auth", authRouter)`, `app.use("/products", productRouter)`.

**Controller** (`modules/[module]/[module].controller.ts`)
- Class singleton: `export const xController = new XControllerClass()`.
- Every method: `async method(req, res, next)` — always wrap in `try/catch`, forward errors via `next(e)`.
- Validate `req.body`/`req.params`. Build `errors: Array<{ field: string; message: string }> = []`, push failures, throw `new ValidationError(errors)` if `errors.length > 0`.
- On success: `return res.status(201).json(success(result))`.
- NOTE: `product.controller.ts` currently uses raw JSON instead of `success()` — fix when touching that file.

**Service** (`modules/[module]/[module].service.ts`)
- Class singleton: `export const xService = new XServiceClass()`.
- All business logic, bcrypt hashing (cost 10), JWT signing, token rotation, domain validation.
- Throws typed AppError subclasses only. Never returns HTTP codes.

**Repository** (`shared/database/repositories/[entity].repository.ts`)
- Class singleton: `export const EntityRepository = new EntityRepositoryClass(db)`.
- The ONLY location for Drizzle ORM calls and Redis calls. No ORM/Redis outside repositories.
- `UserRepository` and `ProductRepository` take `db` in constructor. `AuthRepository` and `MarketRepository` use module-level imports.

---

## Database Schema (`shared/database/schema.ts`)

| Table | Key columns |
|---|---|
| `role` | `id, name, minPoints, authority` |
| `scope` | `id, scopeName` |
| `role_scope` | `roleId, scopeId` (composite PK) |
| `user` | `id, name, email, passHash, birthdate, points, dangerFlag, location (geography), roleId (FK→role), createdAt, updatedAt` |
| `badge` | `id, name, icon, minPoints` |
| `user_badge` | `userId, badgeId, awardedAt` (composite PK) |
| `product` | `id, ean (nullable text), ncm, name, description, icon, createdAt` — GIN trigram index on `name` |
| `market` | `id, name, location (geography), createdAt` — GiST index for proximity |
| `ocurrency` | `id, userId, marketId, productId, value (numeric 12,2), trustFlag, isSuspended, isResolved, upvoteCount, downvoteCount, volate, createdAt` |
| `cart` | `id, userId, createdAt` |
| `cart_product` | `cartId, productId, addedAt` (composite PK) |
| `cured` | `userId, ocurrencyId, verdict, date` — moderation votes |

Geography columns (`user.location`, `market.location`):
- Write: pass `{ lat, lng }` — the custom Drizzle type converts to `SRID=4326;POINT(lng lat)`.
- Read: direct `.select()` returns raw WKB. Always wrap with `sql\`ST_AsGeoJson(${table.location})\``.
- Reference pattern: `market.repository.ts` → `getMarketsByRadius`.

---

## Error Classes (`shared/errors/errors.ts`)

All extend `AppError(internalCode, customMessage, httpCode)`:

| Class | `internalCode` | `httpCode` | Notes |
|---|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 422 | Carries `errors: { field, message }[]` |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Default: "Invalid credentials." |
| `ConflictError` | `CONFLICT` | 409 | Default: "Resource already exists." |
| `JTIrefused` | `JTI_REFUSED` | 401 | Blacklisted or missing JTI |
| `MultipleApiError` | `MULTIPLE_ERRORS` | 400 | Carries `errors: any[]` |
| `NotImplemented` | custom | 501 | Stub placeholder |
| `InternalError` | custom | custom | Generic internal |

`errorHandler` (last `app.use`) catches all `AppError` subclasses:
```json
{ "success": false, "code": "INTERNAL_CODE", "message": "...", "errors": [...] }
```
Non-`AppError` → HTTP 500 + `INTERNAL_SERVER_ERROR`.

---

## Auth Middleware (`requireAuth`)

Located at `shared/middlewares/authMiddleware.ts`:
1. Reads `Authorization: Bearer <token>`.
2. Calls `verifyAccessToken(token)` — throws if invalid or expired.
3. Checks `blacklist:<jti>` in Redis via `AuthRepository.isAccessTokenBlacklisted(jti)`.
4. Attaches `req.user: { id, email, name, roleId, jti, exp }`.

---

## Redis Key Schema

Managed exclusively by `AuthRepository` (`shared/database/repositories/auth.repository.ts`):

| Key pattern | Value | TTL |
|---|---|---|
| `refresh:<token>` | `userId` string | 7 days (`REFRESH_TOKEN_EXPIRY_SECONDS` in `jwt.ts`) |
| `blacklist:<jti>` | `"1"` | Remaining seconds of the access token's lifetime |

Rotation on `/auth/refresh`: atomic Redis `multi()` — sets new `refresh:` key, deletes old one in one transaction.

---

## Type Namespaces

- `Services.*` (`shared/types/services.ts`): Service method signatures. `CreateUser = { name, email, password }`.
- `Repositories.*` (`shared/types/repositories.ts`): Repository method signatures. `CreateUser = { name, email, passHash }`.
- `Api.Request` (`shared/@types/`): Express `Request` extended with `req.user`.
- `ProductInfo` (`shared/types/product.ts`): `{ barcode, name, category, imageUri, lastPrice }` — DTO from product service.

---

## Adding New Endpoints (Checklist)

1. Schema: add tables/columns to `shared/database/schema.ts`.
2. Types: add DTO types to `shared/types/services.ts` and `shared/types/repositories.ts`.
3. Repository: add methods to `shared/database/repositories/[entity].repository.ts`.
4. Service: add methods to `modules/[module]/[module].service.ts`.
5. Controller: add method to `modules/[module]/[module].controller.ts`. Validate → call service → `success()`.
6. Routes: wire in `modules/[module]/[module].routes.ts`. Apply `requireAuth` if protected.
7. Mount: if new module, add `app.use("/route", newRouter)` in `src/backend/src/app.ts`.

---

## New Module File Structure

```
src/backend/src/modules/[module]/
  [module].routes.ts      ← Router(), wire methods, export default
  [module].controller.ts  ← class + singleton export, try/catch, success()
  [module].service.ts     ← class + singleton export, business logic only
shared/database/repositories/[entity].repository.ts  ← ORM/Redis only
```

Minimal controller method skeleton:
```typescript
async create(req: Api.Request, res: Response, next: NextFunction) {
  try {
    const { fieldA, fieldB } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!fieldA) errors.push({ field: "fieldA", message: "Required." });
    if (!fieldB) errors.push({ field: "fieldB", message: "Required." });

    if (errors.length > 0) throw new ValidationError(errors);

    const result = await someService.create({ userId: req.user.id, fieldA, fieldB });
    return res.status(201).json(success(result));
  } catch (e) {
    next(e);
  }
}
```
