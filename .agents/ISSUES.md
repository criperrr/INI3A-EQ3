# ISSUES.md - Known Bugs & Potential Problems

This file is maintained by AI agents during development work. Agents should append here only when they identify a bug or risk as a side-effect of performing an assigned task — not proactively. A separate model assigned to this file is responsible for investigating and resolving entries.

Do not add speculative issues. Only add something here if the evidence is concrete (e.g., wrong type, missing call, inconsistent behavior observed while reading actual code).

---

## Format

```markdown
## [YYYY-MM-DD] [scope] Short title

- **Location:** `relative/path/to/file` (line or function if known)
- **Description:** What the problem is and why it is a problem.
- **Reproduction / Evidence:** How to trigger it or what in the code makes it clear.
- **Status:** open | investigating | fixed
```

---

## Issues

## [2026-08-11] [backend/product] productController does not use success() helper

- **Location:** `src/backend/src/modules/product/product.controller.ts` (lines 10–39, 56–60)
- **Description:** All other controllers respond via `success(data)` from `response.helper.ts`, which produces `{ success: true, code: 200, data }`. `productController` hand-rolls raw JSON responses instead, creating an inconsistent API response shape for the `/products` endpoints.
- **Reproduction / Evidence:** Compare `auth.controller.ts` line 28 (`res.json(success(result))`) with `product.controller.ts` line 27–31 (manual object). Clients parsing `data` from the standard envelope will receive `undefined` on product responses.
- **Status:** fixed

---

## [2026-08-15] [infra/localtunnel] Local tunnel crashing causing 503 Service Unavailable on scanner

- **Location:** `start_project.sh` / `src/frontend/services/api.ts`
- **Description:** Localtunnel connections occasionally timeout or disconnect in restricted school network environments.
- **Reproduction / Evidence:** Scanner throwing network errors on barcode query.
- **Status:** fixed (Resolved via tunnel keepalive restart loop and `--local-nat` direct Wi-Fi mode)
