---
name: frontend
description: Frontend architecture, HTTP service layer, Expo Router screen map, design token system, and service file creation patterns for the React Native/Expo app in src/frontend.
---

# Frontend Skill Reference

---

## HTTP Layer (`services/api.ts`)

`apiRequest<T>(endpoint, options, retry = true)`:
- Prepends `EXPO_PUBLIC_API_URL` (fallback: `http://localhost:3000`).
- Injects `Authorization: Bearer <token>` from AsyncStorage key `@presco:accessToken`.
- Sets `Bypass-Tunnel-Reminder: true` header (required for localtunnel dev environment).
- Enforces 15-second timeout via `AbortController`. Throws `ApiError(408, "TIMEOUT", ...)` on abort.
- On HTTP 401 with `retry = true`: calls `tryRefreshToken()` (POSTs `/auth/refresh`, updates both tokens in AsyncStorage), then retries once with `retry = false`.
- Throws `ApiError(status, code, message, errors)` on non-OK responses.

Storage keys (exported as `STORAGE_KEYS`):
- `@presco:accessToken`
- `@presco:refreshToken`

Never call `fetch` directly inside screens or components. Always call a function from `services/` that wraps `apiRequest`.

---

## Domain Services (`services/`)

Existing services:

| File | Exports |
|---|---|
| `services/api.ts` | `apiRequest`, `ApiError`, `STORAGE_KEYS`, `BASE_URL` |
| `services/auth.ts` | `registerUser(name, email, password)`, `loginUser(email, password)`, `logoutUser()`, `getStoredTokens()` |
| `services/productService.ts` | `fetchProductByEan(ean)` → `ProductData | null` (silences errors, returns null on failure) |

Adding a new domain service file — exact structure to follow:
```typescript
import { apiRequest } from "./api";

export interface SomethingData {
  field: string;
}

export async function doSomething(param: string): Promise<SomethingData> {
  return apiRequest<SomethingData>("/endpoint", {
    method: "POST",
    body: JSON.stringify({ param }),
  });
}
```

Rules:
- Only import `apiRequest` (and `STORAGE_KEYS` if AsyncStorage access is needed) from `./api`.
- Define and export typed interfaces for all request/response shapes in the same file.
- Use named exports only. Functions must be async.
- For safe reads that should not throw (like `fetchProductByEan`): wrap in try/catch and return `null` on error.

---

## Screens (`app/`)

File-based routing via Expo Router. All screens live in `src/frontend/app/`.

| File | Purpose |
|---|---|
| `_layout.tsx` | Root stack and theme provider |
| `index.tsx` | Home / dashboard screen |
| `login.tsx` | Login form |
| `registerUser.tsx` | User registration form |
| `scannerProduct.tsx` | Camera EAN barcode scanner |
| `scannerConfirmation.tsx` | Confirm scanned product before submitting price |
| `customRegisterProduct.tsx` | Manual product entry (no EAN) |
| `registerProduct.tsx` | Price submission for a product at a market |
| `search.tsx` | Text-based product search |
| `productDetails.tsx` | Product detail view |
| `profile.tsx` | User profile and gamification points |
| `settings.tsx` | Theme toggle and preferences (largest screen, 27KB) |
| `map.native.tsx` | Native map screen — proximity market lookup (28KB) |
| `map.tsx` / `map.web.tsx` | Web platform stubs for map screen |
| `manualEanSearch.tsx` | Manual EAN input screen |
| `aboutUs.tsx` | About page |
| `helpUser.tsx` | Help/FAQ screen |

---

## Components (`components/`)

| File | Purpose |
|---|---|
| `Header.tsx` | Shared header |
| `Footer.tsx` | Shared footer / bottom navigation |
| `Sidebar.tsx` | Sidebar drawer |
| `productCard.tsx` | Product card used in lists |

---

## Design System (`DESIGN.md`)

All style values must come from `useTheme()`. Never hardcode colors, font sizes, or spacing. Full spec in `.agents/DESIGN.md`.

Available tokens:
- `themeStyles.bg` — screen background
- `themeStyles.card` — card background
- `themeStyles.headerBg` — header background
- `themeStyles.border` — border color
- `themeStyles.text` — primary text color
- `themeStyles.subText` — secondary/muted text color
- `themeStyles.inputBg` — input field background
- `accent` — primary accent color (Monet-extracted or preset fallback)

Typography scale:
- Headings: 22px bold, lineHeight 28
- Section titles: 18px bold
- Labels: 14px semibold (600)
- Input text: 16px medium (500)
- Small badges: 10–11px bold, uppercase, letterSpacing 1

Layout:
- Border radius — cards: 20–24, inputs/buttons: 16–20, badges: 12
- Container padding horizontal: 16–20
- Gap between sections: 24 / between inputs: 20
- Inputs: height 50–54px, left Ionicons icon in `accent` color, border width 1 in `themeStyles.border`
- Buttons: `accent` background, `#FFF` text, padding vertical ~16px, elevation 4–5
