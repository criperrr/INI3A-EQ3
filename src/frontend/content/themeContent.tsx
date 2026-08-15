// content/themeContent.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, Platform, PlatformColor } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Color Utilities ────────────────────────────────────────────
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Generates a Material You style palette from a seed color.
 */
function generateMonetPalette(seedHex: string, isAmoled: boolean = false) {
  const { h } = hexToHsl(seedHex);

  return {
    // Light theme
    light: {
      accent: hslToHex(h, 50, 35),
      accentLight: hslToHex(h, 40, 90),
      bg: hslToHex(h, 20, 97),
      headerBg: hslToHex(h, 18, 93),
      headerBorder: hslToHex(h, 15, 82),
      card: hslToHex(h, 18, 95),
      border: hslToHex(h, 15, 82),
      text: hslToHex(h, 30, 12),
      subText: hslToHex(h, 12, 38),
      toggleOff: hslToHex(h, 15, 82),
      inputBg: hslToHex(h, 15, 91),
      inputBorder: hslToHex(h, 15, 82),
    },
    // Dark theme (standard vs amoled)
    dark: {
      accent: hslToHex(h, 55, 70),
      accentLight: hslToHex(h, 30, 20),
      bg: isAmoled ? "#000000" : hslToHex(h, 15, 7),
      headerBg: isAmoled ? "#000000" : hslToHex(h, 15, 10),
      headerBorder: isAmoled ? "#1C1C1C" : hslToHex(h, 12, 22),
      card: isAmoled ? "#0D0D0D" : hslToHex(h, 15, 13),
      border: isAmoled ? "#1F1F1F" : hslToHex(h, 12, 22),
      text: isAmoled ? "#FFFFFF" : hslToHex(h, 15, 92),
      subText: isAmoled ? "#A0A0A0" : hslToHex(h, 10, 58),
      toggleOff: isAmoled ? "#1C1C1C" : hslToHex(h, 12, 22),
      inputBg: isAmoled ? "#080808" : hslToHex(h, 15, 7),
      inputBorder: isAmoled ? "#1F1F1F" : hslToHex(h, 12, 22),
    },
  };
}

// ─── Default Palettes ───────────────────────────────────────────
const DEFAULT_ACCENT_LIGHT = "#2E7D32";
const DEFAULT_ACCENT_DARK = "#F5B731";
const ANDROID_SYSTEM_ACCENT_FALLBACK = "#3885FF"; // Material You System Blue

export const MONET_PRESETS = [
  { name: "Verde",    hex: "#2E7D32" },
  { name: "Azul",     hex: "#1565C0" },
  { name: "Roxo",     hex: "#7B1FA2" },
  { name: "Rosa",     hex: "#C2185B" },
  { name: "Laranja",  hex: "#E65100" },
  { name: "Teal",     hex: "#00796B" },
  { name: "Índigo",   hex: "#283593" },
  { name: "Marrom",   hex: "#4E342E" },
] as const;

// ─── Theme Styles (Standard & AMOLED Defaults) ───────────────────
const lightThemeDefault = StyleSheet.create({
  bg:       { backgroundColor: "#F5F7F2" },
  headerBg: { backgroundColor: "#EEF2E8", borderBottomColor: "#D4DCC8" },
  card:     { backgroundColor: "#F0F4EC" },
  border:   { borderColor: "#D4DCC8" },
  text:     { color: "#1A2E1A" },
  subText:  { color: "#5A6B52" },
  btnToggleOff: { backgroundColor: "#D4DCC8" },
  inputBg:  { backgroundColor: "#E8EDE2", borderColor: "#D4DCC8" },
});

const darkThemeDefault = StyleSheet.create({
  bg:       { backgroundColor: "#0D1117" },
  headerBg: { backgroundColor: "#161B22", borderBottomColor: "#30363D" },
  card:     { backgroundColor: "#1C2333" },
  border:   { borderColor: "#30363D" },
  text:     { color: "#F0E6D3" },
  subText:  { color: "#8B949E" },
  btnToggleOff: { backgroundColor: "#30363D" },
  inputBg:  { backgroundColor: "#0D1117", borderColor: "#30363D" },
});

