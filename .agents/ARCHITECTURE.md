# INI3A-EQ3 & AG Kit Architecture

> Antigravity-native AI Agent Capability Toolkit — Customized for INI3A-EQ3 (2026.8.15)

---

## 📋 Overview

AG Kit integrado ao **INI3A-EQ3** é um sistema modular e de alta eficiência composto por:

- **20 Agentes Especialistas** — personas de IA baseadas em funções e papéis de orquestração;
- **60 Skills** — módulos de conhecimento progressivo e playbooks especializados (incluindo DDD backend, Drizzle PostGIS, Expo mobile, segurança e catalog manager de 300+ skills);
- **13 Workflows** — procedimentos estruturados via comandos slash;
- **6 Regras Modulares** — roteamento, código, design Monet, segurança e protocolo de contexto rápido (`CURRENT.md`);
- **Camada de Runtime Antigravity** — contrato `antigravity.json`, hook nativo `PreToolUse` em `hooks.json`, sincronizador MCP, Doctor e validadores.

---

## 🔐 Managed Component Registry (2026.8.15)

- Versão do toolkit em CalVer no arquivo `VERSION` (`2026.8.15`).
- Agentes, skills, workflows e regras utilizam SemVer estrito no YAML frontmatter.
- `manifest.json` e `manifest.lock.json` registram deterministicamente componentes, dependências e hashes SHA-256.
- `DEPENDENCY_GRAPH.md` é gerado automaticamente pelo registro.

Comandos de sincronização e validação:

```bash
python3 .agents/scripts/generate_manifest.py --check
python3 .agents/scripts/dependency_graph.py --check
python3 .agents/scripts/validate_kit.py /Users/criper/INI3A-EQ3/.agents
```

---

## 🏗️ Estrutura do Workspace `.agents/`

```plaintext
.agents/
├── AGENTS.md                 # Diretrizes arquiteturais e camadas DDD do INI3A-EQ3
├── CURRENT.md                # Ponto de entrada MANDATÓRIO: índice direto e roadmap
├── DESIGN.md                 # Especificação de tokens de design Monet / useTheme()
├── COMMITS.md                # Histórico estruturado de commits e convenções
├── ISSUES.md                 # Backlog e rastreamento de débitos técnicos
├── README.md                 # Guia de operação do toolkit
├── ARCHITECTURE.md           # Inventário de capacidades e design
├── VERSION                   # Toolkit CalVer (2026.8.15)
├── antigravity.json          # Contrato de runtime Google Antigravity
├── hooks.json                # Registro de hooks nativos (PreToolUse)
├── mcp_config.json           # Configuração de servidores MCP
├── manifest.json             # Registro de componentes gerado
├── manifest.lock.json        # Lock de integridade SHA-256
├── DEPENDENCY_GRAPH.md       # Grafo de dependências gerado
├── rules/                    # 6 regras de execução e roteamento
├── memory/                   # Contexto durável do projeto e decisões
├── agent/                    # 20 definições de papéis especialistas
├── workflows/                # 13 procedimentos slash-command
├── skills/                   # 60 skills modulares com playbooks e scripts
├── tools/                    # Ferramentas locais (CLI de 300+ skills)
├── hooks/                    # Hooks nativos, Doctor e empacotador de plugin
└── scripts/                  # Validadores, checklist e automações
```

---

## 📊 Statistics

| Metric | Value |
| --- | --- |
| **Total Agents** | 20 |
| **Total Skills** | 60 |
| **Total Workflows** | 13 |
| **Total Skill Scripts** | 18 |
| **Toolkit Utilities** | 7 user-facing + 2 internal modules |
| **Antigravity Utilities** | 4 runtime utilities |
| **Coverage** | Backend DDD, Mobile Expo, PostGIS spatial, Security, Performance, Orchestration |
| **Token Efficiency** | Leitura cirúrgica via CURRENT.md e carregamento condicional |

---

## 🔗 Quick Reference

| Necessidade | Agente | Skills Principais |
| --- | --- | --- |
| **Mobile (React Native)** | `mobile-developer` | frontend, react-native-architecture, mobile-design |
| **Backend (API / DDD)** | `backend-specialist` | backend, nodejs-backend-patterns, api-design-principles |
| **Database & PostGIS** | `database-architect` | postgresql, database-design, geo-fundamentals |
| **Segurança & JWT** | `security-auditor` | backend-security-coder, vulnerability-scanner |
| **Testes Unitários** | `test-engineer` | unit-testing-test-generate, testing-patterns |
| **Diagnóstico & Debug** | `debugger` | error-debugging-error-analysis, systematic-debugging |
| **Planejamento** | `project-planner` | plan-writing, brainstorming, app-builder |
| **Orquestração Geral** | `orchestrator` | coordinator-mode, parallel-agents, verify-changes |
