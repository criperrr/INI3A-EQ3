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
  - **Criação Prévia Mandatória de Branch (NUNCA alterar em `main` ou `dev`):** Antes de realizar qualquer modificação em qualquer arquivo do projeto, a IA DEVE OBRIGATORIAMENTE criar uma branch temática a partir de `dev` (`git checkout -b <categoria>/<nome-da-task> dev`). É terminantemente proibido codificar diretamente na `main` ou na `dev`.
  - **Exigência de GitHub CLI (`gh` Instalado e Autenticado):** O agente deve verificar se o `gh` está instalado (`which gh`). Se ausente, deve orientar a instalação (`sudo apt install gh`, `brew install gh`, etc.). Deve verificar `gh auth status` e, se deslogado, interromper a automação e solicitar `gh auth login`.
  - **Regra Absoluta de Ciclo de PR e Merge via `gh`:** O agente DEVE criar o PR (`gh pr create --base dev`), monitorar obrigatoriamente se os testes do CI passaram (`gh pr checks <PR> --watch`), e caso tenham passado, utilizar a CLI `gh` para realizar o merge em `dev` (`gh pr merge --squash`).
  - **Download e Diagnóstico Autônomo de Falhas no CI:** Se a esteira falhar, o modelo DEVE investigar os logs de erro (`gh run view <run-id> --log-failed`) e baixar o pacote de artefatos (`gh run download <run-id> -n maestro-e2e-audit-reports`) para debugar screenshots e logs sem onerar a máquina local.
  - **Teste Mandatório com Maestro para Frontend:** Antes de enviar branch com modificações no frontend (`src/frontend/**`), o agente DEVE testar a estabilidade completa usando o Maestro (`npm run test:maestro:full` ou `npm run test:maestro:quick` ou `npm run test:maestro:docker`).
- **Economia de Contexto e Execução Cirúrgica:**
  - Priorizar economia de tokens e modificações diretas sem ler arquivos gigantescos desnecessariamente.

