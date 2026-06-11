# PRD — Presco
**Produto:** Presco — Comparador de Preços Colaborativo  
**Versão:** 1.0  
**Data:** 2026-06-11  
**Equipe:** INI3A-EQ3 / CTI Bauru  

---

## 1. Visão Geral

O **Presco** é um aplicativo mobile de comparação de preços alimentado pela comunidade (*crowdsourcing*). Usuários registram preços de produtos em mercados próximos a eles, e o sistema consolida essas informações em tempo real, permitindo que qualquer pessoa encontre as melhores ofertas locais antes de ir às compras.

O projeto visa resolver um problema concreto do consumidor brasileiro: a falta de transparência e comparabilidade de preços entre estabelecimentos físicos próximos, especialmente em cidades de médio porte.

---

## 2. Objetivos do Produto

| Objetivo | Métrica de Sucesso |
|---|---|
| Permitir registro e consulta de preços em tempo real | Latência de resposta da API ≤ 300ms (p95) |
| Manter integridade dos dados via detecção de outliers | Taxa de preços falsos < 5% do total publicado |
| Oferecer busca rápida e intuitiva de produtos | Usuário localiza produto desejado em ≤ 3 toques |
| Estrutura de categorias clara e navegável | Profundidade máxima de 2 níveis hierárquicos |
| Sistema de reputação que incentiva contribuições confiáveis | Retenção mensal de contribuidores ativos ≥ 40% |

---

## 3. Stack Tecnológica

### 3.1 Frontend — React Native + Expo

| Tecnologia | Versão | Propósito |
|---|---|---|
| **React Native** | 0.81.x | Framework mobile cross-platform (Android/iOS) |
| **Expo** | ~54.x | Toolchain gerenciada; build, câmera, haptics, splash |
| **Expo Router** | ~6.x | Roteamento baseado em arquivo (file-based routing) |
| **React Navigation** | ^7.x | Navegação por abas inferiores (`bottom-tabs`) |
| **React Native Maps** | 1.20.x | Mapa interativo para visualização geolocalizada de mercados |
| **Expo Camera** | ~17.x | Leitor de código de barras EAN para registro de produtos |
| **React Native Reanimated** | ~4.x | Animações nativas de alta performance |
| **React Native Gesture Handler** | ~2.28.x | Gestos e swipe nativo |
| **Lucide React Native** | ^1.17.x | Ícones vetoriais consistentes |
| **Async Storage** | 2.2.x | Persistência local de sessão/tokens |

**Como usar:** O frontend consome a API REST do backend via `fetch` ou biblioteca equivalente. Toda autenticação usa JWT armazenado no AsyncStorage. A geolocalização do usuário é obtida via `expo-location` (a ser adicionado) para filtrar mercados e preços próximos. As telas seguem o padrão de arquivo em `src/frontend/app/*.tsx` com Expo Router.

---

### 3.2 Backend — Node.js + Express + TypeScript

| Tecnologia | Versão | Propósito |
|---|---|---|
| **Node.js** | ≥ 20 LTS | Runtime JavaScript server-side |
| **Express** | ^5.x | Framework HTTP minimalista para a API REST |
| **TypeScript** | ^6.x | Tipagem estática, segurança em tempo de compilação |
| **Drizzle ORM** | ^0.45.x | ORM type-safe para PostgreSQL; migrations e queries |
| **Zod** | ^4.x | Validação e parsing de schemas de entrada da API |
| **jsonwebtoken** | ^9.x | Geração e verificação de JWT (access token, 2 dias) |
| **bcrypt** | ^6.x | Hash seguro de senhas |
| **tsx** | ^4.x | Execução de TypeScript sem pré-compilação (dev) |

**Como usar:** A API segue arquitetura modular em `src/backend/src/modules/<domínio>/`. Cada módulo contém `routes.ts → controller.ts → service.ts → repository.ts`. Os controllers recebem `Request/Response` do Express, delegam ao service a lógica de negócio, e o repository executa as queries via Drizzle ORM. Rotas protegidas usam middleware de autenticação JWT que injeta o payload decodificado em `req.user`.

---

### 3.3 Banco de Dados — PostgreSQL + PostGIS

