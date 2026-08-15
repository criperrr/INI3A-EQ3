# Backend Implementation Playbook

Step-by-step procedures, module structure, and implementation templates for the Node.js/Express/TypeScript backend.

---

## 1. Request Lifecycle & Layer Encapsulation

```
Client Request
      │
      ▼
Routes (`modules/[module]/[module].routes.ts`)
      │  - Mounts middleware (requireAuth)
      │  - Delegates to controller
      ▼
Controller (`modules/[module]/[module].controller.ts`)
      │  - Validates req.body / req.params
      │  - Builds errors array and throws ValidationError
      │  - Returns res.status(2xx).json(success(result))
      ▼
Service (`modules/[module]/[module].service.ts`)
      │  - Business logic, hashing, JWT signing
      │  - Throws typed AppError subclasses
      │  - Interacts only with Repositories
      ▼
Repository (`shared/database/repositories/[entity].repository.ts`)
      │  - ONLY layer with Drizzle ORM and Redis calls
      ▼
Database / Redis Cache
```

---

## 2. Checklist for Adding New Endpoints

1. **Schema**: Add table/column to `src/backend/src/shared/database/schema.ts` (if needed).
2. **DTO Types**: Add service types to `shared/types/services.ts` and repository types to `shared/types/repositories.ts`.
3. **Repository**: Add queries/mutations to `shared/database/repositories/[entity].repository.ts`.
4. **Service**: Implement business logic in `modules/[module]/[module].service.ts`.
5. **Controller**: Validate inputs, call service, respond with `success(result)` in `modules/[module]/[module].controller.ts`.
6. **Routes**: Wire route in `modules/[module]/[module].routes.ts` (apply `requireAuth` if protected).
7. **Mount**: If new module, mount route in `src/backend/src/app.ts`.

---

## 3. Module File Skeleton

```typescript
// modules/[module]/[module].controller.ts
import { Response, NextFunction } from "express";
import { ValidationError } from "@/shared/errors/errors";
import { success } from "@/shared/helpers/response.helper";
import { itemService } from "./[module].service";
import type { Api } from "@/shared/@types/api";

export class ItemControllerClass {
  async create(req: Api.Request, res: Response, next: NextFunction) {
    try {
      const { name, value } = req.body;
      const errors: Array<{ field: string; message: string }> = [];

      if (!name) errors.push({ field: "name", message: "Name is required." });
      if (!value) errors.push({ field: "value", message: "Value is required." });

      if (errors.length > 0) throw new ValidationError(errors);

      const result = await itemService.create({
        userId: req.user.id,
        name,
        value,
      });

      return res.status(201).json(success(result));
    } catch (e) {
      next(e);
    }
  }
}

export const itemController = new ItemControllerClass();
```

---

## 4. Auth Middleware Flow (`requireAuth`)

`src/backend/src/shared/middlewares/authMiddleware.ts`:
1. Extract `Authorization: Bearer <token>` from header.
2. Verify token via `verifyAccessToken(token)`.
3. Check Redis blacklist for token `jti` via `AuthRepository.isAccessTokenBlacklisted(jti)`.
4. Populate `req.user = decodedPayload`.
