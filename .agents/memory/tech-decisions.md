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