| Tecnologia | Propósito |
|---|---|
| **PostgreSQL** | Banco relacional principal |
| **PostGIS** | Extensão geoespacial: armazena pontos `GEOGRAPHY(POINT, 4326)` e realiza queries de proximidade via `ST_DWithin` |
| **pg_trgm** | Busca fuzzy por similaridade de texto (índice GIN trigram para nome de produto) |
| **unaccent** | Normalização de acentos em buscas de texto |

**Como usar:** A URL de conexão é injetada via variável de ambiente `DATABASE_URL`. O ORM Drizzle lê o schema em `src/backend/src/shared/database/schema.ts` e gera migrations com `npm run db:migrate`. Queries geoespaciais críticas (filtrar mercados por raio) devem usar SQL raw com `sql\`\`` do Drizzle quando necessário, pois PostGIS requer funções específicas não cobertas pelo query builder padrão.

---

### 3.4 Cache — Redis (Upstash)

| Tecnologia | Propósito |
|---|---|
| **Redis** (cliente `redis` ^6) | Cache de refresh tokens (TTL 30 dias) e cache de respostas quentes |
| **Upstash Redis** | Instância serverless gerenciada, acesso via `rediss://` (TLS) |

**Como usar:** O Redis é usado exclusivamente via `src/backend/src/shared/redis/server.ts`. Refresh tokens são armazenados com chave `refresh:<userId>` e expiram automaticamente. Para cache de rotas com alta frequência de leitura (ex: listagem de produtos em alta), usar `setEx` com TTL de 60s antes de bater no banco.

---

## 4. Arquitetura Geral

```
[React Native App]
       │  HTTP REST (JSON)
       ▼
[Express API — Node.js/TypeScript]
       ├── /api/v1/auth      → registro, login, refresh JWT
       ├── /api/v1/me        → perfil, pontuação, badges
       ├── /api/v1/products  → CRUD + busca fuzzy
       ├── /api/v1/markets   → CRUD + busca geoespacial
       ├── /api/v1/entries   → publicação e listagem de preços (ocurrências)
       ├── /api/v1/categories → hierarquia de categorias
       └── /api/v1/votes     → upvote/downvote de ocurrências
              │
              ├──► PostgreSQL + PostGIS  (dados persistentes)
              └──► Redis / Upstash       (tokens + cache)
```

**Padrão de resposta da API:**
```json
// Sucesso
{ "data": { ... }, "message": "ok" }

// Erro
{ "error": "NOME_DO_ERRO", "message": "descrição legível" }
```

---

## 5. Modelo de Dados

O banco já possui as seguintes entidades principais (ver `dbQueries.sql` e `schema.ts`):

| Tabela | Descrição |
|---|---|
| `user` | Conta do usuário: nome, email, hash de senha, pontuação, geolocalização, role |
| `role` / `scope` | RBAC: papéis (visitante, colaborador, moderador, admin) e permissões granulares |
| `product` | Catálogo global de produtos: EAN, NCM, nome, descrição, ícone |
| `market` | Estabelecimento comercial com coordenada geográfica |
| `ocurrency` | **Ocorrência de preço**: usuário reporta preço de um produto em um mercado específico. Contém `trust_flag`, `is_suspended`, `upvote_count`, `downvote_count`, `volate` (flag de outlier) |
| `cured` | Votos de curadoria de moderadores sobre uma ocorrência |
| `badge` / `user_badge` | Sistema de conquistas baseado em pontuação |
| `cart` / `cart_product` | Lista de compras pessoal do usuário |

> **Entidades a adicionar:**
> - `category` — hierarquia de categorias de produto (id, name, parent_id nullable)
> - `product_category` — relação N:N produto ↔ categoria

---

## 6. Funcionalidades (Features)

### 6.1 F1 — Publicação de Preços em Tempo Real (Crowdsourcing + Geolocalização)

**Descrição:** Qualquer usuário autenticado pode registrar o preço de um produto em um mercado específico. O registro é denominado **ocorrência** (`ocurrency`).

**Fluxo do usuário:**
1. Usuário abre o app e permite acesso à localização.
2. O app exibe mercados próximos (raio configurável, padrão 5km) via mapa ou lista.
3. Usuário seleciona um mercado e um produto (por busca ou escaneamento de código de barras EAN via câmera).
4. Usuário informa o preço visto fisicamente e confirma.
5. A ocorrência é criada com `trust_flag = true` e entra no pipeline de validação.
6. O usuário recebe pontos pela contribuição.

