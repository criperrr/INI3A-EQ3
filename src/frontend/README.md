# 📱 Presco Frontend - Aplicativo Mobile

Documentação técnica do aplicativo mobile do projeto **Presco** (`INI3A-EQ3`).

---

## 🛠️ Tecnologias Principais

- **Framework:** React Native 0.81.5 com Expo SDK 54
- **Navegação & Roteamento:** Expo Router (roteamento baseado em arquivos em `src/frontend/app/`)
- **Animações e Física de Gestos:** React Native Reanimated 4 & React Native Gesture Handler 2
- **Listas de Alto Desempenho:** `@shopify/flash-list`
- **Renderização e Cache de Imagens:** `expo-image` (política `memory-disk`)
- **Feedback Tátil:** `expo-haptics`
- **Ícones:** `@expo/vector-icons` (Ionicons, MaterialIcons, Feather)

---

## 📂 Estrutura de Diretórios do Frontend

```
src/frontend/
├── app/                                    # 18 Telas do aplicativo (Expo Router)
│   ├── _layout.tsx                         # Stack raiz, wrapper de gestos, temas, auth e i18n
│   ├── index.tsx                           # Home / Dashboard
│   ├── login.tsx                           # Login com detecção Dev / Expo Go e 1-Tap Quick Login
│   ├── registerUser.tsx                    # Cadastro de usuário
│   ├── scannerProduct.tsx                  # Leitura de código EAN pela câmera (expo-camera)
│   ├── scannerConfirmation.tsx             # Confirmação de item lido
│   ├── customRegisterProduct.tsx           # Cadastro manual de produto (+25 XP)
│   ├── registerProduct.tsx                 # Envio de preço por mercado (+15 XP)
│   ├── search.tsx                          # Busca dinâmica com debounce, categorias e pull-to-refresh
│   ├── productDetails.tsx                  # Detalhes, gráfico de preços, ocorrências e auditoria
│   ├── profile.tsx                         # Perfil 100% dinâmico com XP, nível, badges e heatmap
│   ├── settings.tsx                        # Configurações: temas, Monet, backup codificado e segurança
│   ├── map.native.tsx                      # Mapa nativo de mercados próximos (react-native-maps)
│   ├── map.tsx / map.web.tsx               # Stubs web do mapa
│   ├── manualEanSearch.tsx                 # Busca manual digitando código EAN
│   ├── aboutUs.tsx                         # Informações do grupo de TCC
│   └── helpUser.tsx                        # FAQ e central de suporte
├── components/                             # Componentes de interface reutilizáveis
│   ├── Header.tsx                          # Cabeçalho com logo, avatar e ações contextuais
│   ├── Footer.tsx                          # Barra de navegação inferior sincronizada com gestos
│   ├── Sidebar.tsx                         # Drawer lateral com navegação rápida
│   ├── SwipeTabNavigator.tsx               # Navegador interativo por gestos 1:1 (Reanimated)
│   └── productCard.tsx                     # Card de produto otimizado com FlashList e memoização
├── content/                                # Provedores de estado e contexto React
│   ├── authContext.tsx                     # Gerenciamento de sessão de usuário e perfil /me
│   ├── themeContent.tsx                    # Provedor de temas (Light/Dark/AMOLED) e cores Monet
│   ├── i18nContext.tsx                     # Provedor de internacionalização com hook useI18n()
│   └── tabNavigationContext.tsx            # Contexto de transições direcionais de telas
├── i18n/                                   # Módulo de internacionalização
│   ├── types.ts                            # Tipagem estrita de chaves de tradução
│   ├── index.ts                            # Exportador principal de locales
│   └── locales/                            # Dicionários de tradução (pt, en, es, de, ru, zh, ja)
├── services/                               # Camada de comunicação com a API
│   ├── api.ts                              # apiRequest<T> com retry automático de refresh token
│   ├── auth.ts                             # Serviços de autenticação e conta
│   ├── productService.ts                   # Serviços de busca e manipulação de produtos
│   ├── ocurrencyService.ts                 # Serviços de relatório de preços e votação
│   └── marketService.ts                    # Serviços de listagem e criação de mercados
├── app.json                                # Configuração Expo, permissões de câmera e predictive back
├── metro.config.js                         # Configuração Metro com inlineRequires para cold-start rápido
├── package.json                            # Dependências do frontend
└── tsconfig.json                           # Configuração TypeScript
```

---

## 👆 Navegação por Gestos Interativos 1:1 (`SwipeTabNavigator.tsx`)

O aplicativo possui navegação por gestos de arrasto horizontal (*swipe*) entre as abas principais (`/`, `/search`, `/scannerProduct`, `/map`, `/profile`):

- **Acompanhamento 1:1 do dedo:** Processado diretamente na UI thread via worklets do Reanimated (60/120 FPS).
- **Física de Mola:** Efeito elástico nas extremidades e encaixe suave via `withSpring` ao soltar a tela.
- **Transições Direcionais Inteligentes:** O `TabNavigationContext` computa a direção do movimento (esquerda/direita) para que animações manuais e cliques no Footer tenham sempre a direção física correta.
- **Feedback Tátil:** Vibração leve (`expo-haptics`) ao cruzar o limiar de mudança de tela.

---

## 🎨 Sistema de Design e Temas Dinâmicos (`useTheme()`)

Toda a estilização consome o hook `useTheme()` de `src/frontend/content/themeContent.tsx`:

- **Modos Suportados:** `light`, `dark` e `amoled` (fundo `#000000` estrito para economia de bateria).
- **Extração Material You (Monet):** No Android, extrai a paleta de cores primária do sistema operacional. Em outros sistemas, permite selecionar presets (Emerald, Indigo, Violet, Amber, Rose).
- **Consistência:** `themeStyles.bg`, `themeStyles.card`, `themeStyles.text`, `themeStyles.border`, `themeStyles.inputBg`, `accent`.

---

## 🌐 Internacionalização (i18n)

Suporte completo a 7 idiomas com dicionários tipados e interpolação de variáveis (`{param}`):
- `pt` — Português (Brasil)
- `en` — English (US)
- `es` — Español
- `de` — Deutsch
- `ru` — Русский
- `zh` — 简体中文
- `ja` — 日本語

---

## 🚀 Suite de Performance Mobile

1. **Memoização Rigorosa:** Todos os itens de lista e componentes atômicos utilizam `React.memo` e `useCallback` para evitar re-renderizações desnecessárias durante o scroll.
2. **FlashList:** Substituição do `FlatList` tradicional pelo `@shopify/flash-list` para reciclagem eficiente de views.
3. **Expo Image:** Carregamento assíncrono de imagens com transições suaves e cache híbrido `memory-disk`.
4. **Metro Inline Requires:** Configurado em `metro.config.js` para carregamento sob demanda de módulos e redução do tempo de cold-start.
5. **Android 13–16 Predictive Back & Edge-to-Edge:** Habilitado em `app.json` e `_layout.tsx` para suporte nativo aos novos gestos do Android.
