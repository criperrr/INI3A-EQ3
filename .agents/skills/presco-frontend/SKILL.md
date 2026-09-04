---
name: presco-frontend
description: Diretrizes de React Native, Expo Router, Reanimated 4, i18n, serviços de API e Design System Monet para o frontend do Presco (INI3A-EQ3).
when_to_use: "When working on frontend screens, components, gestures, theme tokens, navigation, apiRequest, or i18n."
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
---

# Presco Frontend Skill (`presco-frontend`)

Esta skill condensa as diretrizes arquiteturais e regras de desenvolvimento do frontend do Presco (`src/frontend`).

---

## 1. Camada de Comunicação HTTP (`services/api.ts`)

- **Função Principal**: `apiRequest<T>(endpoint, options, retry = true)`.
- **Regras Absolutas**:
  - **NUNCA** use `fetch` ou `axios` diretamente dentro de componentes ou telas. Sempre crie ou utilize métodos em `services/` (`auth.ts`, `productService.ts`, `marketService.ts`, `ocurrencyService.ts`, `customizationService.ts`).
  - `apiRequest` injeta automaticamente o token `Authorization: Bearer <token>` a partir do `@presco:accessToken` no AsyncStorage.
  - Em caso de 401 com token expirado, executa refresh transparente através de `tryRefreshToken()` e repete a chamada uma vez.
  - Envia o header `Bypass-Tunnel-Reminder: true` para compatibilidade com túneis de desenvolvimento.
  - Trata timeout de 15 segundos via `AbortController` com erro tipado `ApiError(408, "TIMEOUT")`.

---

## 2. Telas & Navegação (Expo Router)

As telas residem em `src/frontend/app/`:
- `_layout.tsx`: Configuração de root stack, provedores de tema (`themeContext`), internacionalização (`i18nContext`), autenticação (`authContext`) e gestos.
- `index.tsx`: Tela inicial (Home) com produtos dinâmicos, ranking de proximidade e promoções.
- `search.tsx`: Busca com debounce em tempo real por texto e código de barras, filtros por categoria, paginação infinita e grid responsivo de 2 colunas.
- `scannerProduct.tsx` & `scannerConfirmation.tsx`: Leitor de código de barras EAN-13 via câmera nativa com confirmação e alerta explicativo de produto não encontrado.
- `registerProduct.tsx`: Registro de ocorrência de preço (+15 XP) com detecção automática do supermercado mais próximo e máscara progressiva ATM de centavos.
- `productDetails.tsx`: Detalhes do produto, gráfico interativo de histórico, lista de preços por mercado, votação comunitária (+5 XP) e controles de admin.
- `profile.tsx`: Perfil 100% dinâmico com pontuação XP, níveis, conquistas/medalhas, banner personalizável, molduras de avatar, título e modal de loja de customização com preview ao vivo.
- `settings.tsx`: Controle de tema (Light, Dark, AMOLED), extração de cores Monet, exportação/importação de configurações, alteração de senha e limpeza de cache.
- `map.native.tsx`: Mapa nativo de proximidade de supermercados com cache OSRM, fallback OSM e marcadores dinâmicos vinculados à cor de destaque ativa.

---

## 3. Gestos e Movimento (`SwipeTabNavigator.tsx`)

- O aplicativo utiliza navegação horizontal por gestos estilo abas (TikTok-style) com rastreamento de dedo 1:1 via **React Native Reanimated 4** e **react-native-gesture-handler 2**.
- Respeita borda de ativação (`activeOffsetX: [-28, 28]`) e física de mola (`withSpring`) suave com haptics via `expo-haptics`.
- Em dispositivos iOS, o gesto de voltar interativo é restrito à borda esquerda (`fullScreenGestureEnabled: false`) para evitar conflito com abas horizontais.

---

## 4. Design System & Theming (`DESIGN.md` & `src/frontend/theme/`)

- Consumo estrito dos tokens de tema através do hook `useTheme()`:
  - `themeStyles.bg`: Fundo principal da tela.
  - `themeStyles.card`: Superfície de cartões e modais.
  - `themeStyles.text`: Texto principal de alto contraste.
  - `themeStyles.subText`: Texto secundário e legendas.
  - `themeStyles.border`: Bordas e divisores.
  - `accent`: Cor de destaque dinâmica (Material You Monet ou paletas pré-definidas: Emerald, Indigo, Violet, Amber, Rose).
- **Modo AMOLED**: Preto puro (`#000000`) em fundo e cabeçalhos para economia de energia em telas OLED.
- **Tipografia**: Hierarquia semântica com tamanhos e pesos padronizados (Hero 22px bold, Section Title 18px bold, Subtitle 16px semibold, Body 14px, Badge 10-11px).

---

## 5. Internacionalização (i18n)

- Suporte completo a 7 idiomas: `pt-BR`, `en-US`, `es-ES`, `de-DE`, `ru-RU`, `zh-CN`, `ja-JP`.
- Sempre utilizar `const { t } = useI18n();` ou `useTranslation()` para textos visíveis ao usuário.
- Nenhuma string voltada ao usuário deve ficar hardcoded no JSX. Adicionar novas chaves em todos os arquivos de locale em `src/frontend/constants/locales/`.
