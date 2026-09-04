---
type: project
created: 2026-08-01
updated: 2026-09-04
---

# Project Conventions - Presco (INI3A-EQ3)

Diretrizes de fluxo de trabalho, ferramentas e execução para o projeto.

---

## 1. Ambiente e Portas

- **Backend API**: Porta `3333` (`SERVER_PORT=3333`)
- **Frontend Expo Dev Server**: Porta `8081`
- **Docker Compose**:
  - PostgreSQL com PostGIS: Porta host `5433` mapeada para porta container `5432` (`postgis/postgis:16-3.4`)
  - Redis: Porta host `6380` mapeada para porta container `6379` (`redis:7-alpine`)

## 2. Comandos de Inicialização e Scripts

- **Windows**:
  - `.\start_project.ps1` ou duplo clique em `start.bat`
  - Modo LAN: `.\start_project.ps1 -Mode lan`
  - Modo Túnel: `.\start_project.ps1 -Mode corp`
  - Setup inicial: `.\setup.ps1`
- **Linux / macOS**:
  - `./start_project.sh`
  - Setup inicial: `./setup.sh`
- **Diagnósticos de Rede**:
  - `npm run dev:check` ou `npm run verify:local` (executa `scripts/verify_connection.ts`)

## 3. Fluxo de Git e Commits

- Todas as alterações significativas de tarefas devem ser registradas em `.agents/CURRENT.md` (seções 1, 2 e 3) e logadas em `.agents/COMMITS.md`.
- Formato de commit:
  ```markdown
  ## [YYYY-MM-DD] tipo: resumo da alteração

  - **Contexto:** Motivação da mudança
  - **Alterações:** Lista de arquivos e componentes alterados
  - **Validação:** Como foi testado e verificado
  ```

## 4. Prioridade de Leitura e Protocolo de Execução

1. **SEMPRE** ler `.agents/CURRENT.md` no início da tarefa para navegação cirúrgica.
2. Não fazer varreduras amplas no diretório sem necessidade (`list_dir`).
3. Respeitar os tokens de `DESIGN.md` para qualquer alteração visual.
