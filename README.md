# 🏷️ Presco - Comparador Colaborativo de Preços e Scanner EAN
### Projeto de Conclusão de Curso (TCC) — CTI Bauru (UNESP) • Turma 3A-2026 (Grupo 3)

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6.x-dc382d?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 📌 Visão Geral

O **Presco** é uma plataforma colaborativa full-stack (Mobile + API REST) voltada para o monitoramento, comparação de preços e auditoria comunitária de produtos em supermercados locais. 

O usuário pode escanear o código de barras (EAN) de qualquer produto com a câmera do celular. O sistema busca as informações no banco de dados local com fallback automatizado para a base global do **OpenFoodFacts** (com auto-cache em PostgreSQL). Os usuários reportam preços (`ocurrency`), avaliam a confiabilidade dos valores inseridos por outros membros, ganham pontos de experiência (**XP**), sobem de nível e desbloqueiam **conquistas** (badges).

---

## ✨ Principais Funcionalidades

- 📷 **Scanner de Código de Barras (EAN):** Leitura instantânea via câmera com feedback tátil e busca de dados nutricionais, categoria e imagens.
- 🏪 **Relatório de Preços por Mercado:** Associação de ocorrências de preços a estabelecimentos comerciais com suporte a geolocalização e raio de proximidade via **PostGIS**.
- 🎮 **Gamificação Comunitária Completa:**
  - `+15 XP` por envio de novo preço
  - `+25 XP` por cadastro manual de produto
  - `+5 XP` por auditoria e voto de confiabilidade
  - Níveis de **1 (Iniciante)** a **99 (Administrador Master)** com patentes, conquistas e mapa de calor de contribuições no perfil.
- 🛡️ **Autenticação & Controle de Acesso:** Sistema multi-nível (Usuário Regular vs. Administrador) com tokens de acesso JWT (15 min) e rotação de Refresh Tokens em **Redis** com blacklist de JTI.
- 👆 **Navegação Gestual Interativa 1:1:** Transições horizontais entre telas no estilo TikTok/Instagram usando **React Native Reanimated 4** com física de mola (`withSpring`) e vibração háptica.
- 🎨 **Design System & Temas Dinâmicos:**
  - Suporte completo a **Light Mode**, **Dark Mode** e **AMOLED Mode** (preto puro para telas OLED).
  - Extração dinâmica de cores do sistema **Material You (Monet)** no Android.
- 🌐 **Internacionalização (i18n):** Suporte nativo completo a 7 idiomas:
  - 🇧🇷 Português (`pt-BR`) — Padrão
  - 🇺🇸 Inglês (`en-US`)
  - 🇪🇸 Espanhol (`es-ES`)
  - 🇩🇪 Alemão (`de-DE`)
  - 🇷🇺 Russo (`ru-RU`)
  - 🇨🇳 Chinês Simplificado (`zh-CN`)
  - 🇯🇵 Japonês (`ja-JP`)
- 🚀 **Otimizações Nativas de Performance:**
  - Renderização com `@shopify/flash-list` para 60/120 FPS estáveis.
  - Carregamento de imagens com `expo-image` e cache híbrido `memory-disk`.
  - Suporte a *Predictive Back Gestures* (Android 13–16) e *Edge-to-Edge* total.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia / Biblioteca | Finalidade |
|---|---|---|
| **Backend API** | Node.js, Express 5, TypeScript | Servidor HTTP RESTful estruturado em 4 camadas (DDD) |
| **Banco de Dados** | PostgreSQL 16+ com PostGIS, Drizzle ORM | Persistência relacional e consultas geoespaciais (`ST_DWithin`, `ST_AsGeoJson`) |
| **Sessões & Cache** | Redis 6+, `redis` client | Gestão de refresh tokens e blacklist de tokens revogados |
| **Frontend Mobile** | React Native 0.81.5, Expo SDK 54, Expo Router | Aplicativo multiplataforma com navegação baseada em arquivos |
| **Animações & Gestos** | React Native Reanimated 4, Gesture Handler 2, Expo Haptics | Gestos fluidos na UI thread e transições de tela direcionais |
| **Infraestrutura** | Bash, Tmux, Localtunnel, Ngrok | Orquestração de ambiente de desenvolvimento com tunelamento e LAN NAT |

---

## 📂 Estrutura de Diretórios