**Regras de negócio:**
- Uma ocorrência deve ter `user_id`, `market_id`, `product_id` e `value > 0`.
- O mesmo usuário não pode registrar a mesma combinação produto+mercado mais de uma vez por hora (rate limiting no Redis).
- Ocorrências mais recentes têm maior peso na exibição do preço atual.
- Usuários com `danger_flag = true` têm ocorrências submetidas com `trust_flag = false` automaticamente.

**Endpoints necessários:**
- `POST /api/v1/entries` — criar ocorrência
- `GET /api/v1/entries?market_id=&product_id=&lat=&lng=&radius=` — listar ocorrências filtradas

**Telas do frontend:**
- `scannerProduct.tsx` — leitor EAN via câmera
- `scannerConfirmation.tsx` — confirmação antes de salvar
- `registerProduct.tsx` — cadastro manual caso produto não exista no catálogo

---

### 6.2 F2 — Algoritmo de Detecção e Eliminação de Preços Falsos (Outlier Detection)

**Descrição:** Um algoritmo automatizado analisa as ocorrências de um produto em um mercado e sinaliza como suspeitos os preços que desviam excessivamente da mediana local.

**Método:** **IQR (Interquartile Range)**

Para cada combinação `(product_id, market_id)` com ao menos 5 ocorrências recentes (`is_resolved = false`, últimas 72h):

```
Q1 = percentil 25 dos valores
Q3 = percentil 75 dos valores
IQR = Q3 - Q1
Limite inferior = Q1 - 1.5 * IQR
Limite superior = Q3 + 1.5 * IQR

Se value < limite_inferior OU value > limite_superior:
    ocurrency.volate = true
    ocurrency.is_suspended = true
```

**Gatilhos de execução do algoritmo:**
1. **Por evento:** executado sempre que uma nova ocorrência é criada para aquele par produto+mercado (inline no service, assíncrono via fila simples ou `setImmediate`).
2. **Por agendamento:** job cron a cada 6 horas que reavalia todas as ocorrências não resolvidas. Garante correção quando novos dados mudam o baseline.

**Regras adicionais:**
- Ocorrências com alto `downvote_count` (threshold configurável, ex: ≥ 5 downvotes) são suspensas independentemente do IQR.
- Ocorrências suspensas não são exibidas ao usuário final, mas são mantidas no banco para auditoria.
- Moderadores podem revisar ocorrências suspensas via `cured` (veredicto booleano).
- Se um preço for restaurado por moderador (`cured.verdict = true`), `is_suspended` volta a `false`.

**Função a implementar:** `src/backend/src/shared/util/outlierDetection.ts`
```typescript
// Assinatura esperada
export function detectOutliers(values: number[]): Set<number>  // retorna índices suspeitos
export async function evaluateOcurrencies(productId: number, marketId: number): Promise<void>
```

---

### 6.3 F3 — Barra de Pesquisa com Busca Fuzzy de Produtos

**Descrição:** O usuário digita o nome (parcial ou com erros ortográficos) de um produto e recebe uma lista ordenada por relevância dos produtos correspondentes no catálogo, com o melhor preço local disponível para cada um.

**Como funciona no banco:**
- A extensão `pg_trgm` cria um índice GIN trigram (`idx_product_name_trgm`) na coluna `product.name`.
- A query usa `similarity(name, $query) > 0.2` para busca fuzzy, ordenado por `similarity DESC`.
- Opcionalmente, `unaccent` normaliza acentuação (ex: "feijao" encontra "Feijão").
- O resultado inclui o preço mais recente e confiável (`trust_flag = true`, `is_suspended = false`) para a localização do usuário.

**Endpoint necessário:**
- `GET /api/v1/products/search?q=arroz&lat=-22.3&lng=-49.07&radius=5000`

**Comportamento esperado:**
- Retorna lista de produtos com campos: `id`, `name`, `ean`, `icon`, `best_price` (preço mais baixo local), `market_name`, `distance_m`.
- Limite de 20 resultados por página (cursor-based pagination).
- Busca por EAN direto (scan de código de barras) tem prioridade absoluta — retorna produto exato.