const darkThemeAmoled = StyleSheet.create({
  bg:       { backgroundColor: "#000000" },
  headerBg: { backgroundColor: "#000000", borderBottomColor: "#1C1C1C" },
  card:     { backgroundColor: "#0F0F0F" },
  border:   { borderColor: "#1F1F1F" },
  text:     { color: "#FFFFFF" },
  subText:  { color: "#9E9E9E" },
  btnToggleOff: { backgroundColor: "#1C1C1C" },
  inputBg:  { backgroundColor: "#080808", borderColor: "#1F1F1F" },
});

type ThemeStyleSheet = typeof lightThemeDefault;

function buildThemeFromPalette(palette: ReturnType<typeof generateMonetPalette>, mode: "light" | "dark"): ThemeStyleSheet {
  const p = palette[mode];
  return StyleSheet.create({
    bg:       { backgroundColor: p.bg },
    headerBg: { backgroundColor: p.headerBg, borderBottomColor: p.headerBorder },
    card:     { backgroundColor: p.card },
    border:   { borderColor: p.border },
    text:     { color: p.text },
    subText:  { color: p.subText },
    btnToggleOff: { backgroundColor: p.toggleOff },
    inputBg:  { backgroundColor: p.inputBg, borderColor: p.inputBorder },
  });
}

