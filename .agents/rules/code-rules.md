---
name: code-rules
version: 1.0.0
priority: P0
trigger: model_decision
description: Apply when writing, building, refactoring, or fixing code in INI3A-EQ3 — project-type routing, Socratic Gate, Plan Mode phases, and validation scripts.
---

# Code Rules (P0) - INI3A-EQ3 & AG Kit

> Carregado quando a requisição envolve escrita, refatoração ou correção de código no INI3A-EQ3.

---

## 📱 Project Type Routing (INI3A-EQ3)

| Componente | Agente Principal | Skills Primárias | Escopo |
|---|---|---|---|
| **MOBILE (Frontend)** | `mobile-developer` | `frontend`, `react-native-architecture`, `mobile-design` | `src/frontend` (Expo Router, Barcode Scanner, Map, `useTheme()`) |
| **BACKEND (API)** | `backend-specialist` | `backend`, `nodejs-backend-patterns`, `api-design-principles`, `backend-security-coder` | `src/backend` (Express, Routes, Controllers, Services, Repositories) |
| **DATABASE & GIS** | `database-architect` | `postgresql`, `database-design`, `geo-fundamentals` | Drizzle Schema, PostGIS Geography (`ST_AsGeoJson`), GIN/GiST Índices |

> 🔴 **Regra de Especialização:** Mudanças em `src/frontend` devem acionar `mobile-developer` e respeitar `DESIGN.md`. Mudanças em `src/backend` devem acionar `backend-specialist` e respeitar o fluxo em camadas DDD (`AGENTS.md`).

---

## 🛑 GLOBAL SOCRATIC GATE

**MANDATÓRIO: Toda requisição ambígua deve passar pelo Socratic Gate antes de invocar subagentes ou executar mudanças estruturais.**

| Tipo de Requisição | Ação Requerida |
|---|---|
| **Nova Feature / Módulo** | Elaborar plano formal (`/plan`) e esclarecer decisões de API / Modelo |
| **Correção de Bug** | Diagnosticar causa-raiz antes de editar (`systematic-debugging`) |
| **Orquestração Completa** | Obter aprovação do plano antes de disparar subagentes |

---

## 🏁 Checklist de Validação

| Etapa | Comando | Objetivo |
|---|---|---|
| **Validação Toolkit** | `python3 .agents/scripts/validate_kit.py /Users/criper/INI3A-EQ3/.agents` | Integridade do `.agents` |
| **Auditoria Projeto** | `python3 .agents/scripts/checklist.py .` | Checagem de segurança e integridade |
| **Segurança Backend** | `python3 .agents/skills/vulnerability-scanner/scripts/security_scan.py .` | Verificação de injeções e segredos |
| **Doctor Antigravity**| `node .agents/hooks/antigravity-doctor.mjs` | Verificação de runtime e hooks |

---
