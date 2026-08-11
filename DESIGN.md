---
name: App Design Tokens
description: System design tokens for the mobile application
---

# DESIGN
This document defines the single source of truth for UI elements in the mobile application. All new screens and components must use the tokens defined here.

## Colors (ThemeContext)
The app uses a dynamic theming system (`useTheme` in `themeContent.tsx`) with light, dark, and AMOLED modes.

- **Background:** `themeStyles.bg`
- **Card Background:** `themeStyles.card`
- **Header Background:** `themeStyles.headerBg`
- **Borders:** `themeStyles.border`
- **Text Primary:** `themeStyles.text`
- **Text Secondary:** `themeStyles.subText`
- **Input Background:** `themeStyles.inputBg`
- **Accent:** `accent` (Extracted from system Monet colors or Fallback presets)

## Typography
- **Headings / Hero:** 22px, bold, lineHeight 28
- **Section Titles:** 18px, bold
- **Standard Labels:** 14px, semibold (600)
- **Input Text:** 16px, medium (500)
- **Small Badges:** 10px - 11px, bold, uppercase, letterSpacing 1

## Layout & Structure
- **Border Radius:**
  - Cards and large containers: `20` - `24`
  - Inputs, Pickers and Buttons: `16` - `20`
  - Badges: `12`
- **Spacing:**
  - Container padding horizontal: `16` - `20`
  - Gap between sections: `24`
  - Gap between inputs: `20`
- **Shadows / Elevation:**
  - Buttons and Floating elements: `elevation: 4-5`, with slight shadow opacity.
  - Cards: `elevation: 3-5`

## Components Guidelines
- **Buttons:** Large, highly visible, using `accent` color with `#FFF` text. Padding vertical ~16px.
- **Inputs:** Height 50-54px. Use left icons (Ionicons) in `accent` color. Border width 1 with `themeStyles.border`.
- **Hero Cards:** Prominent image, clear title. Uses `themeStyles.card` and `themeStyles.border`. Overlay badges when appropriate.