**Tela do frontend:**
- `search.tsx` — campo de busca com debounce de 300ms, lista de resultados com scroll infinito.

---

### 6.4 F4 — Hierarquia de Categorias de Produtos

**Descrição:** Produtos são organizados em uma estrutura de dois níveis: **Categoria** (nível 1) e **Subcategoria** (nível 2). Exemplo: `Alimentos > Laticínios`, `Higiene > Cabelo`.

**Modelo de dados a criar:**
```sql
CREATE TABLE category (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    icon      TEXT,
    parent_id INT REFERENCES category(id) ON DELETE SET NULL
);

CREATE TABLE product_category (
    product_id  INT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);
```

**Categorias iniciais sugeridas:**
| Categoria | Subcategorias |
|---|---|
| Alimentos | Laticínios, Grãos e Cereais, Carnes, Bebidas, Panificados, Hortifrúti, Congelados |
| Higiene | Cabelo, Corpo, Bucal, Feminino, Masculino |
| Limpeza | Roupas, Casa, Utensílios |
| Pet | Ração, Acessórios |
| Farmácia | Medicamentos OTC, Vitaminas |

**Endpoints necessários:**
- `GET /api/v1/categories` — lista todas as categorias com subcategorias aninhadas
- `GET /api/v1/categories/:id/products?lat=&lng=&radius=` — produtos de uma categoria com preços locais

**Tela do frontend:**
- Tela de categorias (a criar): grid de ícones de categorias → tela de subcategorias → lista de produtos.

---

## 7. Funcionalidades de Suporte

