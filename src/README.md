# 💻 Código-Fonte do Presco (`src/`)

O código-fonte da aplicação é estruturado em duas divisões principais, permitindo o desacoplamento total entre o servidor de API e a aplicação mobile cliente:

---

## 📂 Divisões do Projeto

### 1. ⚙️ Backend (`src/backend/`)
- **Tecnologia:** Node.js, Express 5, TypeScript, Drizzle ORM, PostgreSQL (PostGIS), Redis.
- **Porta Padrão:** `3333` (subdomínio localtunnel `ini3a-eq3-api`).
- **Documentação:** Consulte [src/backend/README.md](file:///Users/aventureiromax/INI3A-EQ3/src/backend/README.md) para detalhes de arquitetura, rotas, schema e autenticação.

### 2. 📱 Frontend (`src/frontend/`)
- **Tecnologia:** React Native 0.81.5, Expo SDK 54, Expo Router, Reanimated 4, FlashList.
- **Porta Padrão:** `8081` (subdomínio localtunnel `ini3a-eq3-app` ou IP LAN via `--local-nat`).
- **Documentação:** Consulte [src/frontend/README.md](file:///Users/aventureiromax/INI3A-EQ3/src/frontend/README.md) para catálogo de telas, sistema de temas Monet, navegação por gestos 1:1 e suporte a 7 idiomas.
