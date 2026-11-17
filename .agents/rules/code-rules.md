---
name: code-rules
version: 1.0.0
priority: P0
trigger: model_decision
description: Apply when writing, building, refactoring, or fixing code — project-type agent routing, the Socratic Gate, Plan Mode phases, and the final checklist/scripts. Skip for pure questions or text-only responses.
---

# Code Rules (TIER 1) - AG Kit

> Loaded when the request involves writing or modifying code.

---

## Project Type Routing

| Project Type                           | Primary Agent         | Skills                                        |
| -------------------------------------- | --------------------- | --------------------------------------------- |
| **MOBILE** (iOS, Android, RN, Expo)    | `mobile-developer`    | mobile-design, presco-frontend, design-spec   |
| **BACKEND** (API, server, DB)          | `backend-specialist`  | api-patterns, database-design, presco-backend |
| **DATABASE / GIS**                     | `database-architect`  | database-design, presco-backend               |
| **SECURITY & RBAC**                    | `security-auditor`    | vulnerability-scanner, presco-backend         |

> **[CRITICAL] Mobile + frontend-specialist = WRONG.** Mobile = `mobile-developer` ONLY.

---

## GLOBAL SOCRATIC GATE

**Scope:** Mandatory for `COMPLEX CODE`, `NEW APP`, and `DESIGN/UI` requests (matching `request-routing.md`), or whenever requirements remain genuinely underspecified. `QUESTION`, `SURVEY/INTEL`, and clear `SIMPLE CODE` (single-file fix/edit with unambiguous scope) bypass the Gate and proceed directly.

**Context-First Rule:** Always read `.agents/CURRENT.md` and the relevant target files via `read_file` / `run_command` BEFORE asking clarifying questions, so questions address genuine architectural gaps, trade-offs, or edge cases rather than facts already present in the codebase.

| Request Type                        | Strategy       | Required Action                                                             |
| ----------------------------------- | -------------- | --------------------------------------------------------------------------- |
| **COMPLEX CODE / New Feature**      | Deep Discovery | Read context first, then ask minimum 3 strategic / edge-case questions      |
| **NEW APP (From Scratch)**          | Full Scoping   | Read workspace state, clarify domain, stack, users, and core flows          |
| **DESIGN/UI (New Screen / Flow)**   | Design Align   | Read `DESIGN.md` + context, then confirm visual/UX trade-offs & edge cases  |
| **Full Orchestration**              | Gatekeeper     | **STOP** subagents until user confirms plan details and scope               |
| **SIMPLE CODE / Clear Bug Fix**     | Direct Edit    | Read `.agents/CURRENT.md` + target file and implement directly              |

**Protocol:**

1. **Read Context First:** Inspect `.agents/CURRENT.md` and target files before asking questions.
2. **Never Assume on Complex/UI/New Work:** For `COMPLEX CODE`, `NEW APP`, and `DESIGN/UI`, if key trade-offs or edge cases are still open after reading code, ask concise questions before editing.
3. **Handle Spec-heavy Requests:** When the user provides detailed answers for a complex task, confirm critical edge cases/trade-offs concisely before launching multi-layer changes.
4. **Reference:** Full protocol in `@[skills/brainstorming]`.

---

## Plan Mode (4-Phase)

1. ANALYSIS -> Research (`.agents/CURRENT.md` + target files), questions
2. PLANNING -> `{task-slug}.md`, task breakdown
3. SOLUTIONING -> Architecture, design (NO CODE!)
4. IMPLEMENTATION -> Code + tests

---

## Final Checklist Protocol

**Trigger:** When the user says "run the final checks", "final checks", "run all the tests", or similar phrases.

| Task Stage       | Command                                            | Purpose                        |
| ---------------- | -------------------------------------------------- | ------------------------------ |
| **Manual Audit** | `python .agents/scripts/checklist.py .`             | Priority-based project audit   |
| **Pre-Deploy**   | `python .agents/scripts/checklist.py . --url <URL>` | Full Suite + Performance + E2E |

**Priority Execution Order:**

1. **Security** -> 2. **Lint** -> 3. **Schema** -> 4. **Tests** -> 5. **UX** -> 6. **Lighthouse/E2E**

**Rules:**

- **Completion:** A task is NOT finished until `checklist.py` returns success.
- **Reporting:** If it fails, fix the **Critical** blockers first (Security/Lint).

**Available Scripts (9 total):**

| Script                     | Skill                 | When to Use         |
| -------------------------- | --------------------- | ------------------- |
| `security_scan.py`         | vulnerability-scanner | Always on deploy    |
| `lint_runner.py`           | lint-and-validate     | Every code change   |
| `test_runner.py`           | testing-patterns      | After logic change  |
| `schema_validator.py`      | database-design       | After DB change     |
| `ux_audit.py`              | web-design-guidelines | After web UI change |
| `accessibility_checker.py` | web-design-guidelines | After UI change     |
| `mobile_audit.py`          | mobile-design         | After mobile change |
| `lighthouse_audit.py`      | performance-profiling | Before deploy       |
| `playwright_runner.py`     | webapp-testing        | Before deploy       |

> **[INFO] Agents & Skills can invoke ANY script** via `python .agents/skills/<skill>/scripts/<script>.py`

---

## Presco Intelligence & Self-Healing Protocol (Token-Efficient)

### 1. Mini-Raciocínio Estruturado (2 linhas antes de editar)
Antes de modificar ou criar código, defina de forma ultra-concisa:
- **Dependências & Tipos:** Quais interfaces e imports o arquivo consome?
- **Impacto Adjacente:** Algum outro arquivo precisa de sincronização imediata?