// ─── Context ────────────────────────────────────────────────────
interface ThemeContextType {
  theme: "light" | "dark";
  isDark: boolean;
  amoledEnabled: boolean;
  accent: any;
  themeStyles: ThemeStyleSheet;
  monetEnabled: boolean;
  syncWithSystemAndroid: boolean;
  monetSeedColor: string;
  setGlobalTheme: (newTheme: "light" | "dark") => void;
  setAmoledEnabled: (enabled: boolean) => void;
  setMonetEnabled: (enabled: boolean) => void;
  setSyncWithSystemAndroid: (enabled: boolean) => void;
  setMonetSeedColor: (hex: string) => void;
  applyThemeSettingsBatch: (batch: {
    theme?: "light" | "dark";
    amoledEnabled?: boolean;
    monetEnabled?: boolean;
    syncWithSystemAndroid?: boolean;
    monetSeedColor?: string;
  }) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [amoledEnabled, setAmoledEnabledState] = useState(false);
  const [monetEnabled, setMonetEnabledState] = useState(false);
  const [syncWithSystemAndroid, setSyncWithSystemAndroidState] = useState(false);
  const [monetSeedColor, setMonetSeedColorState] = useState<string>(MONET_PRESETS[0].hex);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await AsyncStorage.getItem("app_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.amoledEnabled !== undefined) setAmoledEnabledState(parsed.amoledEnabled);
        if (parsed.monetEnabled !== undefined) setMonetEnabledState(parsed.monetEnabled);
        if (parsed.syncWithSystemAndroid !== undefined) setSyncWithSystemAndroidState(parsed.syncWithSystemAndroid);
        if (parsed.monetSeedColor) setMonetSeedColorState(parsed.monetSeedColor);
      }
    };
    loadSettings();
  }, []);

  const persistSetting = useCallback(async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem("app_settings");
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[key] = value;
      await AsyncStorage.setItem("app_settings", JSON.stringify(parsed));
    } catch (error) {
      console.error("Erro ao persistir configuração:", error);
    }
  }, []);

  const setGlobalTheme = useCallback(async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    persistSetting("theme", newTheme);
  }, [persistSetting]);

  const setAmoledEnabled = useCallback(async (enabled: boolean) => {
    setAmoledEnabledState(enabled);
    persistSetting("amoledEnabled", enabled);
  }, [persistSetting]);

  const setMonetEnabled = useCallback(async (enabled: boolean) => {
    setMonetEnabledState(enabled);
    persistSetting("monetEnabled", enabled);
  }, [persistSetting]);

  const setSyncWithSystemAndroid = useCallback(async (enabled: boolean) => {
    setSyncWithSystemAndroidState(enabled);
    persistSetting("syncWithSystemAndroid", enabled);
  }, [persistSetting]);

  const setMonetSeedColor = useCallback(async (hex: string) => {
    setMonetSeedColorState(hex);
    persistSetting("monetSeedColor", hex);
  }, [persistSetting]);

  const applyThemeSettingsBatch = useCallback(
    async (batch: {
      theme?: "light" | "dark";
      amoledEnabled?: boolean;
      monetEnabled?: boolean;
      syncWithSystemAndroid?: boolean;
      monetSeedColor?: string;
    }) => {
      if (batch.theme !== undefined) setTheme(batch.theme);
      if (batch.amoledEnabled !== undefined) setAmoledEnabledState(batch.amoledEnabled);
      if (batch.monetEnabled !== undefined) setMonetEnabledState(batch.monetEnabled);
      if (batch.syncWithSystemAndroid !== undefined)
        setSyncWithSystemAndroidState(batch.syncWithSystemAndroid);
      if (batch.monetSeedColor !== undefined) setMonetSeedColorState(batch.monetSeedColor);

      try {
        const saved = await AsyncStorage.getItem("app_settings");
        const parsed = saved ? JSON.parse(saved) : {};
        const updated = { ...parsed, ...batch };
        await AsyncStorage.setItem("app_settings", JSON.stringify(updated));
      } catch (error) {
        console.error("Erro ao aplicar configurações em lote:", error);
      }
    },
    [],
  );

  // Compute derived values
  const isDark = theme === "dark";

  const { themeStyles, accent } = useMemo(() => {
    // 1. If Monet is disabled
    if (!monetEnabled) {
      if (isDark) {
        return {
          themeStyles: amoledEnabled ? darkThemeAmoled : darkThemeDefault,
          accent: DEFAULT_ACCENT_DARK,
        };
      }
      return {
        themeStyles: lightThemeDefault,
        accent: DEFAULT_ACCENT_LIGHT,
      };
    }

    // 2. If Monet is enabled with Android System Sync
    if (syncWithSystemAndroid && Platform.OS === "android") {
      const seedHex = ANDROID_SYSTEM_ACCENT_FALLBACK;
      const palette = generateMonetPalette(seedHex, isDark && amoledEnabled);
      const styles = buildThemeFromPalette(palette, isDark ? "dark" : "light");

      // Verify if Android version is 12 (API 31) or above to support Material You dynamic colors
      const supportsDynamicColor =
          typeof Platform.Version === "number"
              ? Platform.Version >= 31
              : parseInt(String(Platform.Version), 10) >= 31;

      const fallbackAccent = isDark ? palette.dark.accent : palette.light.accent;

      return {
        themeStyles: styles,
        accent: supportsDynamicColor
            ? PlatformColor("@android:color/system_accent1_500")
            : fallbackAccent,
      };
    }

    // 3. Monet enabled with seed color
    const palette = generateMonetPalette(monetSeedColor, isDark && amoledEnabled);
    const styles = buildThemeFromPalette(palette, isDark ? "dark" : "light");
    const monetAccent = isDark ? palette.dark.accent : palette.light.accent;

    return { themeStyles: styles, accent: monetAccent };
  }, [isDark, amoledEnabled, monetEnabled, syncWithSystemAndroid, monetSeedColor]);

  return (
      <ThemeContext.Provider
          value={{
            theme,
            isDark,
            amoledEnabled,
            accent,
            themeStyles,
            monetEnabled,
            syncWithSystemAndroid,
            monetSeedColor,
            setGlobalTheme,
            setAmoledEnabled,
            setMonetEnabled,
            setSyncWithSystemAndroid,
            setMonetSeedColor,
            applyThemeSettingsBatch,
          }}
      >
        {children}
      </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  return context;
};