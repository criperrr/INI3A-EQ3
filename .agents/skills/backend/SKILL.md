---
name: backend
description: Backend architecture, layer encapsulation, Drizzle ORM schema, PostGIS geography, Redis key schema, error classes, auth middleware, and endpoint creation checklist for the Node.js/Express/TypeScript backend in src/backend.
when_to_use: "When modifying backend routes, controllers, services, repositories, Drizzle schema, PostGIS spatial logic, Redis session handling, or error classes in src/backend."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Backend Architecture & DDD Playbook

Structured guidance for developing and maintaining the Node.js/Express/TypeScript backend for the INI3A-EQ3 price-reporting system.

## Use this skill when

- Adding or modifying backend endpoints (`modules/[module]`)
- Creating or editing Drizzle ORM models, migrations, and repositories
- Implementing authentication, token rotation, or Redis session caching
- Writing controllers, services, or error-handling middleware
- Handling PostGIS geospatial data (markets, users, coordinates)

## Do not use this skill when

- Working solely on frontend React Native components or UI styling
- Modifying non-backend configuration files unrelated to API/DB

## Core Architecture & Encapsulation Rules

- **Layer Flow**: `Routes → Controller → Service → Repository → DB/Redis`. Never bypass layers.
- **Routes** (`modules/[module]/[module].routes.ts`): Instantiates `Router()`, applies `requireAuth` if protected, forwards to controller.
- **Controller** (`modules/[module]/[module].controller.ts`): Singleton instance. Validates input (`errors` array), calls service, returns `res.status(2xx).json(success(result))`.
- **Service** (`modules/[module]/[module].service.ts`): Singleton instance. Business logic, password hashing (`bcrypt`), JWT operations. Throws typed `AppError` subclasses.
- **Repository** (`shared/database/repositories/[entity].repository.ts`): The ONLY place where Drizzle ORM and Redis operations occur.

## Instructions & Workflow

1. Consult `resources/schema-reference.md` for complete Drizzle tables, PostGIS geography rules, Redis key formats, and error types.
2. Follow the step-by-step checklist in `resources/implementation-playbook.md` when adding new endpoints or entities.
3. Validate inputs in controllers and throw typed `ValidationError(errors)`.
4. Ensure PostGIS geography columns are read using `sql\`ST_AsGeoJson(...)\``.

## Resources

- `resources/schema-reference.md`: Drizzle schema, PostGIS geography handling, Redis key patterns, error classes.
- `resources/implementation-playbook.md`: Layer responsibilities, endpoint checklist, controller skeleton.
