---
name: frontend
description: Frontend architecture, HTTP service layer, Expo Router screen map, design token system, and service file creation patterns for the React Native/Expo app in src/frontend.
when_to_use: "When modifying React Native Expo screens, components, domain services (services/api.ts, auth.ts, productService.ts), navigation, or design tokens in src/frontend."
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
---

# Frontend Architecture & Mobile Playbook

Structured guidance for developing React Native / Expo screens, components, and API service wrappers in `src/frontend`.

## Use this skill when

- Building or updating Expo Router screens (`src/frontend/app/`)
- Creating or editing domain services (`src/frontend/services/`)
- Integrating the HTTP layer (`apiRequest`) with JWT token storage
- Styling components using `useTheme()` and the design tokens from `DESIGN.md`
- Working with camera/barcode scanning, maps, or local device storage

## Do not use this skill when

- Modifying backend Express routes, services, or database migrations
- Configuring backend-only dependencies or environment variables

## Core Architecture & Rules

- **HTTP Requests**: All network calls MUST go through `services/api.ts → apiRequest<T>()`. Never call `fetch` directly in UI components.
- **State & Tokens**: Access and refresh tokens are stored in AsyncStorage (`@presco:accessToken`, `@presco:refreshToken`).
- **Styling**: Always consume `useTheme()`. Hardcoded color hexes or raw pixel dimensions violating `DESIGN.md` are prohibited.
- **Routing**: Expo Router file-based routing in `src/frontend/app/`.

## Instructions & Workflow

1. Check `resources/implementation-playbook.md` for screen map, HTTP layer details, and domain service templates.
2. Build domain service functions with typed request and response payloads before wiring screens.
3. Apply `useTheme()` styles and ensure proper accessibility and mobile Safe Area handling.

## Resources

- `resources/implementation-playbook.md`: Screen registry, HTTP request wrapper details, and domain service templates.
- `.agents/DESIGN.md`: Full design system token specification.
