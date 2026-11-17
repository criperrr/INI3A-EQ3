# AGENTS.md - System Guidelines & Architecture Index

Strict behavioral rules, code encapsulation patterns, project architecture, and token-saving navigation protocols for AI models working in this workspace.

---

## 1. Context Efficiency & Navigation Rules

### 1.1. Read CURRENT.md First
Always read `.agents/CURRENT.md` at the start of any task before scanning directories or running broad searches with `run_command` (`rg`/`grep`). It contains the active task context and direct relative file pointers.

### 1.2. Surgical Tool Usage
- Use `read_file` with `StartLine` and `EndLine` to inspect only the function or block you need (max 800 lines / 46,080 bytes per call).
- Use `run_command` (`rg -n` or `grep -rn`) with exact symbol names (e.g., `authController`, `ProductRepository`) to locate line numbers before calling `read_file`.
- Avoid directory listing commands via `run_command` unless creating new folders or updating `.agents/CURRENT.md`.

### 1.3. Skills (Load Only When Relevant)
Deep architecture references are split into skills — load them only if the task touches that area:

- **Backend** (Express, Drizzle, Redis, Auth): `.agents/skills/presco-backend/SKILL.md`
  Covers: layer responsibilities, DB schema, error classes, Redis keys, `requireAuth`, `requireAdmin`, type namespaces, endpoint checklist, module file structure.
- **Frontend** (React Native, Expo Router, services, gestures, i18n): `.agents/skills/presco-frontend/SKILL.md`
  Covers: `apiRequest`, domain service patterns, screen map, component list, design token spec, Reanimated swipe navigation, localization in 7 languages.
- **Design tokens** (colors, typography, spacing, Monet): `.agents/DESIGN.md` or root `DESIGN.md`.
- **CRITICAL TOKEN RULE:** NEVER load generic desktop/web UI design skills for Presco mobile tasks. For all Presco visual and UI tasks, use `presco-frontend`, `mobile-design`, `design-spec`, and `DESIGN.md`.

---

## 2. Project Architecture

- **Stack & Env:** Node.js + Express 5 + TypeScript + Drizzle ORM (PostgreSQL + PostGIS) + Redis sessions on backend; React Native 0.86.3 + Expo SDK 57 + Expo Router + Reanimated 4 + Monet theming + 7-language i18n on frontend. Full stack specs live in `.agents/skills/presco-backend/SKILL.md` and `.agents/skills/presco-frontend/SKILL.md`.
- **Required Backend Env (`src/backend/.env`):** `DATABASE_URL`, `REDIS_URL`, `SERVER_PORT=3333`, `JWT_SECRET`.
- **Startup & Services:** `./start_project.sh` (tunnel default), `./start_project.sh --local-nat` or `npm run dev:local` (local Wi-Fi), `npm run db:status`, `npm run db:restart`, `npm run db:reload`, `npm run db:check`.

---

## 3. Backend: Code Encapsulation Rules

- **Strict Layer Flow:** `Routes -> Controller -> Service -> Repository -> DB/Redis`. Full rules for Express singletons, Drizzle ORM/PostGIS (`ST_AsGeoJson`), `AppError` subclasses, `requireAuth`/`requireAdmin`, and Redis keys (`refresh:<token>`, `blacklist:<jti>`) are defined in `.agents/skills/presco-backend/SKILL.md` (Sections 1–4).

---

## 4. Frontend: Code Encapsulation Rules

- **HTTP & Screens:** Never call `fetch` directly inside screens or components; always use `apiRequest<T>` (`src/frontend/services/api.ts`) or domain services (`auth.ts`, `productService.ts`, `ocurrencyService.ts`, `marketService.ts`, `cartService.ts`). Full screen map, Reanimated gestures, Monet tokens, and 7-language i18n rules are defined in `.agents/skills/presco-frontend/SKILL.md` (Sections 1–6).

---

## 5. Adding New Backend Endpoints (Checklist)

- Follow the 6-step endpoint checklist (`schema/types -> Repository -> Service -> Controller -> Routes -> app.ts`) in `.agents/skills/presco-backend/SKILL.md` (Section 5).

---

## 6. Mandatory Update Rules

After any file modification or addition:
1. Update `.agents/CURRENT.md`: refresh task status, executive summary, and Navigation Index (archive old sprint items to `.agents/HISTORY.md` if approaching 15 KB).
2. Append entry to `.agents/COMMITS.md`.
   > **CRITICAL TOKEN RULE:** NEVER read `.agents/COMMITS.md` before appending (it exceeds 390 KB of historical logs). Append directly to the end using this exact template:
   ```markdown
   ## `YYYY-MM-DD HH:MM` - `type(scope)`: Short title

   - **Description:** Summary of changes...
   - **Files Modified:**
     - `path/to/file`
   - **Impact / Next Steps:** Outcome and next steps.
   ```

