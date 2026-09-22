# Presco Backend - Suíte de Testes de Carga, Performance & Comportamento com Grafana k6

Esta suíte de testes de alta fidelidade utiliza o **Grafana k6** (`k6.io`) para simular cenários realistas de comportamento do usuário, validar SLAs de latência, tolerância a falhas, concorrência extrema e cobrir **100% dos módulos da API do Presco**.

---

## 🏗️ Arquitetura da Suíte k6

```
tests/k6/
├── config/
│   ├── environments.js             # Mapeamento dinâmico (Localhost 3333, CTI Remoto, Túneis)
│   └── thresholds.js               # SLAs de performance (p95 < 400ms, erro < 1%)
├── helpers/
│   ├── auth.js                     # Gestão de tokens JWT, login de admin, usuário comum e dinâmicos
│   ├── http.js                     # Wrappers HTTP com marcação de métricas e tratamento seguro de JSON
│   └── generator.js                # Geradores de código EAN-13, coordenadas de Bauru/SP, produtos e preços
├── scenarios/                      # Testes modulares cirúrgicos
│   ├── 01_health_and_system.js     # Health check, PostGIS, Redis e headers de segurança HTTP
│   ├── 02_auth_lifecycle.js        # Cadastro, conflito 409, login, refresh, perfil, senha, 2FA, logout e exclusão
│   ├── 03_catalog_and_search.js    # Busca trigram, filtros de categoria, código de barras e cache Redis
│   ├── 04_contributions_and_prices.js # Registro de preço (+15 XP), cooldown 5 min, votos comunitários e denúncias
│   ├── 05_custom_products.js       # Cadastro de produto customizado (+25 XP), indexação imediata e update
│   ├── 06_markets_and_geospatial.js # Consultas espaciais PostGIS (ST_DWithin), raio e CRUD de mercados
│   ├── 07_gamification_and_shop.js # Loja de personalização, compra com XP, equipar/desequipar banners e molduras
│   ├── 08_admin_moderation.js      # Fila de moderação pendente, aprovação/rejeição e bloqueio RBAC 403
│   └── 09_image_optimization.js    # Pipeline Sharp de transcodificação (WebP/AVIF) e cache binário Redis
├── user_journeys/                  # Simulação realista de comportamento do usuário
│   ├── anonymous_browser.js        # Consumidor anônimo comparando preços e navegando no catálogo
│   ├── active_collaborator.js      # Colaborador logado enviando preços, auditando ofertas e evoluindo de nível
│   └── power_shopper.js            # Ciclo completo de criação de conta, personalização de perfil e contribuição
├── stress_and_soak/                # Testes de stress e pico
│   ├── stress_test.js              # Carga progressiva até 100+ VUs concorrentes
│   └── spike_test.js               # Disparo repentino de tráfego para teste de recuperação do servidor
├── main.js                         # Orquestrador mestre com geração de relatório HTML
├── report.html                     # Relatório visual gerado dinamicamente
├── summary.json                    # Métricas brutas exportadas em JSON
└── README.md                       # Documentação e guia de comandos
```

---

## 🚀 Como Executar os Testes k6

### Pré-requisitos
- k6 instalado (`k6 version`).
- Servidor Presco ativo (localmente na porta 3333 ou apontando para o servidor remoto oficial).

### 1. Executar a Suíte Completa (Smoke & Funcional)
```bash
# Executa todos os 9 cenários e gera o relatório HTML
npm run test:k6

# Ou diretamente via k6
k6 run tests/k6/main.js
```

### 2. Executar Contra o Servidor Local (ou Remoto)
```bash
# Executar contra o backend local (http://localhost:3333)
TARGET_ENV=local k6 run tests/k6/main.js

# Executar contra a URL remota de produção/staging
TARGET_ENV=remote k6 run tests/k6/main.js

# Ou passando uma URL personalizada via variável de ambiente
k6 run --env BASE_URL=http://192.168.1.50:3333 tests/k6/main.js
```

### 3. Simulações de Comportamento do Usuário (User Journeys)
```bash
# Consumidor Anônimo navegando e comparando preços
npm run test:k6:journeys:anonymous
# ou
k6 run tests/k6/user_journeys/anonymous_browser.js

# Colaborador Ativo enviando preços e votando
npm run test:k6:journeys:collaborator
# ou
k6 run tests/k6/user_journeys/active_collaborator.js

# Power Shopper cadastrando produtos e personalizando perfil
npm run test:k6:journeys:shopper
# ou
k6 run tests/k6/user_journeys/power_shopper.js
```

### 4. Testes de Stress e Pico (Performance Máxima)
```bash
# Teste de stress progressivo (até 100 VUs)
npm run test:k6:stress
# ou
k6 run tests/k6/stress_and_soak/stress_test.js

# Teste de pico repentino (0 -> 80 VUs em 5s)
npm run test:k6:spike
# ou
k6 run tests/k6/stress_and_soak/spike_test.js
```

### 5. Visualizar Relatório HTML
Após a execução do script `main.js`, o arquivo `tests/k6/report.html` é gerado automaticamente contendo:
- Total de requisições executadas
- Taxa de falha (SLA < 1%)
- Latência média e percentil 95 (p95)
- Estatísticas detalhadas de cada endpoint
Abra o relatório em qualquer navegador:
```bash
xdg-open tests/k6/report.html # Linux
open tests/k6/report.html     # macOS
```
