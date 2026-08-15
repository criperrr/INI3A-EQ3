---
name: core-protocol
version: 1.0.0
priority: P0
trigger: always_on
---

# Core Protocol (P0) - INI3A-EQ3 & AG Kit

> As regras de mais alta prioridade do workspace. Definem eficiência de contexto, indexação, carregamento de memória e anúncio de skills.

---

## ⚡ 1. CONTEXT EFFICIENCY & NAVIGATION (MANDATORY FIRST STEP)

> 🔴 **REGRA #1:** Sempre leia `.agents/CURRENT.md` no início de qualquer tarefa antes de executar buscas amplas ou listar diretórios. Ele contém o estado ativo, o roadmap e os ponteiros diretos para os arquivos do backend e frontend.

1. **Uso Cirúrgico de Ferramentas:**
   - Use `view_file` com `StartLine` e `EndLine` para inspecionar apenas trechos necessários.
   - Use `grep_search` com nomes exatos de símbolos para obter números de linhas antes de abrir arquivos.
   - Evite `list_dir` a menos que esteja criando novas pastas ou atualizando o inventário.
2. **Atualização Obrigatória:**
   - Após modificar código: atualize `.agents/CURRENT.md` e registre a alteração em `.agents/COMMITS.md`.

---

## 📚 2. AGENT & SKILL PROTOCOL

> **MANDATÓRIO:** Leia o arquivo do agente especialista e as skills pertinentes antes da implementação.

### 2.1. Carregamento Modular de Skills
Agente ativado → Checar frontmatter `skills:` → Ler `SKILL.md` (Índice) → Ler seções específicas.

- **Leitura Seletiva:** Não leia todos os arquivos de uma pasta de skill. Leia `SKILL.md` primeiro e acesse playbooks secundários sob demanda.
- **Prioridade de Regras:** P0 (Regras em `.agents/rules/`) > P1 (Agentes em `.agents/agent/`) > P2 (Skills em `.agents/skills/`).

### 2.2. Anúncio Obrigatório de Skill
**Sempre que carregar e aplicar uma skill, anuncie no chat ANTES de utilizá-la:**

```markdown
📚 **Using skill: `@[skill-name]`...**
```

- Múltiplas skills: `📚 Using skills: @backend + @postgresql...` ou `📚 Using skills: @mobile-design + @frontend...`

---

## 🗺️ 3. MEMÓRIA PERSISTENTE & CONVENÇÕES

> 🔴 **MANDATÓRIO:** No início da sessão, consulte `.agents/memory/MEMORY.md` para carregar convenções persistentes de arquitetura, decisões técnicas (PostGIS, Redis, Expo) e preferências do projeto.

**Estrutura de Diretórios `.agents/`:**
- Agentes: `.agents/agent/`
- Skills: `.agents/skills/`
- Memória: `.agents/memory/`
- Regras: `.agents/rules/`
- Workflows: `.agents/workflows/`
- Scripts de Validação: `.agents/scripts/`

---

## 🧠 4. Ler → Compreender → Aplicar

```
❌ ERRADO: Ler arquivo de regra → Começar a codificar no automático
✅ CORRETO: Ler → Compreender a intenção técnica → Aplicar os padrões do projeto → Codificar
```