```
.
├── .agents/                               # Sistema de agentes Antigravity (AG Kit)
│   ├── AGENTS.md                          # Diretrizes de arquitetura, camadas e padrões de código
│   ├── CURRENT.md                         # Índice de navegação rápida e estado atual do projeto
│   ├── COMMITS.md                         # Registro cronológico detalhado de modificações
│   ├── DESIGN.md                          # Tokens de design (cores, tipografia, componentes)
│   ├── ISSUES.md                          # Log de problemas conhecidos e investigações
│   ├── memory/                            # Memória persistente entre sessões de IA
│   ├── rules/                             # Regras universais e de roteamento do AG Kit
│   └── skills/                            # Habilidades especializadas (presco-backend, presco-frontend)
├── docs/                                  # Documentação complementar, design e gestão
│   ├── design/                            # Apresentações e identidades visuais
│   ├── features/                          # Especificações técnicas de funcionalidades
│   └── README.md                          # Catálogo de documentação
├── gestao/                                # Diagramas de casos de uso e relatórios
├── sprints/                               # Planejamento e planilhas de avaliação do TCC
├── src/
│   ├── backend/                           # Servidor Node.js / Express / Drizzle / Redis
│   │   ├── src/
│   │   │   ├── app.ts                     # Configuração do Express e roteadores
│   │   │   ├── server.ts                  # Inicialização, conexão Redis/DB e seed automático
│   │   │   ├── modules/                   # Módulos de domínio (auth, product, ocurrency, market)
│   │   │   └── shared/                    # Banco, Redis, erros, middlewares, utilitários
│   │   └── README.md                      # Documentação técnica detalhada do backend
│   └── frontend/                          # Aplicativo mobile React Native / Expo
│       ├── app/                           # 18 telas com Expo Router
│       ├── components/                    # Componentes reutilizáveis (Header, Footer, Sidebar, SwipeNavigator)
│       ├── content/                       # Provedores de contexto (Auth, Theme, i18n, TabNavigation)
│       ├── i18n/                          # Dicionários de tradução em 7 idiomas
│       ├── services/                      # Camada de comunicação HTTP tipada (api.ts e domínio)
│       └── README.md                      # Documentação técnica detalhada do frontend
├── package.json                           # Scripts mestres de inicialização e gerenciamento
├── reload_services.sh                     # Utilitário de monitoramento e reinício de PostgreSQL/Redis
├── start_project.sh                       # Launcher com suporte a Tmux, Túnel e Rede Local (NAT)
└── README.md                              # Documentação principal do projeto
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- **Node.js** (v20 ou superior)
- **PostgreSQL** com a extensão **PostGIS** habilitada
- **Redis** rodando localmente na porta `6379`
- **Expo Go** instalado no seu dispositivo Android ou iOS (para testes físicos)

### 2. Configuração das Variáveis de Ambiente
Crie o arquivo `src/backend/.env` com as seguintes credenciais:
```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/presco_db
REDIS_URL=redis://localhost:6379
SERVER_PORT=3333
JWT_SECRET=sua_chave_secreta_jwt_super_segura
```

### 3. Modos de Inicialização

O projeto conta com um script inteligente `start_project.sh` configurado com múltiplos modos de execução:

#### Modo A: Wi-Fi Local (NAT / LAN) — Recomendado para Desenvolvimento Ágil
```bash
npm run dev:local
# ou: npm run dev:nat
```
> **Vantagens:** Detecta automaticamente o IP da sua rede Wi-Fi local (`192.168.x.x`), dispensa túneis, elimina latência e permite escanear o QR Code do Metro diretamente no Expo Go do seu celular conectado na mesma rede.

#### Modo B: Tunelamento (Localtunnel) — Ideal para Redes Escolares/Restritas
```bash
npm run dev
# ou: npm run dev:tunnel
```
> **Vantagens:** Cria túneis públicos para o backend (`ini3a-eq3-api`) e frontend (`ini3a-eq3-app`), permitindo conexão mesmo sob firewalls restritos.

---

## 🗄️ Gerenciamento de Serviços e Banco de Dados

Utilize os comandos utilitários para diagnosticar e gerenciar seus serviços locais:

```bash
# Verificar status do PostgreSQL, Redis e Backend
npm run db:status

# Executar health check das conexões com tempo de resposta (ms)
npm run db:check

# Reiniciar os serviços de banco e cache (PostgreSQL e Redis via Homebrew/Systemd)
npm run db:restart

