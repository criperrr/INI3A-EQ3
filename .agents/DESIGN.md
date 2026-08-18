---
name: App Design Tokens
description: System design tokens for the Presco mobile application
---

# DESIGN.md - Presco Design System

This document defines the single source of truth for UI elements in the Presco mobile application (`INI3A-EQ3`). All new screens and components must strictly consume the tokens defined here via `useTheme()` in `src/frontend/content/themeContent.tsx`.

---

## 1. Colors & Dynamic Theming (`ThemeContext`)

The app supports 3 core theme modes with dynamic system Monet / Accent preset customization:
- **Light Mode**
- **Dark Mode**
- **AMOLED Mode** (Pure black `#000000` for OLED displays)

### Theme Token Mapping (`themeStyles`)

| Token | Light Mode | Dark Mode | AMOLED Mode | Purpose |
|---|---|---|---|---|
| `themeStyles.bg` | `#F8F9FA` | `#121212` | `#000000` | Main screen background |
| `themeStyles.card` | `#FFFFFF` | `#1E1E1E` | `#0A0A0A` | Card & surface background |
| `themeStyles.headerBg` | `#FFFFFF` | `#1A1A1A` | `#000000` | Navigation header background |
| `themeStyles.border` | `#E0E0E0` | `#2C2C2C` | `#1A1A1A` | Borders and dividers |
| `themeStyles.text` | `#1A1A1A` | `#F5F5F5` | `#FFFFFF` | High-contrast primary text |
| `themeStyles.subText` | `#757575` | `#A0A0A0` | `#888888` | Muted secondary text & labels |
| `themeStyles.inputBg` | `#F1F3F5` | `#252525` | `#121212` | Input field background |

### Accent Colors (`accent`)
The `accent` color is dynamically extracted from Android Material You (Monet) on supported devices or falls back to curated theme palettes:
- **Emerald/Green (Default):** `#10B981` / `#059669`
- **Indigo/Blue:** `#3B82F6` / `#2563EB`
- **Violet/Purple:** `#8B5CF6` / `#7C3AED`
- **Amber/Orange:** `#F59E0B` / `#D97706`
- **Rose/Red:** `#F43F5E` / `#E11D48`

---

## 2. Typography Hierarchy

| Style Role | Font Size | Font Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| **Hero / Heading** | 22px | Bold (700) | 28px | -0.5px | Screen titles, greeting, stats hero |
| **Section Title** | 18px | Bold (700) | 24px | 0px | Card group headers, modal titles |
| **Subtitle / Section** | 16px | SemiBold (600) | 22px | 0px | Product names, setting category titles |
| **Standard Label / Body** | 14px | Medium / SemiBold | 20px | 0px | Descriptions, field labels, list items |
| **Input Text** | 16px | Medium (500) | 22px | 0px | Text input fields, search bar |
| **Small Badge / Micro** | 10px–11px | Bold (700) | 14px | 1px | Uppercase tags, XP pills, status chips |

---

## 3. Layout & Geometry

### Border Radius
- **Cards & Containers:** `20px` to `24px`
- **Inputs, Pickers & Primary Buttons:** `16px` to `20px`
- **Badges, Pills & Chips:** `12px` to `16px` (or `999px` for pill shape)
- **Avatars:** `50%` (`borderRadius: width / 2`)

### Spacing Scale
- **Horizontal Container Padding:** `16px` to `20px`
- **Section Gap:** `24px`
- **Item / Input Gap:** `16px` to `20px`
- **Micro Spacing:** `8px` to `12px`

### Shadows & Elevation
- **Floating Action Buttons & Key Action Controls:** `elevation: 5`, `shadowColor: "#000"`, `shadowOpacity: 0.15`, `shadowRadius: 8`, `shadowOffset: { width: 0, height: 4 }`
- **Cards:** `elevation: 3-4`, `shadowOpacity: 0.08`, `shadowRadius: 6`

---

## 4. Components Guidelines

- **Primary Action Buttons:** Prominent, height 50–54px, background `accent`, text `#FFFFFF` (16px bold), `borderRadius: 16–20`.
- **Text Inputs:** Height 50–54px, `themeStyles.inputBg`, border width 1 with `themeStyles.border`, left Ionicons icon colored with `accent`.
- **Product Cards:** Image rendered via `expo-image` with `cachePolicy="memory-disk"`, title in `themeStyles.text`, subtitle in `themeStyles.subText`, price highlighted in `accent`.
- **XP / Gamification Pills:** Small chip with glowing background (`accent + '20'`), icon + bold numeric XP label.
