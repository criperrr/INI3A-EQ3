---
name: enhance
description: Adiciona ou aprimora features no Presco (React Native / Express). Focado em velocidade e economia de tokens.
version: 2.0.0
requires_agents: mobile-developer, backend-specialist
requires_skills: clean-code, verify-changes
artifact_outputs: changed-files, verification-report
---

# /enhance — Aprimorar Funcionalidade (Presco)

$ARGUMENTS

---

## Fluxo Otimizado (Alta Eficiência de Tokens)

1. **Localização Cirúrgica (Sem varrer pastas)**
   - Consulte `.agents/CURRENT.md` para encontrar os arquivos exatos da funcionalidade.
   - Abra apenas os arquivos necessários usando `view_file` com `StartLine` e `EndLine`.

2. **Detecção de Especialista**
   - **Frontend:** Se a mudança for visual, telas em `src/frontend/app/` ou componentes, utilize as diretrizes do `presco-frontend` (Expo SDK 57, Reanimated, ThemeTokens).
   - **Backend:** Se envolver rotas, controllers ou Drizzle ORM em `src/backend/`, siga o encapsulamento estrito do `presco-backend`.

3. **Execução Direta**
   - Aplique as alterações de código com precisão cirúrgica.
   - Mantenha conformidade com o sandbox do **Expo Go** (proibido pacotes com código nativo sem aviso).

4. **Validação Automática (0 Tokens de IA)**
   - Rode a verificação no terminal: `npx tsc --noEmit` ou `npm run lint`.
   - Garanta 0 erros de tipagem antes de finalizar.

5. **Atualização do Registro**
   - Atualize o status no `.agents/CURRENT.md`.
   - Adicione uma entrada concisa no `.agents/COMMITS.md` sem ler o histórico antigo.