# Recarregar conexões e notificar a sessão ativa do tmux
npm run db:reload
```

---

## 🌐 Catálogo de Rotas da API

### Autenticação & Usuários (`/auth`)
| Método | Endpoint | Proteção | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Pública | Cadastra novo usuário e retorna tokens |
| `POST` | `/auth/login` | Pública | Autentica com email/senha e retorna tokens |
| `POST` | `/auth/refresh` | Pública | Rotação atômica de refresh token via Redis |
| `GET` | `/auth/me` | `requireAuth` | Retorna perfil completo, XP, nível, ranking e conquistas |
| `POST` | `/auth/logout` | `requireAuth` | Adiciona JTI na blacklist do Redis e revoga sessão |
| `PATCH` | `/auth/password` | `requireAuth` | Altera senha com verificação da senha atual |
| `DELETE` | `/auth/account` | `requireAuth` | Exclusão definitiva da conta do usuário |

### Produtos (`/products`)
| Método | Endpoint | Proteção | Descrição |
|---|---|---|---|
| `GET` | `/products` | Pública | Lista produtos com paginação, busca e filtros |
| `GET` | `/products/categories` | Pública | Lista todas as categorias distintas |
| `GET` | `/products/barcode/:ean` | Pública | Busca por EAN (Local DB → OpenFoodFacts com auto-cache) |
| `GET` | `/products/:id` | Pública | Detalhes do produto com estatísticas (mín/méd/máx) |
| `GET` | `/products/:id/history` | Pública | Histórico de preços para gráfico temporal |
| `POST` | `/products/custom` | Pública | Cadastro manual de produto (+25 XP) |
| `PUT` / `PATCH`| `/products/:id` | `requireAdmin` | Edição de produto (Exclusivo administradores) |
| `DELETE` | `/products/:id` | `requireAdmin` | Remoção de produto do catálogo (Exclusivo administradores) |

### Ocorrências de Preço (`/ocurrency`)
| Método | Endpoint | Proteção | Descrição |
|---|---|---|---|
| `POST` | `/ocurrency` | `requireAuth` | Reporta preço de um produto em um mercado (+15 XP) |
| `GET` | `/ocurrency/product/:productId` | Pública | Lista relatórios de preço do produto por mercado |
| `POST` | `/ocurrency/:id/vote` | `requireAuth` | Audita e vota na confiabilidade de um preço (+5 XP) |
| `PUT` | `/ocurrency/:id` | `requireAuth` | Atualiza ocorrência de preço (Autor ou Admin) |
| `DELETE` | `/ocurrency/:id` | `requireAuth` | Remove ocorrência de preço (Autor ou Admin) |

### Mercados (`/markets`)
| Método | Endpoint | Proteção | Descrição |
|---|---|---|---|
| `GET` | `/markets` | Pública | Lista todos os mercados cadastrados |
| `GET` | `/markets/:id` | Pública | Retorna detalhes de um mercado específico |
| `POST` | `/markets` | `requireAuth` | Cadastra novo mercado com coordenadas |

---

## 📱 Catálogo de Telas do Aplicativo Mobile

O aplicativo possui 18 telas organizadas no padrão **Expo Router**:

1. `app/index.tsx` — **Dashboard Inicial:** Resumo, produtos recentes, atalhos rápidos e acesso ao scanner.
2. `app/login.tsx` — **Autenticação:** Login seguro com detecção de ambiente Expo Go / Dev e botões de **1-Tap Login** de teste.
3. `app/registerUser.tsx` — **Cadastro:** Registro de novo membro.
4. `app/scannerProduct.tsx` — **Scanner de Câmera:** Leitor de código de barras em tempo real com mira animada.
5. `app/scannerConfirmation.tsx` — **Confirmação:** Validação das informações antes do envio de preço.
6. `app/customRegisterProduct.tsx` — **Cadastro Manual:** Inserção de produtos sem código de barras.
7. `app/registerProduct.tsx` — **Registro de Preço:** Seleção de mercado e valor do produto.
8. `app/search.tsx` — **Busca Inteligente:** Pesquisa em tempo real com debounce, categorias e pull-to-refresh.
9. `app/productDetails.tsx` — **Ficha do Produto:** Estatísticas, gráfico histórico, lista de preços e votação comunitária.
10. `app/profile.tsx` — **Perfil Gamificado:** Barra de XP, nível atual, conquistas e mapa de calor de contribuições.
11. `app/settings.tsx` — **Configurações:** Temas (Light/Dark/AMOLED), Monet, seleção de 7 idiomas, backup e segurança.
12. `app/map.native.tsx` — **Mapa de Proximidade:** Localização de mercados próximos com suporte nativo.
13. `app/map.tsx` / `app/map.web.tsx` — **Mapa Web Fallback:** Suporte responsivo para navegador.
14. `app/manualEanSearch.tsx` — **Busca por Código:** Digitação manual de código de barras.
15. `app/aboutUs.tsx` — **Sobre Nós:** Informações institucionais do grupo de TCC.
16. `app/helpUser.tsx` — **Ajuda & FAQ:** Perguntas frequentes e suporte.

---

## 🔑 Credenciais de Teste (Seed Automático)

Ao iniciar o backend pela primeira vez, o script de `seed` popula automaticamente o banco com:

- **👑 Conta Administrador:**
  - **Email:** `admin@admin.org`
  - **Senha:** `admin`
  - **Permissão:** Role 5 (Acesso irrestrito a edição/exclusão de produtos e preços)
- **👤 Conta Usuário Comum:**
  - **Email:** `usuario@presco.com`
  - **Senha:** `user123`
  - **Permissão:** Role 1 (Envio de preços, cadastro de produtos e votação)

> No aplicativo mobile, a tela de login exibe botões de **1-toque** para preenchimento instantâneo dessas contas quando executado em modo de desenvolvimento / Expo Go.

---

## 👥 Equipe de Desenvolvimento (Grupo 3 - 3A 2026)

- **Colégio Técnico Industrial "Prof. Isaac Portal Roldán" — CTI Bauru (UNESP)**
- **Orientação de TCC — Informática / Desenvolvimento de Sistemas**