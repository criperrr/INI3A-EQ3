---
name: design-rules
version: 1.0.0
priority: P0
trigger: glob
globs: "**/*.{tsx,jsx,vue,svelte,css,scss},**/components/**,**/src/frontend/**"
---

# Design Rules (P0) - INI3A-EQ3 & AG Kit

> Carregado ao modificar qualquer arquivo de interface ou estilo no `src/frontend`.

---

## 🎨 1. Token Source of Truth: `.agents/DESIGN.md`

Todo e qualquer componente visual em `src/frontend/` deve consumir estritamente os tokens de `.agents/DESIGN.md` via hook `useTheme()`:

- `themeStyles.bg`, `.card`, `.headerBg`, `.border`, `.text`, `.subText`, `.inputBg`
- `accent` — extraído dinamicamente das cores de sistema (Material You / Monet) ou preset fallback.
- **Tipografia:** Títulos 22px bold, Seções 18px bold, Labels 14px semibold, Inputs 16px medium.
- **Bordas & Radii:** Cards 20–24px, Inputs/Botões 16–20px, Badges 12px.
- **Inputs:** Altura 50–54px, ícone Ionicons à esquerda na cor `accent`.

---

## ✨ 2. Padrões Visuais de Excelência

1. **Sem Cores Genéricas:** Use a paleta HSL harmoniosa de `DESIGN.md`.
2. **Design Dinâmico:** Use micro-animações, feedback tátil (haptics em mobile) e transições suaves de toque.
3. **Ergonomia Mobile:** Alvos de toque de no mínimo 48x48px, thumb zone respeitada em CTAs primárias.
4. **Sem Placeholders:** Utilize ícones vetoriais consistentes (`Ionicons`) ou assets gerados.

---