### 7.1 Autenticação (já parcialmente implementada)
- Registro com e-mail e senha: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login` → retorna `{ jwt, refreshToken }`
- Renovação de JWT via refresh token: `POST /api/v1/auth/refresh`
- JWT com expiração de 2 dias; refresh token no Redis com TTL de 30 dias

### 7.2 Perfil e Gamificação
- `GET /api/v1/me` — perfil do usuário autenticado (pontos, badges, histórico de contribuições)
- Pontuação: +10 pts por ocorrência criada aceita; -5 pts por ocorrência rejeitada; bônus de streak semanal
- Badges automáticos desbloqueados por limiar de pontos (`badge.min_points`)

### 7.3 Votos em Ocorrências
- `POST /api/v1/votes` — `{ ocurrency_id, type: "up"|"down" }`
- Um usuário pode votar uma única vez por ocorrência
- Downvotes acumulados disparam a reavaliação automática do outlier detector

### 7.4 Mapa de Mercados
- `GET /api/v1/markets?lat=&lng=&radius=` — mercados próximos com preços agregados
- Tela `map.tsx` exibe pins no mapa; ao tocar, mostra mercado e produtos com preços

### 7.5 Lista de Compras (Cart)
- `POST /api/v1/me/cart` — criar/atualizar lista de compras
- `GET /api/v1/me/cart` — retorna produtos na lista com o menor preço por mercado nas proximidades
- Funcionalidade de "rota de compras": agrupa produtos por mercado para minimizar deslocamento

---

## 8. Sistema de Permissões (RBAC)

| Role | Pontos Mínimos | Permissões |
|---|---|---|
| **Visitante** | 0 | Visualizar preços, buscar produtos |
| **Colaborador** | 0 (registrado) | + Publicar ocorrências, votar, usar câmera |
| **Contribuidor Confiável** | 500 | + Ocorrências com peso duplo no agregado |
| **Moderador** | 2000 | + Curar ocorrências suspeitas, gerenciar produtos |
| **Admin** | — (atribuído) | Acesso total |

Permissões específicas são controladas via `scope` e `role_scope` no banco.

---

## 9. Rotinas de Teste

> O agente implementador deve criar os testes nos seguintes caminhos e frameworks:

### 9.1 Backend — Testes de Unidade e Integração

**Framework:** `vitest` + `supertest`  
**Instalar:** `npm install -D vitest supertest @vitest/coverage-v8`  
**Localização:** `src/backend/src/__tests__/`  
**Script no package.json:** `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`

#### Testes a implementar:

**`outlierDetection.test.ts`** — Testes unitários do algoritmo IQR:
```
✔ detectOutliers([10, 10, 10, 10, 10]) → nenhum outlier
✔ detectOutliers([10, 10, 10, 10, 100]) → índice 4 é outlier
✔ detectOutliers([1, 10, 10, 10, 10]) → índice 0 é outlier
✔ detectOutliers([]) → array vazio não gera erro
✔ detectOutliers([10, 11]) → menos de 5 elementos → nenhum suspender (threshold mínimo)
✔ valores negativos são rejeitados antes de chegar na função
```

**`auth.test.ts`** — Testes de integração para autenticação:
```
✔ POST /api/v1/auth/register com dados válidos → 201, retorna jwt e refreshToken
✔ POST /api/v1/auth/register com email duplicado → 409 Conflict
✔ POST /api/v1/auth/register com senha fraca → 400 Bad Request (validação Zod)
✔ POST /api/v1/auth/login com credenciais corretas → 200, retorna jwt
✔ POST /api/v1/auth/login com senha errada → 401 Unauthorized
✔ POST /api/v1/auth/refresh com token válido → 200, novo jwt
✔ POST /api/v1/auth/refresh com token expirado/inválido → 401
```

**`entries.test.ts`** — Testes de integração para ocorrências de preço:
```
✔ POST /api/v1/entries autenticado com dados válidos → 201, cria ocorrência
✔ POST /api/v1/entries sem autenticação → 401
✔ POST /api/v1/entries com value = 0 → 400 (validação)
✔ POST /api/v1/entries com value negativo → 400 (validação)
✔ GET /api/v1/entries?product_id=1&market_id=1 → retorna lista paginada
✔ Ocorrência de usuário com danger_flag = true → trust_flag = false automaticamente
✔ Rate limit: mesmo usuário, mesmo produto+mercado, em < 1h → 429 Too Many Requests
```

**`products.test.ts`** — Testes de busca de produtos:
```
✔ GET /api/v1/products/search?q=arroz → retorna produtos com "arroz" no nome
✔ GET /api/v1/products/search?q=aroz → busca fuzzy encontra "Arroz" (similaridade trigram)
✔ GET /api/v1/products/search?q=7891000055120 → busca por EAN retorna produto exato
✔ GET /api/v1/products/search?q= → query vazia → 400 Bad Request
✔ Resultado inclui campo best_price quando lat/lng fornecidos
```

**`categories.test.ts`** — Testes de hierarquia:
```
✔ GET /api/v1/categories → lista categorias com subcategorias aninhadas
✔ Estrutura aninhada: categoria com parent_id nulo é nível 1
✔ GET /api/v1/categories/:id/products → retorna produtos daquela categoria
✔ Produto pode pertencer a múltiplas categorias
```

**`votes.test.ts`** — Testes de votação:
```
✔ Upvote válido incrementa upvote_count
✔ Downvote válido incrementa downvote_count
✔ Usuário não pode votar duas vezes na mesma ocorrência → 409
✔ Ao atingir 5 downvotes → outlierDetector é chamado e ocorrência pode ser suspensa
```

---

### 9.2 Frontend — Testes de Componentes

**Framework:** `jest` + `@testing-library/react-native`  
**Instalar:** `npm install -D jest @testing-library/react-native jest-expo`  
**Localização:** `src/frontend/__tests__/`  
**Script no package.json:** `"test": "jest"`

#### Testes a implementar:

**`Search.test.tsx`**:
```
✔ Renderiza barra de pesquisa vazia
✔ Digitando texto aciona onChangeText com debounce
✔ Lista de resultados renderiza corretamente com dados mockados
✔ Nenhum resultado exibe mensagem "Nenhum produto encontrado"
✔ Pressionar item navega para productDetails
```

**`OutlierBadge.test.tsx`** — componente visual de alerta de preço suspeito:
```
✔ Renderiza badge "Preço suspeito" quando volate = true
✔ Não renderiza badge quando volate = false
```

**`CategoryGrid.test.tsx`**:
```
✔ Renderiza grade de categorias com ícones
✔ Pressionar categoria navega para subcategorias
✔ Subcategorias são exibidas ao selecionar categoria pai
```

---

### 9.3 Banco de Dados — Testes de Schema

**Implementar como SQL scripts em `src/backend/src/__tests__/db/`:**

**`schema_integrity.sql`**:
```sql
-- ✔ ocurrency com value = 0 deve falhar (CHECK constraint)
-- ✔ user com pontos negativos deve falhar (CHECK constraint)
-- ✔ deletar user deve cascade para ocurrency, cart, user_badge
-- ✔ category com parent_id = próprio id deve ser rejeitado (trigger a implementar)
-- ✔ Busca por proximidade: ST_DWithin retorna apenas mercados dentro do raio
```

---

## 10. Variáveis de Ambiente

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/presco
REDIS_URL=rediss://default:<token>@<host>:<port>
JWT_SECRET=<string aleatória 256-bit>
PORT=3000

# Frontend (app.json > extra ou .env via expo-constants)
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## 11. Estrutura de Pastas Esperada (Pós-implementação)

```
src/
├── backend/
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── modules/
│       │   ├── auth/
│       │   ├── entry/           ← ocorrências de preço
│       │   ├── market/
│       │   ├── me/
│       │   ├── product/         ← [a criar] CRUD + busca fuzzy
│       │   ├── category/        ← [a criar] hierarquia de categorias
│       │   ├── vote/            ← [a criar] upvote/downvote
│       │   └── status/
│       ├── shared/
│       │   ├── database/
│       │   │   ├── schema.ts
│       │   │   └── migrate.ts
│       │   ├── util/
│       │   │   └── outlierDetection.ts  ← [a criar]
│       │   ├── middlewares/
│       │   ├── redis/
│       │   └── errors/
│       └── __tests__/
│           ├── outlierDetection.test.ts
│           ├── auth.test.ts
│           ├── entries.test.ts
│           ├── products.test.ts
│           ├── categories.test.ts
│           ├── votes.test.ts
│           └── db/
│               └── schema_integrity.sql
└── frontend/
    ├── app/
    │   ├── index.tsx
    │   ├── search.tsx
    │   ├── map.tsx
    │   ├── categories.tsx       ← [a criar]
    │   ├── productDetails.tsx
    │   ├── profile.tsx
    │   ├── settings.tsx
    │   ├── login.tsx
    │   ├── registerUser.tsx
    │   ├── registerProduct.tsx
    │   ├── scannerProduct.tsx
    │   └── scannerConfirmation.tsx
    ├── components/
    └── __tests__/
        ├── Search.test.tsx
        ├── OutlierBadge.test.tsx
        └── CategoryGrid.test.tsx
