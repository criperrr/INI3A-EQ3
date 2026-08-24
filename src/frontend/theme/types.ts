import { PlatformColor, StyleSheet } from "react-native";

// ─── Primitive Token Types ──────────────────────────────────────────
export interface PrimitiveColors {
  neutral: {
    white: string;
    black: string;
    transparent: string;
    gray50: string;
    gray100: string;
    gray200: string;
    gray300: string;
    gray400: string;
    gray500: string;
    gray600: string;
    gray700: string;
    gray800: string;
    gray900: string;
    gray950: string;
  };
  brand: {
    emerald50: string;
    emerald100: string;
    emerald200: string;
    emerald300: string;
    emerald400: string;
    emerald500: string;
    emerald600: string;
    emerald700: string;
    emerald800: string;
    emerald900: string;
    forestGreen: string;
    darkForest: string;
  };
  darkPalette: {
    bg: string;
    headerBg: string;
    card: string;
    border: string;
    inputBg: string;
    text: string;
    subText: string;
  };
  amoledPalette: {
    bg: string;
    headerBg: string;
    card: string;
    border: string;
    inputBg: string;
    text: string;
    subText: string;
    divider: string;
  };
  lightPalette: {
    bg: string;
    headerBg: string;
    card: string;
    border: string;
    inputBg: string;
    text: string;
    subText: string;
  };
  system: {
    red500: string;
    red600: string;
    green500: string;
    green600: string;
    amber500: string;
    amber600: string;
    blue500: string;
    blue600: string;
  };
  overlay: {
    black45: string;
    black60: string;
    black80: string;
  };
}

export interface PrimitiveSpacing {
  0: number;
  0.5: number;
  1: number;
  1.5: number;
  2: number;
  2.5: number;
  3: number;
  3.5: number;
  4: number;
  4.5: number;
  5: number;
  6: number;
  7: number;
  8: number;
  10: number;
  12: number;
  16: number;
}

export interface PrimitiveTypography {
  size: {
    xs: number;
    sm: number;
    sub: number;
    label: number;
    body: number;
    callout: number;
    base: number;
    title3: number;
    title2: number;
    title1: number;
    hero: number;
    display: number;
  };
  weight: {
    regular: "400";
    medium: "500";
    semibold: "600";
    bold: "700";
    heavy: "800";
  };
  lineHeight: {
    tight: number;
    snug: number;
    normal: number;
    body: number;
    relaxed: number;
    title: number;
    hero: number;
    display: number;
  };
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
    wider: number;
    widest: number;
  };
}

export interface PrimitiveRadii {
  none: number;
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  "2xl": number;
  "3xl": number;
  full: number;
}

export interface ShadowDefinition {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface PrimitiveShadows {
  none: ShadowDefinition;
  sm: ShadowDefinition;
  md: ShadowDefinition;
  lg: ShadowDefinition;
  xl: ShadowDefinition;
  floating: ShadowDefinition;
}

export interface PrimitiveTokens {
  colors: PrimitiveColors;
  spacing: PrimitiveSpacing;
  typography: PrimitiveTypography;
  radii: PrimitiveRadii;
  shadows: PrimitiveShadows;
}

// ─── Semantic Token Types ──────────────────────────────────────────
export interface SemanticColors {
  surface: {
    background: string;
    card: string;
    header: string;
    input: string;
    overlay: string;
    highlight: string;
    disabled: string;
    footer: string;
    centerCircle: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  border: {
    default: string;
    header: string;
    subtle: string;
    focus: string;
    divider: string;
    input: string;
  };
  icon: {
    primary: string;
    secondary: string;
    interactive: string;
    inverse: string;
    accent: string;
    inactive: string;
  };
  feedback: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface SemanticSpacing {
  screenPaddingHorizontal: number;
  screenPaddingVertical: number;
  cardPadding: number;
  cardPaddingSm: number;
  sectionGap: number;
  itemGap: number;
  elementGap: number;
  microGap: number;
  inputHeight: number;
  buttonHeight: number;
  headerPaddingHorizontal: number;
  headerPaddingBottom: number;
  tabBarHeight: number;
}

export interface TextStyleToken {
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700" | "800";
  lineHeight?: number;
  letterSpacing?: number;
}

export interface SemanticTypography {
  hero: TextStyleToken;
  sectionTitle: TextStyleToken;
  productTitle: TextStyleToken;
  subtitle: TextStyleToken;
  body: TextStyleToken;
  bodyMedium: TextStyleToken;
  bodyBold: TextStyleToken;
  caption: TextStyleToken;
  badge: TextStyleToken;
  button: TextStyleToken;
  input: TextStyleToken;
  micro: TextStyleToken;
}

export interface SemanticRadii {
  card: number;
  button: number;
  input: number;
  image: number;
  chip: number;
  badge: number;
  pill: number;
  avatar: number;
  modal: number;
}

export interface SemanticElevation {
  none: ShadowDefinition;
  card: ShadowDefinition;
  button: ShadowDefinition;
  header: ShadowDefinition;
  footer: ShadowDefinition;
  floating: ShadowDefinition;
  modal: ShadowDefinition;
}

export interface SemanticTokens {
  colors: SemanticColors;
  spacing: SemanticSpacing;
  typography: SemanticTypography;
  radius: SemanticRadii;
  elevation: SemanticElevation;
}

// ─── Theme Context Types ───────────────────────────────────────────
export type ThemeMode = "light" | "dark";

export interface MonetPreset {
  name: string;
  hex: string;
}

export interface LegacyThemeStyles {
  bg: { backgroundColor: string };
  headerBg: { backgroundColor: string; borderBottomColor: string };
  card: { backgroundColor: string };
  border: { borderColor: string };
  text: { color: string };
  subText: { color: string };
  btnToggleOff: { backgroundColor: string };
  inputBg: { backgroundColor: string; borderColor: string };
}

export interface DesignSystemTokens {
  primitives: PrimitiveTokens;
  semantic: SemanticTokens;
}

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  amoledEnabled: boolean;
  monetEnabled: boolean;
  syncWithSystemAndroid: boolean;
  monetSeedColor: string;
  accent: any;
  tokens: DesignSystemTokens;
  themeStyles: LegacyThemeStyles;
  setGlobalTheme: (newTheme: ThemeMode) => void;
  setAmoledEnabled: (enabled: boolean) => void;
  setMonetEnabled: (enabled: boolean) => void;
  setSyncWithSystemAndroid: (enabled: boolean) => void;
  setMonetSeedColor: (hex: string) => void;
  applyThemeSettingsBatch: (batch: {
    theme?: ThemeMode;
    amoledEnabled?: boolean;
    monetEnabled?: boolean;
    syncWithSystemAndroid?: boolean;
    monetSeedColor?: string;
  }) => Promise<void>;
}