### 6.1. Git Commit Policy (Atomic Commits Strictly On Request)

- **NO SPONTANEOUS COMMITS (CRITICAL):** NEVER execute `git commit` or stage files unless the user explicitly requests it (e.g., "commita", "pode commitar", "faça os commits"). Otherwise leave edits in the working tree.
- **ISOLAMENTO DE ESCOPO POR CHAT/SESSÃO (COMMIT & PUSH CIRÚRGICO):** When asked to commit or push, stage and push **STRICTLY** the files modified, created, or touched in that specific chat session:
  - **Proibição Absoluta de Adição Global:** NEVER run `git add .`, `git add -A`, `git add -u`, or `git commit -a`. Use explicit `git add <file1> <file2> ...` only for files in the session scope.
  - **Preservação da Working Tree:** Leave unrelated pending changes from other chats or manual edits untouched (unstaged).
- **Atomic Decomposition:** When committing multi-layer changes, inspect `git status` and slice into logical Conventional Commits grouped by domain: `feat(db): ...`, `feat(api): ...`, `feat(ui): ...`, `chore:`/`build:`, `docs:`/`test:`.

### 6.2. Semantic Versioning & Release Policy (`semver`)

- **Format:** Strict `MAJOR.MINOR.PATCH` (`MAJOR` for breaking changes `feat!:`/`fix!:`/`BREAKING CHANGE:`, `MINOR` for `feat:`, `PATCH` for `fix:`/`perf:`).
- **Escopo Estrito de Alteração de SemVer (Front-end ou Back-end Obrigatório):**
  - **REGRA MANDATÓRIA:** Bump SemVer **ONLY AND EXCLUSIVELY** when modifying application source code in `src/frontend/**` or `src/backend/**`.
  - **PROIBIÇÃO ABSOLUTA:** NEVER alter SemVer (`package.json`, `app.json`) when changes are restricted to CI/CD (`.github/**`), load/infra tests (`tests/k6/**`), utility scripts (`scripts/**`), docs (`docs/**`, `*.md`, `.agents/**`), isolated landing page (`src/landing/**`), or tooling/chore tasks without app/API impact.
- **Protocolo do Agente:** Follow `@[skills/semver]`. Do NOT use dynamic runtime scripts to inject version strings into APK filenames; read version strictly from the 4 synchronized manifests (`package.json`, `src/backend/package.json`, `src/frontend/package.json`, `src/frontend/app.json` `expo.version` + `expo.android.versionCode + 1`), or run `npm run version:bump[:minor|:major]`.
- **Release Pipeline:** `.github/workflows/release.yml` runs on `v*.*.*` tag push or `workflow_dispatch`, executing `npm test`, `npm run typecheck`, Android release APK build, and GitHub Releases publication.

### 6.3. Autonomous Backend Deployment Policy (CI/CD & Server Hygiene)

- **Deploy Autônomo via CI:** Pushes to `main` or `tests` modifying `src/backend/**`, `deploy/**`, `ecosystem.config.cjs`, `scripts/deploy_remote.sh`, or `.github/workflows/deploy.yml` trigger `.github/workflows/deploy.yml` (`typecheck`, surgical sync, migrations, seed, clean PM2 restart). If asked for immediate/manual deploy, run `npm run deploy` or `gh workflow run deploy.yml --ref <branch>`.
- **Higiene Estrita do Servidor de Produção (`/var/www/equipes/26-presco`):** Host strictly `src/backend/`, `deploy/deploy.sh`, `ecosystem.config.cjs`, `.htaccess`, `logs/`, and a single `README.md`. Strictly forbidden on server: `.agents/`, `docs/`, `sprints/`, `gestao/`, `src/frontend/`, `scripts/`, or extra `.md` files.

---

## 7. Code Style & Conventions

- **Comments:** Minimal comments; self-documenting code via clear naming.
- **TypeScript:** `type` for DTOs, `interface` for extensible shapes, `import type` for type-only imports, `async/await` throughout.
- **Singletons:** Export Controllers and Services as singleton instances (`export const authController = new AuthControllerClass()`).
- **Geography/PostGIS:** Write `{ lat, lng }`; read with ``sql`ST_AsGeoJson(${table.location})` ``.

---

## 8. Governança Rígida de Branches, Commits, CI/CD e Blindagem de Testes

### 8.1. Axioma de Commits (Sintaxe Obrigatória e Isolamento por Chat)
- **Formato Estrito:** `<category>/<short-description>` or `<category>(<scope>): <short-description>`.
- **Categorias Permitidas:** `feat`, `fix`, `test`, `refactor`, `chore`, `docs` (enforced by `pr-gatekeeper.yml`).
- **Isolamento por Chat:** Stage surgically only files from the current chat session; never `git add .`.

