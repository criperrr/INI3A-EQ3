# Database Schema & Redis Key Reference

---

## 1. Drizzle ORM Schema (`src/backend/src/shared/database/schema.ts`)

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

### PostGIS Geography Notes
- **Write**: Pass `{ lat, lng }` — the custom Drizzle type converts to `SRID=4326;POINT(lng lat)`.
- **Read**: Direct `.select()` returns raw WKB binary. Always wrap with `sql\`ST_AsGeoJson(${table.location})\``.
- **Radius Search**: Use `ST_DWithin` via SQL helper (see `market.repository.ts` → `getMarketsByRadius`).

---

## 2. Redis Key Schema (`src/backend/src/shared/database/repositories/auth.repository.ts`)

| Key pattern | Value | TTL | Purpose |
|---|---|---|---|
| `refresh:<token>` | `userId` string | 7 days (`REFRESH_TOKEN_EXPIRY_SECONDS` in `jwt.ts`) | Refresh token mapping |
| `blacklist:<jti>` | `"1"` | Remaining seconds of the access token's lifetime | Revoked access tokens |

### Token Rotation Flow
On `POST /auth/refresh`: Atomic Redis transaction (`multi`) sets new `refresh:<newToken>` and deletes old `refresh:<oldToken>`.

---

## 3. Error Classes (`src/backend/src/shared/errors/errors.ts`)

All extend `AppError(internalCode, customMessage, httpCode)`:

| Class | `internalCode` | `httpCode` | Notes |
|---|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 422 | Carries `errors: { field, message }[]` |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Default: "Invalid credentials." |
| `ConflictError` | `CONFLICT` | 409 | Default: "Resource already exists." |
| `NotFoundError` | `NOT_FOUND` | 404 | Default: "Resource not found." |
| `JTIrefused` | `JTI_REFUSED` | 401 | Blacklisted or missing JTI |
| `MultipleApiError` | `MULTIPLE_ERRORS` | 400 | Carries `errors: any[]` |
| `NotImplemented` | custom | 501 | Stub placeholder |
| `InternalError` | custom | custom | Generic internal |

Global error handler format:
```json
{ "success": false, "code": "INTERNAL_CODE", "message": "...", "errors": [...] }
```

---

## 4. Type Namespaces

- `Services.*` (`shared/types/services.ts`): Service method signatures. `CreateUser = { name, email, password }`.
- `Repositories.*` (`shared/types/repositories.ts`): Repository method signatures. `CreateUser = { name, email, passHash }`.
- `Api.Request` (`shared/@types/`): Express `Request` extended with `req.user: { id, email, name, roleId, jti, exp }`.
- `ProductInfo` (`shared/types/product.ts`): `{ barcode, name, category, imageUri, lastPrice }`.
