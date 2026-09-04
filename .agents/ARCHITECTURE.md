# Presco Architecture & AG Kit Inventory

Documentação de arquitetura técnica e inventário de agentes/skills do projeto Presco (INI3A-EQ3).

---

## 1. Arquitetura do Sistema Presco

Presco é uma aplicação full-stack de comparação de preços e leitura de código de barras EAN-13:
- **Backend**: Express 5, TypeScript, Drizzle ORM, PostgreSQL com extensão PostGIS e Redis.
- **Frontend**: React Native 0.86.3, Expo SDK 57, Expo Router, Reanimated 4 e Design System com tokens Monet.
- **Autoridade Máxima (P0)**:
  - [AGENTS.md](file:///c:/Users/leona/Desktop/INI3A-EQ3/.agents/AGENTS.md)
  - [CURRENT.md](file:///c:/Users/leona/Desktop/INI3A-EQ3/.agents/CURRENT.md)
  - [COMMITS.md](file:///c:/Users/leona/Desktop/INI3A-EQ3/.agents/COMMITS.md)
  - [DESIGN.md](file:///c:/Users/leona/Desktop/INI3A-EQ3/.agents/DESIGN.md)
  - [ISSUES.md](file:///c:/Users/leona/Desktop/INI3A-EQ3/.agents/ISSUES.md)

---

## 2. Inventário de Componentes de IA

| Componente | Quantidade |
|---|---|
| **Total Agents** | 18 |
| **Total Skills** | 41 |
| **Total Workflows** | 13 |
| **Total Skill Scripts** | 14 |

---

## 3. Especialistas Ativos

Os agentes e skills foram otimizados e saneados para focar exclusivamente no desenvolvimento mobile React Native e backend Node/PostgreSQL/PostGIS do Presco:
- **Mobile**: `mobile-developer` + `skills/presco-frontend` + `skills/mobile-design` + `skills/design-spec`
- **Backend & API**: `backend-specialist` + `skills/presco-backend` + `skills/api-patterns` + `skills/nodejs-best-practices`
- **Banco de Dados & GIS**: `database-architect` + `skills/database-design` + `skills/presco-backend`
- **Segurança**: `security-auditor`, `penetration-tester` + `skills/vulnerability-scanner`
- **Qualidade & Validação**: `test-engineer`, `qa-automation-engineer` + `skills/testing-patterns` + `skills/lint-and-validate`
- **Orquestração & Planejamento**: `orchestrator`, `project-planner` + `skills/coordinator-mode`
