# Presco Mobile - Suíte de Testes Automatizados com Maestro

Esta suíte de testes E2E (End-to-End) utiliza o **Maestro** (`maestro.mobile.dev`) para simular comportamentos reais do usuário na aplicação mobile **Presco** (`com.presco.app`).

---

## 📱 Estrutura da Suíte

```
tests/maestro/
├── config.yaml                     # Configuração global (appId, timeouts, tags)
├── run_maestro.sh                  # Script executor automatizado
├── subflows/                       # Subfluxos reutilizáveis
│   ├── quick_login_admin.yaml      # Login de 1-toque como Administrador
│   ├── quick_login_user.yaml       # Login de 1-toque como Usuário Comum
│   ├── logout.yaml                 # Fluxo de encerramento de sessão seguro
│   └── dismiss_tutorial.yaml       # Tratamento automático de onboarding/tutorial
└── flows/                          # Fluxos de teste de ponta a ponta
    ├── 01_auth_flow.yaml           # Login, erro de credenciais, cadastro e logout
    ├── 02_catalog_and_search_flow.yaml  # Feed de produtos, busca com debounce, filtros de categoria
    ├── 03_product_details_and_voting_flow.yaml # Detalhes, estatísticas de preço, histórico e auditoria
    ├── 04_register_price_occurrence_flow.yaml # Submissão de preço em mercado próximo (+15 XP)
    ├── 05_custom_product_creation_flow.yaml   # Cadastro manual de produto (+25 XP)
    ├── 06_profile_and_gamification_flow.yaml  # Perfil, níveis, emblemas e Loja de Personalização
    ├── 07_settings_and_preferences_flow.yaml  # Temas Claro/Escuro/AMOLED, limpeza de cache, Sobre
    ├── 08_map_and_market_discovery_flow.yaml  # Mapa de proximidade PostGIS e filtros de mercados
    ├── 09_admin_moderation_flow.yaml          # Painel de moderação de preços e status OpenFoodFacts
    └── 10_full_e2e_user_journey.yaml          # Simulação completa da jornada do usuário do início ao fim
```

---

## 🚀 Como Executar os Testes

### Pré-requisitos
1. Maestro CLI instalado (`maestro --version`).
2. Emulador Android rodando (`adb devices`) ou dispositivo físico conectado via USB / Wi-Fi com depuração USB ativa.
3. APK do Presco instalado no dispositivo (`npm run android` ou compilação standalone).

### Executar Todos os Fluxos
```bash
# Executa toda a suíte sequencialmente
./tests/maestro/run_maestro.sh

# Ou via npm
npm run test:maestro
```

### Executar um Fluxo Específico
```bash
# Executar apenas o fluxo de autenticação
./tests/maestro/run_maestro.sh 01

# Executar apenas a busca de produtos
./tests/maestro/run_maestro.sh 02

# Executar a jornada completa do usuário
./tests/maestro/run_maestro.sh 10
```

### Usando o Maestro Studio / Viewer (Visualização Interativa)
Você pode abrir o Maestro Studio localmente em tempo real no navegador:
```bash
maestro studio
```
Acesse: `http://127.0.0.1:9999/`

### Executar no Maestro Cloud
```bash
./tests/maestro/run_maestro.sh --cloud
```
