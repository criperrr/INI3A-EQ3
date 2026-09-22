---
type: user
created: 2026-07-18
updated: 2026-09-22
---

# User Preferences

- **Política Estrita de Git (Commits, Pushes & Pull Requests):**
  - **Isolamento Estrito por Chat/Sessão:** Ao receber solicitação de `commit` e/ou `push`, a IA deve commitar e enviar **EXCLUSIVAMENTE os arquivos modificados ou criados durante o chat em que o pedido foi feito**. É proibido usar `git add .` ou incluir alterações de outros chats/tarefas pendentes na working tree.
  - **NUNCA dar `git push` automaticamente.** Pushes para qualquer branch (`main`, `dev`, etc.) só devem ocorrer com autorização expressa do usuário.
  - **NUNCA dar `git commit` espontaneamente.** Commits só devem ser executados quando o usuário solicitar expressamente (ex: "commita", "pode commitar"). Todas as modificações devem permanecer na working tree até ordem em contrário.
  - **Não alterar nem enviar para a branch `main`** a menos que o usuário solicite expressamente. Manter o fluxo de trabalho e branches criadas a partir de `dev`.
  - **Regra Absoluta de Ciclo de PR e Merge via `gh`:** O agente DEVE criar o PR (`gh pr create --base dev`), monitorar obrigatoriamente se os testes do CI passaram (`gh pr checks <PR> --watch`), e caso tenham passado, utilizar a CLI `gh` da máquina do usuário para realizar o merge em `dev` (`gh pr merge --squash`). Se os testes falharem, deve corrigir o código e revalidar.
  - **Exigência de Configuração do GitHub CLI (`gh`):** O agente deve verificar se o `gh` está configurado/autenticado (`gh auth status`). Se não estiver, DEVE interromper a automação e solicitar ao usuário que execute `gh auth login`.
  - **Teste Mandatório com Maestro para Frontend:** Antes de enviar branch com modificações no frontend (`src/frontend/**`), o agente DEVE testar a estabilidade completa usando o Maestro (`npm run test:maestro:full` ou `npm run test:maestro:docker`).
- **Economia de Contexto e Execução Cirúrgica:**
  - Priorizar economia de tokens e modificações diretas sem ler arquivos gigantescos desnecessariamente.

