---
name: presco-backend
description: Diretrizes de arquitetura, encapsulamento em camadas, Drizzle ORM, PostGIS, Redis e autenticação para o backend do Presco (INI3A-EQ3).
when_to_use: "When working on backend modules, Express routes, controllers, services, repositories, Drizzle schema, PostGIS or Redis."
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
---

# Presco Backend Skill (`presco-backend`)

Esta skill condensa as diretrizes arquiteturais e regras de desenvolvimento do backend do Presco (`src/backend`).

---

## 1. Fluxo de Camadas e Encapsulamento

O fluxo de execução é unidirecional e estrito:
```
Routes → Controller → Service → Repository → DB / Redis
```

1. **Routes (`modules/[module]/[module].routes.ts`)**:
   - Cria o `Router()`.
   - Aplica middlewares (`requireAuth`, `requireAdmin`, `rateLimiter`).
   - Delega para o método do Controller singleton.
   - **Zero lógica de negócio ou queries SQL aqui.**

2. **Controller (`modules/[module]/[module].controller.ts`)**:
   - Exportado como singleton: `export const xController = new XControllerClass()`.
   - Assinatura: `async method(req: Api.Request, res: Response, next: NextFunction)`.
   - Sempre envolver em `try/catch` e delegar erros com `next(e)`.
   - Valida `req.body` / `req.params`. Lança `new ValidationError(errors)` se inválido.
   - Respostas de sucesso devem usar o helper `success(data)`: `return res.status(200 | 201).json(success(result))`.

3. **Service (`modules/[module]/[module].service.ts`)**:
   - Exportado como singleton: `export const xService = new XServiceClass()`.
   - Toda lógica de negócio, cálculo de XP (`+15 XP` registro, `+5 XP` voto, `+25 XP` produto custom), hashing bcrypt (custo 10), assinatura JWT.
   - Lança subclasses tipadas de `AppError` (`NotFoundError`, `ForbiddenError`, `ConflictError`).
   - Nunca lida com códigos HTTP ou objetos `req`/`res`.
   - Apenas se comunica com instâncias Repository.

4. **Repository (`shared/database/repositories/[entity].repository.ts`)**:
   - Exportado como singleton: `export const EntityRepository = new EntityRepositoryClass(db)`.
   - **ÚNICO** lugar com chamadas Drizzle ORM ou comandos Redis. Proibido chamar ORM ou Redis em controllers ou services.

---

## 2. Banco de Dados e PostGIS (`shared/database/schema.ts`)

- **ORM**: Drizzle ORM com driver `pg`.
- **PostGIS**: Tabelas `user` e `market` possuem colunas de tipo `geography`.
  - **Escrita**: `{ lat, lng }`.
  - **Leitura**: Sempre converter WKB com `sql`ST_AsGeoJson(${table.location})``. Drizzle puro `.select()` retorna buffer bruto.
  - **Proximidade**: Usar `ST_DWithin(${table.location}, ST_SetSRID(ST_MakePoint(lng, lat), 4326), radiusMeters)` e ordenar com `ST_Distance`.

---

## 3. Autenticação e Sessão Redis

- **Access Token**: JWT com validade de 15 minutos, assinado com `JWT_SECRET`. Contém `{ id, email, name, roleId, jti }`.
- **Refresh Token**: String hexadecimal criptográfica de 96 bytes armazenada exclusivamente no Redis (`refresh:<token> → userId`, TTL 7 dias).
- **Blacklist**: Logout e invalidação gravam `blacklist:<jti> → "1"` no Redis com TTL igual ao tempo restante do token.
- **Middlewares (`shared/middlewares/authMiddleware.ts`)**:
  - `requireAuth`: Extrai Bearer token, verifica assinatura, checa blacklist no Redis e injeta `req.user`.
  - `requireAdmin`: Garante que `req.user.roleId >= 5` ou autoridade equivalente.

---

## 4. Classes de Erro (`shared/errors/errors.ts`)

Todas estendem `AppError(internalCode, customMessage, httpCode)`:
- `ValidationError` (422) — `errors: { field, message }[]`
- `UnauthorizedError` (401) — credenciais inválidas ou token ausente
- `ForbiddenError` (403) — sem permissão ou voto no próprio produto
- `NotFoundError` (404) — entidade não encontrada no banco
- `ConflictError` (409) — recurso já cadastrado (ex.: e-mail)
- `TooManyRequestsError` (429) — limite de requisições excedido

---

## 5. Checklist para Novos Endpoints

1. [ ] Definir ou ajustar tabelas em `shared/database/schema.ts` e tipagens DTO.
2. [ ] Adicionar método no repositório correspondente em `shared/database/repositories/`.
3. [ ] Implementar regra de negócio no service em `modules/[module]/[module].service.ts`.
4. [ ] Implementar ação do controller em `modules/[module]/[module].controller.ts` com validação e `success()`.
5. [ ] Configurar rota e middlewares (`requireAuth`, `requireAdmin`) em `modules/[module]/[module].routes.ts`.
6. [ ] Se for novo módulo, registrar rota em `src/backend/src/app.ts`.
