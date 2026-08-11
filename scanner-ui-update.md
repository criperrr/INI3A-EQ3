# Update Scanner and Product Details UI

## Overview
The goal is to update the UI layouts of the "Produto Encontrado" (mapped to `productDetails.tsx`) and the `scannerConfirmation.tsx` screens to match the color layout and format of `index.tsx`.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
- The `productDetails.tsx` screen looks consistent with the styling and layout of `index.tsx`.
- The `scannerConfirmation.tsx` screen is updated to use the same layout format, colors, and styling rules.
- Components leverage the `useTheme` hook correctly for light/dark modes as seen in `index.tsx`.

## Tech Stack
- React Native
- Expo Router
- `themeContent.tsx` context for colors

## File Structure
- `src/frontend/app/productDetails.tsx` (To Modify)
- `src/frontend/app/scannerConfirmation.tsx` (To Modify)

## Task Breakdown

### Task 1: Update Scanner Confirmation UI
- **Agent**: `mobile-developer`
- **Skill**: `mobile-design`
- **Priority**: P1
- **Dependencies**: None
- **INPUT**: `src/frontend/app/scannerConfirmation.tsx` and `src/frontend/app/index.tsx` layouts.
- **OUTPUT**: Updated `scannerConfirmation.tsx` with refactored styles, updated button alignments, card wrapper styling that matches `index.tsx`.
- **VERIFY**: Check the screen visually to ensure colors and fonts align with `index.tsx` using `useTheme()`.

### Task 2: Update Product Details UI
- **Agent**: `mobile-developer`
- **Skill**: `mobile-design`
- **Priority**: P1
- **Dependencies**: None
- **INPUT**: `src/frontend/app/productDetails.tsx` and `src/frontend/app/index.tsx` layouts.
- **OUTPUT**: Updated `productDetails.tsx` using matching color schemes (like `accent`), card layouts, and background setups as in `index.tsx`.
- **VERIFY**: The chart and product information match the new styling standards.

## Phase X: Verification
- [ ] Lint check: `npm run lint && npx tsc --noEmit`
- [ ] No purple/violet hex codes
- [ ] No standard template layouts
- [ ] The app builds successfully
- [ ] UI looks visually consistent with `index.tsx` on runtime.
