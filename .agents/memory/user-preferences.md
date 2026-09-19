---
type: user
created: 2026-07-18
updated: 2026-09-10
---

# User Preferences

- **Política Estrita de Git (Commits & Pushes):**
  - **NUNCA dar `git push` automaticamente.** Pushes para qualquer branch (`main`, `tests`, etc.) ou envio de tags só devem ocorrer com autorização expressa do usuário.
  - **NUNCA dar `git commit` espontaneamente.** Commits só devem ser executados quando o usuário solicitar expressamente (ex: "commita", "pode commitar"). Todas as modificações devem permanecer na working tree até ordem em contrário.
  - **Não alterar nem enviar para a branch `main`** a menos que o usuário solicite expressamente. Manter o fluxo de trabalho e testes na branch `tests`.
- **Economia de Contexto e Execução Cirúrgica:**
  - Priorizar economia de tokens e modificações diretas sem ler arquivos gigantescos desnecessariamente.
