---
type: project
created: 2026-08-01
updated: 2026-09-04
---

# Technical Decisions - Presco (INI3A-EQ3)

Registro das decisões técnicas fundamentais tomadas na arquitetura do Presco.

---

## 1. Banco de Dados & Camada Geográfica
- **PostGIS sobre PostgreSQl**: Escolhido para viabilizar cálculos espaciais precisos (`ST_DWithin` com raio de 15km e ordenação `ST_Distance`) entre a localização do usuário e supermercados cadastrados.
- **Drizzle ORM**: Escolhido por ser leve, tipado e com overhead mínimo comparado ao Prisma. Colunas `geography` são custom types e devem ser convertidas com `sql`ST_AsGeoJson()``.
- **Encapsulamento Estrito**: Drizzle só pode ser importado dentro de `shared/database/repositories/`. Services e Controllers não conhecem a implementação do banco.

## 2. Autenticação & Sessões
- **JWT + Redis (Sem colunas de token no banco relacional)**: Access tokens duram 15 minutos e contêm o JTI. Refresh tokens criptográficos vivem exclusivamente no Redis com TTL de 7 dias. Logout invalida o JTI no Redis (`blacklist:<jti>`).
- **Dev Mode Quick Login**: Para agilizar o desenvolvimento acadêmico, o backend e o frontend expõem atalho rápido para `admin@admin.org` (senha `admin`) e usuário padrão de teste.

## 3. Frontend Mobile & Design System
- **Expo SDK 57 & Expo Router**: Arquitetura moderna de rotas baseadas em arquivos em `src/frontend/app/`.
- **Reanimated 4 Gesture Navigation**: Swipe horizontal fluido estilo TikTok entre as principais telas (`SwipeTabNavigator.tsx`) com física de mola suave e haptics.
- **Design Tokens & Monet**: Consumo unificado via `useTheme()` em `themeContext`. Suporte total a AMOLED com `#000000` puro para economia de bateria e extração dinâmica de cores do papel de parede Android (Material You / Monet).
- **Sem Frameworks CSS Web**: Proibido Tailwind CSS ou CSS web. Usar exclusivamente `StyleSheet.create` do React Native com os tokens de `DESIGN.md`.

## 4. Internacionalização (i18n)
- Suporte a 7 idiomas: `pt-BR`, `en-US`, `es-ES`, `de-DE`, `ru-RU`, `zh-CN`, `ja-JP`.
- Todas as chaves devem ser registradas em `src/frontend/constants/locales/` e consumidas via `useI18n()`.

## 5. Algoritmo de Compatibilidade de Código de Barras (≥ 65%)
- **Similaridade Ponderada:** Implementada em `calculateBarcodeSimilarity()` no `product.repository.ts` usando distância de edição Levenshtein com normalização de zeros à esquerda e bônus de subsequência comum.
- **Fallback Automático:** Quando um EAN não tem correspondência exata, o backend busca itens no banco local com score $\ge 0.65$, priorizando produtos com imagem (`icon`).
- **Verificação Lado a Lado na UI:** `scannerConfirmation.tsx` exibe badge de compatibilidade e card comparativo entre os dígitos escaneados e os impressos na embalagem antes de salvar ocorrências de preço.

## 6. Build & Deploy iOS (GitHub Actions + Sideloadly)
- **Workflow Manual (`build-ios.yml`):** Executa no runner `macos-15` via gatilho manual (`workflow_dispatch`) ou tag manual (`ios-v*`).
- **Compatibilidade Xcode:** Utiliza Xcode 16.0/15.4 para evitar bug de runtime de simuladores ausentes no `expo-dev-menu` do Xcode 16.2.
- **Sem Assinatura (Sideload):** Compilado com `CODE_SIGNING_ALLOWED=NO`, empacotado em `Payload/` e zipado como `Presco.ipa`, pronto para ser assinado e instalado via Sideloadly no Windows sem Mac físico.

## 7. Anti-Spam de Preços & Sistema de Denúncias (Report)
- **Cooldown de Ocorrências (5 minutos):** Prevenção de spam validada no `OcurrencyService` consultando `OcurrencyRepository.findRecentByUserAndProduct` num intervalo de 300 segundos. Dispara `429 TooManyRequestsError` com cálculo de tempo restante amigável.
- **Denúncia Comunitária de Produtos (`product_report`):** Tabela relacional com chave estrangeira em cascata para `user` e `product`, motivos padronizados (`reason`), descrição opcional e endpoint autenticado `POST /products/:id/report`.

## 8. Onboarding Didático & Gestos Hápticos
- **Tutorial em 6 Etapas:** Apresentado no primeiro acesso com persistência via AsyncStorage (`@presco:hasSeenTutorial`).
- **Navegação & Estética:** 6 passos com transições via Reanimated 4, física de mola suave e feedback háptico (`expo-haptics`). Ferramenta de reset e teste disponível para administradores em `settings.tsx`.

## 9. Descoberta e Proximidade de Mercados (Raio de 15km)
- **Cálculo Espacial PostGIS & Fallback:** Mercados físicos ordenados por proximidade via `ST_Distance` dentro de um raio de 15km. Se o GPS estiver desativado ou sem estabelecimentos próximos, o sistema aplica fallback gracioso carregando a lista completa com ordenação alfabética e destaque para Trigal (ID 1).

## 10. Navegação por Gestos Horizontais (Swipe TikTok-Style)
- **`SwipeTabNavigator` com Reanimated 4:** Alternância fluida entre as 5 telas principais via gestos horizontais de pan/swipe sem conflito com a rolagem vertical de `FlatList`/`ScrollView` nem com a manipulação de zoom do mapa (`react-native-maps`).

## 11. Distribuição Oficial do APK Android
- **Compilação Release Standalone:** Gerada via Gradle com New Architecture, engine Hermes e compatibilidade com processadores 64-bit (`arm64-v8a`) e 32-bit (`armeabi-v7a`).
- **Publicação:** Distribuído no GitHub Releases com automação via GitHub Actions (`release.yml`), script `scripts/bump_version.ts` e binários oficiais `Presco-vX.X.X.apk` / `Presco.apk`.

