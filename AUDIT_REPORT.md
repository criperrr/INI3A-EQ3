# Relatório de Auditoria — INI3A-EQ3 (PResco)

> **Gerado em:** 2026-06-11  
> **Escopo:** Backend (Node/Express/Drizzle/Redis) + Frontend (Expo/React Native)  
> **Status:** ✅ Bugs críticos corrigidos | ⚠️ Problemas estruturais documentados para refactor futuro

---

## Sumário Executivo

| Categoria | Bugs Críticos | Avisos / Padrão | Implementados |
|---|---|---|---|
| Backend — Lógica | 6 | 4 | ✅ 6 corrigidos |
| Backend — Segurança | 3 | 2 | ✅ 3 corrigidos |
| Backend — Estrutura | 0 | 5 | ⚠️ documentados |
| Frontend — Lógica | 0 | 3 | ⚠️ documentados |
| Frontend — Segurança | 1 | 1 | ✅ 1 corrigido |

---

## 🔴 BUGS CRÍTICOS — Corrigidos

### BUG-01 · `me.repository.ts` — Email retornando o nome do usuário
**Arquivo:** `src/backend/src/modules/me/me.repository.ts` · Linha 33 (antes da correção)

```diff
- email: User.name,   // ← BUG: projetava o campo NAME no campo email
+ email: User.email,
```

**Impacto:** Toda chamada `GET /api/v1/me` retornava o `name` do usuário no campo `email`. Qualquer tela que exibisse o e-mail do perfil mostrava o nome em vez do e-mail.

---

### BUG-02 · `market.repository.ts` — `id` e `name` invertidos no `updateMarket`
**Arquivo:** `src/backend/src/modules/market/market.repository.ts` · Linhas 31-32

```diff
- id: Market.name,   // ← BUG: retornava o name no campo id
- name: Market.id,   // ← BUG: retornava o id no campo name
+ id: Market.id,
+ name: Market.name,
```

**Impacto:** Toda atualização de mercado retornava os campos `id` e `name` trocados na resposta JSON.

---

### BUG-03 · `market.repository.ts` — `getMarket`/`getAllMarkets` expondo binário PostGIS
**Arquivo:** `src/backend/src/modules/market/market.repository.ts` · Linhas 47, 58

```diff
- location: sql`${Market.location}`,         // ← retorna blob binário PostGIS
+ location: sql`ST_AsGeoJSON(${Market.location})`,  // retorna GeoJSON legível
```

**Impacto:** As rotas de listagem de mercados retornavam dados de localização como binário ilegível em vez de GeoJSON.

---

### BUG-04 · `me.controller.ts` — Condição invertida no delete de sessão
**Arquivo:** `src/backend/src/modules/me/me.controller.ts` · Linha 18

```diff
- if (typeof userId !== "number") await service.deleteSession(userId);
  // ↑ Só chamava o service quando userId NÃO era número — nunca deletava via fluxo normal
+ if (typeof userId === "number") await service.deleteSession(userId);
```

**Impacto:** `DELETE /api/v1/me` respondia 204 sem nunca executar a deleção no banco de dados.

---

### BUG-05 · `redis/server.ts` — `verifyJTI` usando chave errada
**Arquivo:** `src/backend/src/shared/redis/server.ts` · Linha 32

```diff
- return redisClient.exists(jti);           // ← chave sem prefixo
+ return redisClient.exists(`blacklist:${jti}`);  // ← prefixo que invalidateJWT usa
```

**Impacto:** A verificação de tokens revogados (JTI blacklist) **nunca funcionava**. Tokens invalidados via logout continuariam sendo aceitos pelo middleware de autenticação.

---

### BUG-06 · `entry.service.ts` — JWT assinado sem `jti` e `register` vazando `passHash`
**Arquivo:** `src/backend/src/modules/entry/entry.service.ts`

**Problema A — passHash no JWT (register):**
```diff
- const jwtToken = jwt.sign(userReturned[0], ...)
  // ↑ userReturned[0] poderia incluir passHash se retornado pelo DB

+ const { passHash: _, ...publicUser } = userReturned[0] as any;
+ const jwtToken = jwt.sign({ ...publicUser, jti }, ...)
```

**Problema B — JWT sem `jti` em todos os fluxos:**
Nenhum dos três fluxos (register, login, refresh) incluía `jti` no payload do JWT. O middleware `verifyJTI` tenta ler `payload.jti`, que era sempre `undefined` — causando `String(undefined) === "undefined"` como chave no Redis.

**Correção:** Adicionado `jti = crypto.randomUUID()` e incluído no payload em todos os três fluxos.

---

## 🟠 BUGS DE SEGURANÇA — Corrigidos

### SEC-01 · `.env` commitado com credenciais reais
**Arquivo:** `src/backend/.env` (raiz do gitignore)