```

---

## 12. Roadmap de Implementação

| Prioridade | Feature | Módulo |
|---|---|---|
| 🔴 P0 | Algoritmo de outlier detection (IQR) | Backend — `shared/util/outlierDetection.ts` |
| 🔴 P0 | Módulo `product` (CRUD + busca fuzzy pg_trgm) | Backend — `modules/product/` |
| 🔴 P0 | Módulo `category` + seed de categorias | Backend — `modules/category/` |
| 🟠 P1 | Módulo `vote` (up/down com trigger de outlier) | Backend — `modules/vote/` |
| 🟠 P1 | Tela de categorias e subcategorias | Frontend — `app/categories.tsx` |
| 🟠 P1 | Integração real da busca (`search.tsx` → API) | Frontend |
| 🟡 P2 | Integração da tela de mapa com mercados reais | Frontend — `map.tsx` |
| 🟡 P2 | Gamificação: atribuição automática de badges | Backend — `modules/me/` |
| 🟡 P2 | Testes de unidade e integração completos | Backend + Frontend |
| 🟢 P3 | Lista de compras inteligente com rota otimizada | Backend + Frontend |
| 🟢 P3 | Painel de moderação | Backend — admin scopes |

---

## 13. Glossário

| Termo | Definição |
|---|---|
| **Ocorrência** (`ocurrency`) | Registro de um preço de um produto em um mercado por um usuário |
| **Trust Flag** | Indica se uma ocorrência é de origem confiável |
| **Volate** | Flag que indica que o preço é estatisticamente suspeito (outlier) |
| **Curadoria** (`cured`) | Revisão manual de moderadores sobre ocorrências suspensas |
| **EAN** | Código de barras europeu de 13 dígitos que identifica univocamente um produto |
| **NCM** | Nomenclatura Comum do Mercosul — classificação fiscal de produtos |
| **IQR** | Interquartile Range — método estatístico para detecção de outliers |