### 2. Regras de Ouro do Presco (Anti-Patterns)
- **HTTP / API:** Nunca use `fetch` direto; use sempre `apiRequest<T>` (`services/api.ts`) com tratamento de erro e tipagem.
- **Design Tokens:** Nunca use cores hexadecimais estáticas no JSX; use tokens semânticos via `useTheme()` / `useThemeTokens()`.
- **Textos & i18n:** Nunca deixe strings literais voltadas ao usuário soltas no JSX; use `const { t } = useI18n()` / `useTranslation()`.
- **Bibliotecas Nativas & Runtimes:** Priorize compatibilidade com o runtime ativo (Expo Go), mas permita e sinalize dependências nativas destinadas à migração para o **Expo Development Build (EAS / Prebuild)** quando planejado.

### 3. Auto-Correção Silenciosa (Self-Healing via TypeScript — 0 Tokens de IA)
- Após modificações em arquivos `.ts` / `.tsx`, execute silenciosamente `npx tsc --noEmit` (or `npm run typecheck`).
- Se houver erro de tipagem ou import ausente, resolva imediatamente antes de entregar a resposta final.

### 4. Política de Commits Atômicos & Isolamento por Chat (Exclusivamente sob Demanda do Usuário)
- **NUNCA commitar espontaneamente:** A IA NÃO deve executar comandos de commit por iniciativa própria. Qualquer commit só deve ser realizado se o usuário solicitar expressamente (ex: "commite", "faça os commits", "pode commitar").
- **Isolamento de Escopo por Chat (Commit & Push Cirúrgico):** Ao receber pedido de commit ou push, commitar e enviar EXCLUSIVAMENTE os arquivos tocados, modificados ou criados na sessão do chat atual. É estritamente proibido usar `git add .`, `git add -A`, `git add -u` ou `git commit -a`. Quaisquer alterações na working tree pertencentes a outros chats ou tarefas devem ser ignoradas e preservadas intactas.
- **Desmembramento de Grandes Alterações:** Quando o usuário pedir para commitar após uma tarefa com múltiplas alterações/arquivos:
  1. Inspecione `git status`.
  2. Nunca faça um único commit gigante (`git add .`).
  3. Desmembre e agrupe em commits atômicos por domínio selecionando arquivo a arquivo:
     - `feat(db):` schema, migrations e sementes de dados.
     - `feat(api):` controllers, services, repositories e rotas.
     - `feat(ui):` telas, componentes visuais e design tokens.
     - `chore:` / `build:` dependências, configs de ambiente e scripts.
     - `docs:` / `test:` documentação, guias e testes.
  4. Use o padrão Conventional Commits com mensagens claras e objetivas.

### 5. Incremento de Versão Semântica pelo Agente (Somente Front-end ou Back-end)
- **Regra Estrita de Escopo (`.agents/AGENTS.md` 6.2):** Atualize a versão do monorepo **SOMENTE E EXCLUSIVAMENTE** quando houver modificações de código-fonte de aplicação em `src/frontend/**` ou `src/backend/**`, seguindo a skill `@[skills/semver]`.
- **Proibição Absoluta para Outros Escopos:** NÃO altere a versão para modificações restritas a CI/CD (`.github/**`), testes de carga (`tests/k6/**`), scripts (`scripts/**`), documentação (`docs/**`, `*.md`, `.agents/**`), landing page isolada (`src/landing/**`), ou tarefas de manutenção/tooling (`chore`, `build`).
- **Proibido script dinâmico no nome do APK:** O nome do artefato de APK nos pipelines deve refletir a saída nativa de build; nenhuma regra deve injetar versão dinamicamente via script no nome de arquivos sem que a versão oficial tenha sido atualizada nos manifestos.
- **Sincronização Obrigatória dos 4 Manifestos:**
  - `package.json` (raiz)
  - `src/backend/package.json`
  - `src/frontend/package.json`
  - `src/frontend/app.json` (`version` e incremento de `versionCode`)
- Aplique diretamente nos arquivos ou use o comando unificado `npm run version:bump` (`:minor` / `:major`).

### 6. Axioma de Pull Requests, Validação de CI e Merge via GitHub CLI (`gh`)
- **Regra Absoluta de Abertura de PR:** O fluxo de conclusão de uma tarefa exige abertura de Pull Request para `dev` via `gh pr create --base dev --title "..." --body "..."`.
- **Validação Ativa de Testes (CI Gatekeeper):** O agente DEVE monitorar ativamente a execução dos testes (`gh pr checks <PR> --watch`). É expressamente proibido dar uma tarefa como encerrada sem verificar se os testes passaram (`SUCCESS`).
- **Merge via `gh` do Usuário:** Se os testes passarem, o agente DEVE usar a CLI `gh` da máquina para realizar o merge em `dev` (`gh pr merge --squash --auto` ou `gh pr merge <PR> --squash`). Se falharem, o agente deve diagnosticar, corrigir a implementação e revalidar.
- **Pré-requisito do `gh`:** O agente deve verificar se o GitHub CLI está instalado e autenticado (`gh auth status`). Caso o `gh` não esteja configurado/autenticado, o agente DEVE interromper a automação e solicitar ao usuário que realize o login (`gh auth login`).
- **Validação Mandatória com Maestro para Frontend:** Antes de commitar e dar push de qualquer branch com alterações no frontend mobile (`src/frontend/**`), o agente DEVE executar a suíte de testes de estabilidade do Maestro (`npm run test:maestro:full` ou `npm run test:maestro:docker` / MCP) para assegurar que toda a aplicação e jornadas de usuário permanecem estáveis.