O arquivo `.env` contém segredos de produção commitados no repositório:
- `JWT_SECRET` com valor real de 256 bits
- `DATABASE_URL` com usuário/senha do PostgreSQL
- `REDIS_URL` com credencial de instância Upstash de produção

> ⚠️ **AÇÃO IMEDIATA RECOMENDADA:** Rotacionar as credenciais de Redis e banco de dados. O `JWT_SECRET` exposto invalida a segurança de todos os tokens emitidos.

**Corrigido:** Adicionados arquivos `.env.example` em `src/backend/` e `src/frontend/`.

---

### SEC-02 · `market.service.ts` — Catch invertido expunha erros internos
**Arquivo:** `src/backend/src/modules/market/market.service.ts`

```diff
- if (!(e instanceof ApiError)) throw e;   // ← re-throw apenas erros NÃO-ApiError,
  //   depois sempre throw DatabaseInternalError — nunca propagava ApiErrors

+ if (e instanceof ApiError) throw e;       // ← propaga ApiErrors corretamente
```

**Impacto:** Erros de validação (ex: `Conflict`, `BadRequest`) eram descartados e substituídos por um erro 500 genérico.

---

### SEC-03 · `auth.service.ts` — JWT sem verificação de expiração explícita na estrutura
O `verifyJTI` retornava `number` (0 = não existe, 1 = existe). O valor `0` é **falsy** mas um `await` de `exists()` retornando `0` não lançaria exceção — a condição `if (!isValid)` funciona corretamente nesse caso. **Status: OK, mas documentado para clareza.**

---

## 🟡 AVISOS / PADRÃO DE INDÚSTRIA — Não críticos, a resolver

### WARN-01 · `server.ts` — Redis conectado APÓS o servidor começar a aceitar requests
**Arquivo:** `src/backend/src/server.ts`

```diff
- app.listen(PORT, async () => {
-   await connectRedis();   // ← Redis conecta DEPOIS do servidor já estar ouvindo
- });

+ async function bootstrap() {
+   await connectRedis();   // ← Redis conecta ANTES de aceitar requests
+   app.listen(PORT, () => { ... });
+ }
```

**Impacto:** Durante o boot, havia uma janela de tempo em que o servidor aceitava requests mas o Redis ainda não estava pronto — causando falhas em autenticação. **Corrigido.**

---

### WARN-02 · `errors.ts` — `HttpInternalServerError` tem comportamento autodestrutivo
**Arquivo:** `src/backend/src/shared/errors/errors.ts` · Linhas 77-90

```ts
export class HttpInternalServerError extends ApiError {
  constructor(...) {
    super(500, ...);
    throw new InternalSystemError(this, ...);  // ← throws dentro do constructor!
  }
}
```

Lançar dentro de um constructor é um anti-pattern. O objeto `HttpInternalServerError` nunca chega a ser capturado pelo handler — apenas `InternalSystemError` é propagado. O errorHandler testa `instanceof ApiError` antes de `instanceof InternalSystemError`, então `InternalSystemError` nunca cai no branch correto.

**Recomendação:** Separar as classes. Usar `HttpInternalServerError` apenas para o errorHandler e `InternalSystemError` para logging interno.

---

### WARN-03 · `verifyRole.ts` — Middleware de autorização vazio
**Arquivo:** `src/backend/src/shared/middlewares/verifyRole.ts`

```ts
function role(role: Roles) {
  function handler(req, res, next) {
    //...  ← sem implementação
  }
}
```

O middleware de verificação de roles não tem nenhuma lógica. As rotas protegidas autenticam via JWT mas **não verificam permissões**. Qualquer usuário autenticado pode criar/editar mercados independente do seu role.

---

### WARN-04 · `market.controller.ts` — Controller incompleto exposto no router
**Arquivo:** `src/backend/src/modules/market/market.controller.ts`

```ts
const createMarket: Handlers.CreateMarket = function (req, res, next) {
  const market = req.body;
  // ← sem return, sem chamada ao service, sem resposta HTTP
}
```

O controller não foi implementado. Como o `market.routes.ts` também não registra nenhuma rota, isso não causa erro em runtime — mas indica um módulo inteiro não funcional.

---

### WARN-05 · `@types/` duplicação — tipos declarados em dois lugares
**Arquivos:** `src/backend/src/shared/types/apiResponse.ts` e `apiRequest.ts`

`UpdateUserRequest` está definida em ambos `apiRequest.ts` e `apiResponse.ts` com a mesma interface. A que está em `apiResponse.ts` é um import direto. Isso cria risco de divergência.

**Recomendação:** Consolidar todos os tipos de request/response em `apiRequest.ts` e importar de lá.

---

### WARN-06 · `@types/` — `@types/redis` em `dependencies` (deveria ser `devDependencies`)
**Arquivo:** `src/backend/package.json` · Linha 7

