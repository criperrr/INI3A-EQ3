---
type: project
created: 2026-08-15
updated: 2026-08-15
---

# Technical Decisions - INI3A-EQ3

- **PostGIS Geography:** A coluna `location` customizada no Drizzle ORM aceita `{ lat, lng }` para escrita. Para leitura, o Drizzle retorna WKB bruto — portanto, é OBRIGATÓRIO envelopar com `sql`ST_AsGeoJson(${table.location})`` para obter a string GeoJSON.
- **Redis Session Layer:** Nenhum token de autenticação é salvo em tabelas do banco de dados.
  - Refresh tokens são hex strings de 96 bytes armazenadas em `refresh:<token>` → `userId` (TTL 7 dias).
  - Access tokens são JWTs (15 min) com payload contendo `id, email, name, roleId, jti`.
  - Logout e revogação usam blacklist Redis: `blacklist:<jti>` → `"1"` com TTL igual ao tempo restante do token.
- **Frontend HTTP & Auto-Refresh:** `apiRequest<T>` intercepta HTTP 401, aciona `/auth/refresh` atômico e reexecuta a chamada uma única vez antes de disparar erro.
- **Toolkit Manifest & Lockfile:** `manifest.json` e `manifest.lock.json` são mantidos sincronizados com o frontmatter de componentes via `generate_manifest.py`.
