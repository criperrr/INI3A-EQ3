---
name: Presco Design System Tokens
description: System design tokens for the Presco mobile application
---

# DESIGN.md - Presco Design System

This document defines the single source of truth for UI elements in the Presco mobile application (`INI3A-EQ3`). All screens and components strictly consume the semantic design tokens via `useTheme()` from `src/frontend/theme`.

---

## 1. Design System Architecture (3-Tier Token Model)

```
Tokens Primitivos (Escalas absolutas)
        │
        ▼
Tokens Semânticos (Função & Contexto: Superfícies, Textos, Bordas, Feedback)
        │
        ▼
Componentes & Telas (Consumo exclusivo de tokens semânticos via useTheme())
```

- **Módulo do Sistema:** `src/frontend/theme/`
  - `tokens/primitives/` — Paleta base, escalas de espaçamento (4pt/8pt grid), tipografia pura, raios de borda, sombras e elevações.
  - `tokens/semantics/` — Mapeamento contextual para Light, Dark e AMOLED + personalização dinâmica Material You / Monet.
  - `themeContext.tsx` — Provedor de contexto e hooks `useTheme()` / `useThemeTokens()`.

---

## 2. Tokens Primitivos (`tokens.primitives`)

### 2.1. Cores Base (`colors`)
- **Neutros:** `gray50` (#F9FAFB) a `gray950` (#030712), `white` (#FFFFFF), `black` (#000000), `transparent`.
- **Brand Presco:** `emerald50` a `emerald900`, `forestGreen` (#1A2E1A), `darkForest` (#2E7D32).
- **Temas Puros:**
  - Light: `bg` (#F5F7F2), `headerBg` (#EEF2E8), `card` (#F0F4EC), `border` (#D4DCC8), `inputBg` (#E8EDE2).
  - Dark: `bg` (#0D1117), `headerBg` (#161B22), `card` (#1C2333), `border` (#30363D).
  - AMOLED: `bg` (#000000), `headerBg` (#000000), `card` (#0F0F0F), `border` (#1F1F1F), `inputBg` (#080808).
- **Feedback & Sistema:** `red500` (#EF4444), `green500` (#10B981), `amber500` (#F59E0B), `blue500` (#3B82F6).
- **Overlays:** `black45` (rgba(0,0,0,0.45)), `black60` (rgba(0,0,0,0.60)).

### 2.2. Espaçamento (`spacing`)
- Grid de 4pt / 8pt: `0: 0`, `0.5: 2`, `1: 4`, `1.5: 6`, `2: 8`, `2.5: 10`, `3: 12`, `3.5: 14`, `4: 16`, `4.5: 18`, `5: 20`, `6: 24`, `7: 28`, `8: 32`, `10: 40`, `12: 48`, `16: 64`.

### 2.3. Tipografia (`typography`)
- **Sizes:** `xs: 10`, `sm: 11`, `sub: 12`, `label: 13`, `body: 14`, `callout: 15`, `base: 16`, `title3: 18`, `title2: 20`, `title1: 22`, `hero: 28`, `display: 32`.
- **Weights:** `regular: "400"`, `medium: "500"`, `semibold: "600"`, `bold: "700"`, `heavy: "800"`.
- **Line Heights:** `tight: 14`, `snug: 16`, `normal: 20`, `body: 22`, `relaxed: 24`, `title: 26`, `hero: 28`, `display: 36`.
- **Letter Spacing:** `tight: -0.5`, `normal: 0`, `wide: 0.5`, `wider: 1.0`, `widest: 1.5`.

### 2.4. Raios de Borda (`radii`)
- `none: 0`, `xs: 4`, `sm: 8`, `md: 10`, `base: 12`, `lg: 14`, `xl: 16`, `2xl: 20`, `3xl: 24`, `full: 9999`.

---

## 3. Tokens Semânticos (`tokens.semantic`)

### 3.1. Superfícies (`surface`)
- `surface.background`: Fundo principal da tela.
- `surface.card`: Fundo de cartões, listas e seções.
- `surface.header`: Fundo de cabeçalhos de navegação.
- `surface.input`: Fundo de inputs, barras de busca e chips neutros.
- `surface.overlay`: Camada escurecida para modais e drawer.
- `surface.highlight`: Fundo sutil com destaque da marca (`accent + '18'`).
- `surface.disabled`: Fundo de controles desabilitados.
- `surface.footer`: Fundo da barra inferior de navegação.
- `surface.centerCircle`: Fundo do botão central flutuante.

### 3.2. Textos (`text`)
- `text.primary`: Texto principal de alto contraste.
- `text.secondary`: Texto secundário, legendas e rótulos auxiliares.
- `text.tertiary`: Placeholders e microtextos desfatizados.
- `text.inverse`: Texto de alto contraste sobre fundos de destaque / botões.
- `text.accent`: Texto na cor de destaque da marca.
- `text.error`, `text.success`, `text.warning`, `text.info`: Textos contextuais de validação e feedback.

### 3.3. Bordas (`border`)
- `border.default`: Borda padrão de cards, containers e divisores.
- `border.header`: Borda divisória do cabeçalho e rodapé.
- `border.subtle`: Divisores finos e separadores internos.
- `border.focus`: Borda ativa/foco em inputs e chips selecionados (`accent`).
- `border.divider`: Linhas horizontais de separação.
- `border.input`: Borda de campos de formulário.

### 3.4. Ícones (`icon`)
- `icon.primary`: Ícones principais do cabeçalho e títulos.
- `icon.secondary`: Ícones inativos e secundários.
- `icon.interactive`: Ícones de itens de menu e atalhos.
- `icon.inverse`: Ícones brancos sobre botões de destaque.
- `icon.accent`: Ícones na cor da paleta ativa.

### 3.5. Feedback (`feedback`)
- `feedback.success`: Verde para ações bem-sucedidas e votos positivos.
- `feedback.warning`: Âmbar para alertas e avisos.
- `feedback.error`: Vermelho para erros, exclusões e votos negativos.
- `feedback.info`: Azul para dicas e informações contextuais.

### 3.6. Espaçamento Semântico (`spacing`)
- `spacing.screenPaddingHorizontal`: 20px
- `spacing.screenPaddingVertical`: 16px
- `spacing.cardPadding`: 20px
- `spacing.cardPaddingSm`: 12px
- `spacing.sectionGap`: 24px
- `spacing.itemGap`: 16px
- `spacing.elementGap`: 12px
- `spacing.microGap`: 8px
- `spacing.inputHeight`: 52px
- `spacing.buttonHeight`: 54px
- `spacing.tabBarHeight`: 60px

### 3.7. Raios Semânticos (`radius`)
- `radius.card`: 20px
- `radius.button`: 16px
- `radius.input`: 16px
- `radius.image`: 14px
- `radius.chip`: 14px
- `radius.badge`: 10px
- `radius.modal`: 24px
- `radius.pill` / `radius.avatar`: 9999px

---

## 4. Guia de Consumo em Componentes

Sempre consuma através do hook `useTheme()` ou `useThemeTokens()`:

```tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";

export function CustomComponent() {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;

  return (
    <View
      style={{
        backgroundColor: semantic.colors.surface.card,
        borderColor: semantic.colors.border.default,
        borderRadius: semantic.radius.card,
        padding: semantic.spacing.cardPadding,
        ...semantic.elevation.card,
      }}
    >
      <Text
        style={{
          color: semantic.colors.text.primary,
          ...semantic.typography.sectionTitle,
        }}
      >
        Título Semântico
      </Text>
    </View>
  );
}
```

---

## 5. Política do Design System & Governança de Tokens

### 5.1. Regra de Ouro (Single Source of Truth)
Toda e qualquer definição de cor, escala tipográfica, espaçamento, raio de borda, elevação ou sombra **DEVE** residir exclusivamente no módulo `src/frontend/theme/`. É proibido criar pastas alternativas de estilos ou espalhar arquivos `.css` / `.style.ts` fora da arquitetura canônica de temas.

### 5.2. Proibição de Estilos e Cores Hardcoded
1. **Zero Cores Literais:** É expressamente proibido declarar mapas de cores locais (ex: `const COLORS = { ... }` ou `const THEME_COLORS = { ... }`) ou valores hexadecimais literais inline (`#2E7D32`, `#FFFFFF`, etc.) dentro de componentes e telas.
2. **Consumo Semântico Mandatório:** Toda cor de superfície, texto, borda, ícone ou feedback deve ser consumida a partir de `tokens.semantic.colors.*`, `tokens.semantic.feedback.*` ou `accent` providos pelo hook `useTheme()`.
3. **Suporte Nativo a Temas e Monet:** Ao evitar cores hardcoded, telas e componentes adaptam-se automaticamente e de forma reativa aos modos **Light**, **Dark**, **AMOLED** e às extrações dinâmicas de cores de papel de parede **Material You / Monet**.

### 5.3. Padrão de Coexistência (StyleSheet Nativo vs. Tokens Dinâmicos)
Para conciliar a máxima performance do motor React Native com a flexibilidade da troca dinâmica de temas:
- **`StyleSheet.create` local:** Define estritamente a geometria estática, alinhamentos, estrutura flex e dimensões fixas invariantes ao tema (ex: `flexDirection`, `alignItems`, `justifyContent`, `zIndex`, `position`, `height` de ícones).
- **Estilos Dinâmicos (Array de Estilos):** Cores, fundos, bordas ativas, elevações e raios parametrizados devem ser mesclados no JSX usando a sintaxe de array:
  ```tsx
  <View style={[styles.container, { backgroundColor: semantic.colors.surface.background }]} />
  ```

### 5.4. Diretriz de Importação
Todos os componentes e telas devem importar hooks e utilitários diretamente de `src/frontend/theme` (ex: `import { useTheme } from "../theme"` ou `import { useTheme } from "@/theme"`). O arquivo `src/frontend/content/themeContent.tsx` é mantido apenas como ponte de compatibilidade retroativa para código legado.

### 5.5. Ciclo de Vida e Expansão de Novos Tokens
Ao introduzir um novo padrão visual no aplicativo:
1. **Primitivo:** Declarar a escala base em `src/frontend/theme/tokens/primitives/`.
2. **Tipagem:** Atualizar as interfaces correspondentes em `src/frontend/theme/types.ts`.
3. **Semântica:** Mapear o significado contextual em `src/frontend/theme/tokens/semantics/` para todos os modos suportados (Light, Dark, AMOLED e Monet).
4. **Documentação:** Atualizar o catálogo de tokens no [`DESIGN.md`](./DESIGN.md) para manter a paridade com o código.

### 5.6. Acessibilidade e Contraste
Todas as combinações de `surface` e `text` geradas pelos tokens semânticos devem respeitar a taxa de contraste mínima recomendada pelas diretrizes **WCAG AA** (4.5:1 para textos regulares e 3.0:1 para elementos de destaque e ícones interativos).

