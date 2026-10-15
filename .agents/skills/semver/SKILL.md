---
name: semver
description: "Strict Semantic Versioning (SemVer 2.0.0) standard and release management for Presco. Enforces MAJOR.MINOR.PATCH rules, Conventional Commits version bumping, synchronized multi-package updates (package.json, src/backend, src/frontend, app.json), and GitHub Actions release automation. Use when bumping versions, cutting releases, managing breaking changes, or tagging commits."
when_to_use: "Always active when modifying code or preparing releases. Enforces SemVer 2.0.0 rules (MAJOR, MINOR, PATCH), multi-package synchronization, and Android versionCode increments."
version: 1.0.0
allowed-tools: Read, Write, Edit, Bash
compatibility: "Node.js >= 18, TypeScript, Git, npm, GitHub Actions"
metadata:
  author: "Presco Engineering"
  standard: "AgentSkills.io"
  spec-version: "0.1.0"
---

# Semantic Versioning (SemVer) Skill

> Formato em conformidade estrita com o padrão **Agent Skills** ([agentskills.io](https://agentskills.io) / [github.com/agentskills/agentskills](https://github.com/agentskills/agentskills)).

Esta skill estabelece e governa as diretrizes de versionamento semântico estrito (**SemVer 2.0.0**), integração com **Conventional Commits**, sincronização multi-pacote do monorepo Presco e disparo autônomo do pipeline de release no GitHub Actions.

---

## 1. Visão Geral e Estrutura SemVer 2.0.0

Todo versionamento segue o formato `MAJOR.MINOR.PATCH` (ex: `1.2.0`):

```
                       ┌───────── MAJOR: Quebra de compatibilidade (Breaking Changes)
                       │ ┌─────── MINOR: Novas funcionalidades retrocompatíveis
                       │ │ ┌───── PATCH: Correções de bugs retrocompatíveis
                       ▼ ▼ ▼
                    v  1 . 2 . 0
```

| Nível | Quando Incrementar | Exemplos no Presco | Gatilho Conventional Commit |
|---|---|---|---|
| **MAJOR** (`X.0.0`) | Mudanças incompatíveis na API pública, quebras estruturais no banco sem migração suave, ou alterações no contrato mobile-backend. | Nova especificação de auth que invalide tokens legados, remoção de endpoints ativos, quebra de contratos. | `feat!:`, `fix!:`, `BREAKING CHANGE:` |
| **MINOR** (`1.X.0`) | Novas funcionalidades retrocompatíveis. | Nova aba de monitoramento, suporte a novo formato de imagem, rotas adicionais de catálogo ou gamificação. | `feat:`, `feat(modulo):` |
| **PATCH** (`1.0.X`) | Correções de bugs, pequenas melhorias de performance e ajustes de layout/estilo que não alteram a API. | Correção de cálculo de coordenadas, ajustes de padding, correção de regex no scanner, sanitização de logs. | `fix:`, `perf:`, `refactor:`, `style:` |

---

## 2. Política de Sincronização Multi-Pacote no Presco

No ecossistema do Presco, o incremento de versão **NUNCA** deve ser aplicado em um único arquivo isolado. Sempre que a versão for atualizada, 4 manifestos devem ser sincronizados atomicamente:

1. **`package.json` (raiz)**: campo `"version"`.
2. **`src/backend/package.json`**: campo `"version"`.
3. **`src/frontend/package.json`**: campo `"version"`.
4. **`src/frontend/app.json`**:
   - `expo.version`: mesmo valor SemVer (ex: `"1.2.0"`).
   - `expo.android.versionCode`: incrementado obrigatoriamente em `+1` (inteiro incremental exigido pelo Google Play e builds nativas).

---

## 3. Comandos de Versionamento Automatizado

O repositório já dispõe do script oficial [`scripts/bump_version.ts`](file:///scripts/bump_version.ts) e de atalhos configurados no `package.json`:

```bash
# Incrementar versão Patch (ex: 1.2.0 -> 1.2.1, versionCode +1)
npm run version:bump

# Incrementar versão Minor (ex: 1.2.0 -> 1.3.0, versionCode +1)
npm run version:bump:minor

# Incrementar versão Major (ex: 1.2.0 -> 2.0.0, versionCode +1)
npm run version:bump:major

# Simulação sem escrita em disco (Dry Run)
npx tsx scripts/bump_version.ts [major|minor|patch] --dry-run
```

Ou através do script bundled desta skill:
```bash
.agents/skills/semver/scripts/bump.sh [patch|minor|major]
```

---

## 4. Integração com Conventional Commits

Os agentes e desenvolvedores devem correlacionar diretamente o prefixo do commit com a estratégia de versionamento:

```bash
# 1. Mudança de funcionalidade -> Minor bump
feat(scanner): add real-time barcode feedback
# -> npm run version:bump:minor

# 2. Correção de bug -> Patch bump
fix(auth): correct token expiration calculation
# -> npm run version:bump

# 3. Quebra de contrato de API -> Major bump
feat(api)!: remove deprecated v1 products endpoint
# -> npm run version:bump:major
```

---

## 5. Pipeline de Release & GitHub Actions

O workflow [`.github/workflows/release.yml`](file:///.github/workflows/release.yml) reage automaticamente ao versionamento:
1. Ao enviar tags com o padrão `v*.*.*` (ex: `git push origin v1.2.0`) ou disparar via `workflow_dispatch`.
2. Executa a suíte de validação: `npm run typecheck` e `npm test`.
3. Compila o APK Android release nativo via Gradle (`assembleRelease`).
4. Cria automaticamente um **GitHub Release** com o changelog estruturado e o artefato APK anexado.

---

## 6. Guias de Referência & Recursos

| Documento | Localização |
|---|---|
| Especificação SemVer 2.0.0 | [`references/semver-spec.md`](references/semver-spec.md) |
| Guia de Conventional Commits | [`references/conventional-commits.md`](references/conventional-commits.md) |
| Política Presco de Versionamento | [`references/presco-release-policy.md`](references/presco-release-policy.md) |
| Template de Release Notes | [`templates/release-notes.md`](templates/release-notes.md) |
