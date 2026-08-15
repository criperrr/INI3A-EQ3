---
type: project
created: 2026-08-15
updated: 2026-08-15
---

# Project Conventions - INI3A-EQ3

## 1. Arquitetura & Camadas
- **Backend (`src/backend`):** Fluxo obrigatório `Routes → Controller → Service → Repository → DB/Redis`.
  - Path alias: `@/*` resolve para `src/backend/src/*`.
  - Controllers: Instância singleton, `try/catch`, repassa erro para `next(e)`, validação com array `errors`, retorno de sucesso usando o helper `success(data)`.
  - Services: Instância singleton, regras de negócio e hashing (bcrypt cost 10), lança classes tipadas de `AppError`.
  - Repositories: Único local com chamadas ao Drizzle ORM ou Redis.
- **Frontend (`src/frontend`):** React Native, Expo, Expo Router para navegação baseada em arquivos.
  - Toda chamada HTTP passa por `services/api.ts` (`apiRequest<T>`).
  - Todo estilo visual consome `useTheme()` e respeita `.agents/DESIGN.md`.

## 2. Ambiente de Desenvolvimento & Execução
- Startup via `./start_project.sh` iniciando sessão `tmux` com backend na porta 3333 e frontend na porta 8081.
- Tunnels localtunnel: `ini3a-eq3-api` (porta 3333) e `ini3a-eq3-app` (porta 8081).
- Header `Bypass-Tunnel-Reminder: true` injetado em todas as requisições do frontend.

## 3. Git & Commits
- Registro obrigatório de alterações no arquivo `.agents/COMMITS.md`.
- Formato de commit estruturado: `## [YYYY-MM-DD HH:mm] - TYPE(scope): Short title`.