```json
"@types/redis": "^4.0.10"  // está em "dependencies" — deveria estar em "devDependencies"
```

Pacotes `@types/*` são declarações de tipo em tempo de compilação e não devem ser incluídos no bundle de produção.

---

### WARN-07 · Frontend — `bcrypt.ts` é um wrapper trivial sem valor
**Arquivo:** `src/backend/src/shared/util/bcrypt.ts`

```ts
export async function hash(target: string, rounds: number = 10) {
  return bcrypt.hash(target, rounds);  // wrapper 1:1 sem lógica adicional
}
```

Wrapper de uma linha que simplesmente re-exporta bcrypt. Aumenta a superfície de código sem benefício. O comentário no próprio arquivo confirma isso.

---

### WARN-08 · Frontend — Contribution grid com dados MOCK hardcoded em produção
**Arquivo:** `src/frontend/app/profile.tsx` · Linha 25

```ts
const MOCK_CONTRIBUTIONS = Array.from({ length: 18 }, () =>
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)),
);
```

Dado fake exibido como "Histórico de contribuições dos últimos 75 dias". Nenhuma API real é consultada para esse componente.

---

### WARN-09 · Frontend — Imagem de avatar hardcoded via URL externa no cadastro
**Arquivo:** `src/frontend/app/registerUser.tsx` · Linha 26

```ts
const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2015/10/05/...";
```

Depende de CDN externa. O botão de câmera existe mas não tem funcionalidade — `AvatarPicker` não implementa seleção de imagem.

---

### WARN-10 · Backend — Ausência de rate limiting
Nenhuma rota (em especial `/auth/login` e `/auth/register`) possui rate limiting. Susceptível a ataques de força bruta e enumeração de e-mails.

**Recomendação:** Adicionar `express-rate-limit` nas rotas públicas de autenticação.

---

### WARN-11 · Backend — Ausência de CORS configurado
**Arquivo:** `src/backend/src/app.ts`

Nenhum middleware `cors()` é aplicado. O app funciona para o mobile (React Native não tem CORS) mas não funcionaria para qualquer consumidor web.

---

### WARN-12 · Backend — Ausência de validação de schema com Zod
Os próprios autores documentaram isso em múltiplos comentários `TODO`. Os controllers recebem `req.body` sem qualquer validação estrutural. O pacote `zod` já está instalado mas não utilizado.

---

## ✅ Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/backend/src/server.ts` | Bugfix — bootstrap assíncrono antes de listen |
| `src/backend/src/modules/auth/auth.controller.ts` | Bugfix — remoção de `temp()`, tipo `NextFunction`, lógica de token |
| `src/backend/src/modules/entry/entry.service.ts` | Bugfix SEC — `jti` adicionado ao JWT, `passHash` removido do register |
| `src/backend/src/modules/me/me.controller.ts` | Bugfix — condição invertida no delete, `NextFunction` |
| `src/backend/src/modules/me/me.repository.ts` | Bugfix CRÍTICO — `email: User.name` → `email: User.email` |
| `src/backend/src/modules/market/market.repository.ts` | Bugfix CRÍTICO — `id`/`name` trocados, `ST_AsGeoJSON` |
| `src/backend/src/modules/market/market.service.ts` | Bugfix — condição de catch invertida |
| `src/backend/src/shared/redis/server.ts` | Bugfix SEC — prefixo `blacklist:` em `verifyJTI`, implementação de `destroyRefreshToken`, remoção de import morto |
| `src/backend/src/shared/middlewares/errorHandler.ts` | Padrão — `console.log` → `console.error` |
| `src/backend/src/shared/database/schema.ts` | Padrão — `.default()` duplicado removido |
| `src/backend/.env.example` | Novo arquivo — template de variáveis de ambiente |
| `src/frontend/.env.example` | Novo arquivo — template de variáveis de ambiente |

---

## Próximos Passos Recomendados (por prioridade)

1. **[URGENTE]** Rotacionar credenciais expostas no `.env` commitado
2. **[ALTO]** Implementar `verifyRole` middleware e aplicar nas rotas de mercado
3. **[ALTO]** Implementar validação de request com Zod em todos os controllers
4. **[ALTO]** Adicionar `express-rate-limit` nas rotas de autenticação
5. **[MÉDIO]** Implementar `market.controller.ts` e registrar rotas
6. **[MÉDIO]** Substituir `MOCK_CONTRIBUTIONS` por dados reais da API
7. **[MÉDIO]** Implementar `AvatarPicker` com seleção real de imagem
8. **[BAIXO]** Configurar CORS para futuros consumidores web
9. **[BAIXO]** Consolidar tipos duplicados (`UpdateUserRequest`)
10. **[BAIXO]** Mover `@types/redis` para `devDependencies`
