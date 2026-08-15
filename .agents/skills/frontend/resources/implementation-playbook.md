# Frontend Implementation Playbook

Detailed patterns, screen map, and service layer integration for the React Native/Expo application in `src/frontend`.

---

## 1. HTTP Layer (`services/api.ts`)

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

*Rule*: Never call `fetch` directly inside screens or components. Always call a function from `services/` that wraps `apiRequest`.

---

## 2. Domain Service Pattern

Add new domain services under `src/frontend/services/`:

```typescript
import { apiRequest } from "./api";

export interface CreateItemDTO {
  name: string;
  price: number;
}

export interface ItemData {
  id: number;
  name: string;
  price: number;
}

export async function createItem(data: CreateItemDTO): Promise<ItemData> {
  return apiRequest<ItemData>("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

Rules:
- Only import `apiRequest` (and `STORAGE_KEYS` if storage access is needed) from `./api`.
- Export typed interfaces for all request and response shapes.
- For safe lookups (like `fetchProductByEan`): wrap in try/catch and return `null` on 404 or network failure.

---

## 3. Screens & Routing Map (`app/`)

| Route / File | Purpose |
|---|---|
| `_layout.tsx` | Root stack layout, ThemeProvider, Toast/Alert providers |
| `index.tsx` | Home dashboard screen with product feed |
| `login.tsx` | User login screen |
| `registerUser.tsx` | Registration form |
| `scannerProduct.tsx` | Camera EAN barcode scanner |
| `scannerConfirmation.tsx` | Scanned product confirmation screen |
| `customRegisterProduct.tsx` | Manual product create & edit |
| `registerProduct.tsx` | Price submission for a product at a market |
| `search.tsx` | Real-time text search and filter |
| `productDetails.tsx` | Full product details view |
| `profile.tsx` | User profile & points |
| `settings.tsx` | Theme selection & preferences |
| `map.native.tsx` | Native map with market markers and radius |
| `map.tsx` / `map.web.tsx` | Web platform stubs for map |
| `manualEanSearch.tsx` | Manual EAN code entry screen |

---

## 4. Design System Consumption (`DESIGN.md`)

All styles must consume tokens from `useTheme()`:
- Background: `themeStyles.bg`
- Card: `themeStyles.card`
- Header: `themeStyles.headerBg`
- Border: `themeStyles.border`
- Text: `themeStyles.text`, `themeStyles.subText`
- Input: `themeStyles.inputBg`, height 50–54px, border width 1, border radius 16–20
- Accent: `accent`