### 8.2. Axioma de Criação de Branches (Regra Prévia Obrigatória)
- **Criação Prévia Mandatória:** Always create a thematic branch from `dev` (`git checkout -b <categoria>/<nome-da-task> dev`) BEFORE modifying any file in the project.
- **Proibição Absoluta:** NEVER modify files directly on `main` or `dev`, and NEVER branch from `main` (sole exception: emergency production hotfixes `fix/hotfix-...`).
- **Nomenclatura Obrigatória:** `<categoria>/<nome-da-task>` (e.g., `feat/real-time-alerts`, `fix/login-session`, `test/concurrency-shop`).

### 8.3. Axioma de Merge Autônomo e Validação Obrigatória de PRs (Regra Absoluta)
- **Proibição de Merge Local:** AI agents **NEVER** run `git merge` locally into `dev` or `main`.
- **Fluxo Exclusivo de Integração:**
  1. Branch from `dev` before editing (`git checkout -b <categoria>/<nome-da-task> dev`).
  2. Validate locally (`npm test`, `npm run typecheck`). If changes touch or affect mobile frontend (`src/frontend/**`, components, screens, Expo routes, tokens, i18n), **MUST** run Maestro stability tests (`npm run test:maestro:full`, `npm run test:maestro:quick`, or `npm run test:maestro:docker`) before commit/push.
  3. Push branch: `git push origin <categoria>/<nome-da-task>`.
  4. Open PR targeting `dev`: `gh pr create --base dev --title "..." --body "..."`.
  5. **Verificação Obrigatória de CI:** Monitor active checks (`gh pr checks <PR> --watch`); never mark a task complete until all checks report `SUCCESS`.
  6. **Merge via `gh`:** If checks pass, merge via `gh pr merge --squash --auto` or `gh pr merge <PR> --squash`. If checks fail, investigate, fix, push surgical commit, and re-verify.
- **Pré-requisito da CLI `gh`:** Verify `which gh` and `gh auth status`; if missing or unauthenticated, halt and instruct developer to install `gh` or run `gh auth login`.
- **Diagnóstico Autônomo de CI:** Inspect failures with `gh run view <run-id> --log-failed` and download artifacts via `gh run download <run-id> -n maestro-e2e-audit-reports`.

### 8.4. Proteção contra Testes Falsos (Anti-Tautologia) e Zonas Protegidas
- **Proibição de Testes Tautológicos:** Never write empty/generic assertions (`expect(true).toBe(true)`, `expect(res).toBeDefined()`), tests without real state mutation verification, or excessive mocks hiding integration failures.
- **Cobertura Mínima:** Minimum **80%** line and branch coverage on created or modified files.
- **Zonas Protegidas:** `tests/e2e/`, `tests/load/`, `tests/concurrency/`, `tests/k6/`, `tests/maestro/`, and `.github/workflows/`. AI agents MUST NEVER relax SLA/latency thresholds, alter assertions into false positives, or disable CI validation steps to force green builds; fix the root cause in code.

### 8.5. Axioma de Títulos e Descrições de Pull Requests (PRs)
- **Proibição de Slop de IA:** Strictly forbidden: corporate AI templates, `### Resumo`, bold lists, emojis, tables, or markdown formatting in PR titles or `--body`.
- **Regras Estritas:** `en-US` only, all `lowercase` (title and `--body`), plain unformatted text, direct informal-yet-technically-dense senior terminal tone.
- **Exemplo:** Title `feat(ci): add conditional expo bundle check to gatekeeper`; Body `added conditional expo export step in pr-gatekeeper.yml that only triggers when src/frontend files are changed, bumped semver patch to 1.2.2 and cleaned up tests branch from workflows`.

### 8.6. Axioma Fundamental de Erradicação de Emojis (Proibição Absoluta e Ícones Vetoriais SVG)
- **UI Mobile & Frontend:** Zero emojis allowed as icons, markers, badges, illustrations, or avatars; always use SVG vector libraries (`@expo/vector-icons` such as `Ionicons`, or `lucide-react-native`).
- **Workflows & CI/CD:** Zero emojis in GitHub Actions job names, steps, logs, or echoes; use standardized prefixes (`[OK]`, `[INFO]`, `[ERRO]`, `[AVISO]`).
- **Backend & DB:** Zero emojis in server logs, API errors, seed data, or internal docs.
- **Exceção Exclusiva:** Plain-text external share messages sent outside the app (e.g., shopping list shared via WhatsApp or clipboard in `src/frontend/utils/mapQueryBuilder.ts`).
