# INI3A-EQ3 Agent Toolkit (.agents)

Antigravity-native agent engineering toolkit customizado para o projeto **INI3A-EQ3** (Node.js/Express/Drizzle/PostGIS/Redis + React Native Expo).

---

## ⚡ Guia Rápido de Uso

### 1. Início de Sessão & Leitura de Contexto
Antes de qualquer tarefa:
- Leia [`.agents/CURRENT.md`](./CURRENT.md) para localizar arquivos, rotas e estado ativo do projeto.
- Leia [`.agents/memory/MEMORY.md`](./memory/MEMORY.md) para convenções de arquitetura e decisões duráveis.
- Leia [`.agents/DESIGN.md`](./DESIGN.md) ao trabalhar em componentes de interface no frontend.

### 2. Comandos Slash Disponíveis
| Comando | Propósito |
|---|---|
| `/plan` | Criar plano de implementação estruturado |
| `/coordinate` | Executar pesquisas ou revisões paralelas |
| `/create` | Criar novas features com gates de validação |
| `/debug` | Diagnosticar erros com análise de causa-raiz |
| `/test` | Scaffolding e execução de testes unitários |
| `/verify` | Provar que as alterações funcionam executando verificações |
| `/remember` | Salvar novas convenções duráveis na memória |
| `/status` | Resumir o estado atual do projeto |

### 3. Validação do Toolkit
```bash
python3 .agents/scripts/generate_manifest.py
python3 .agents/scripts/dependency_graph.py
python3 .agents/scripts/validate_kit.py /Users/criper/INI3A-EQ3/.agents
```

### 4. Gerenciador de Skills (300+ Skills On-Demand)
```bash
python3 .agents/tools/skills_cli.py search <termo>
python3 .agents/tools/skills_cli.py install <skill_id>
```
