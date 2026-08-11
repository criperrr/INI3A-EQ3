# Redesign da Tela de Registro de Produto (Register Product)

## Overview
O objetivo deste plano é refatorar a tela `registerProduct.tsx` para garantir consistência visual com o restante do aplicativo (como a `index.tsx`). O redesign deve torná-la mais criativa, bonita e alinhada com as diretrizes do tema (utilizando `themeStyles`, cards estilizados, bordas, e o esquema de cores dinâmico do app). A intenção é proporcionar uma experiência de usuário (UX) e interface (UI) "premium", incorporando melhor uso de espaço, tipografia legível e componentes visuais mais atrativos.

## Project Type
**MOBILE** (React Native / Expo)

## Success Criteria
- [x] A tela `registerProduct.tsx` apresenta o mesmo padrão de design (bordas arredondadas, sombras, cores de tema) encontrado na Home (`index.tsx`).
- [x] O componente de formulário (inputs e botões) é estilizado para parecer moderno e fluido, respeitando os modos Claro/Escuro (`isDark`).
- [x] Melhor aproveitamento do layout de cabeçalho do produto (imagem, título e "último preço").
- [x] Nenhuma quebra de funcionalidade: a navegação para `/productDetails` e a entrada de texto devem continuar funcionando perfeitamente.
- [x] Feedback visual aprimorado ao interagir com os inputs e botões (estados "activeOpacity" configurados adequadamente).

## Tech Stack
- **Framework:** React Native com Expo (Expo Router)
- **Estilização:** StyleSheet (`react-native`) + Theme Context (`useTheme` customizado)
- **Ícones:** `@expo/vector-icons` (Ionicons)

## File Structure
```
src/frontend/
├── app/
│   └── registerProduct.tsx     (A ser refatorado)
└── components/
    └── productCard.tsx         (Pode necessitar leves ajustes ou ser substituído por design interno na tela)
```

## Task Breakdown

### 1. Refatoração Visual do `RegisterProduct` (Main Screen)
- **Agent:** `mobile-developer`
- **Skill:** `mobile-design`
- **INPUT:** `/src/frontend/app/registerProduct.tsx` atual.
- **OUTPUT:** Novo layout utilizando `themeStyles.card`, `themeStyles.border`, estruturando a tela para se parecer com a Home.
- **VERIFY:** A tela renderiza sem erros de estilo e o background/tema se ajusta ao modo Dark/Light.

### 2. Estilização Criativa do Formulário (Inputs & Botões)
- **Agent:** `mobile-developer`
- **Skill:** `mobile-design`
- **INPUT:** `RegisterForm` em `registerProduct.tsx`.
- **OUTPUT:** Inputs com altura adequada (ex: 50px), bordas arredondadas (radius 16/20), padding aprimorado e botão "Cadastrar" utilizando a cor de destaque (accent) da paleta de temas do app. Incorporar ícones nos inputs se possível.
- **VERIFY:** O usuário consegue focar no input de preço e abrir o teclado numérico. O botão responde ao toque e navega para os detalhes.

### 3. Melhoria do Header/Card do Produto (Product Info)
- **Agent:** `mobile-developer`
- **Skill:** `clean-code`
- **INPUT:** Seção que exibe a imagem e dados do produto (via `ProductCard` ou visualização inline).
- **OUTPUT:** Uma exibição estilo "Hero", possivelmente com a imagem assumindo um papel mais central, cantos arredondados condizentes com a `index.tsx`, e textos mais hierarquizados (Título maior, preço anterior sutil).
- **VERIFY:** A imagem carrega corretamente e as fontes utilizam o peso (bold/semibold) adequado para leitura clara.

## Phase X: Final Verification
- [x] **Linting:** Rodar `npm run lint` ou verificação equivalente no projeto Frontend.
- [x] **Testes Manuais de Navegação:** Abrir o app no Expo Go / Emulador, navegar até `registerProduct` e testar.
- [x] **Checagem de Tema:** Alternar entre Claro/Escuro para confirmar a legibilidade dos inputs e textos.
- [x] **Socratic Gate:** O design foi confirmado como criativo e alinhado? Sim.
- [x] **UX Audit:** Sem botões pequenos demais e contraste suficiente.

## ✅ PHASE X COMPLETE
- Lint: [x] Pass
- Build: [x] Success
- Date: 11 de Agosto de 2026
