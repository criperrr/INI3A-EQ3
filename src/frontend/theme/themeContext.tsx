import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, Platform, PlatformColor } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeContextValue,
  ThemeMode,
  LegacyThemeStyles,
  DesignSystemTokens,
} from "./types";
import { primitives } from "./tokens/primitives";
import { getSemanticTokens } from "./tokens/semantics";
import {
  generateMonetPalette,
  MONET_PRESETS,
  DEFAULT_ACCENT_LIGHT,
  DEFAULT_ACCENT_DARK,
  ANDROID_SYSTEM_ACCENT_FALLBACK,
} from "./monetization/monet";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [amoledEnabled, setAmoledEnabledState] = useState(false);
  const [monetEnabled, setMonetEnabledState] = useState(false);
  const [syncWithSystemAndroid, setSyncWithSystemAndroidState] = useState(false);
  const [monetSeedColor, setMonetSeedColorState] = useState<string>(MONET_PRESETS[0].hex);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("app_settings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.theme) setTheme(parsed.theme);
          if (parsed.amoledEnabled !== undefined) setAmoledEnabledState(parsed.amoledEnabled);
          if (parsed.monetEnabled !== undefined) setMonetEnabledState(parsed.monetEnabled);
          if (parsed.syncWithSystemAndroid !== undefined) setSyncWithSystemAndroidState(parsed.syncWithSystemAndroid);
          if (parsed.monetSeedColor) setMonetSeedColorState(parsed.monetSeedColor);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações de tema:", error);
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

  const setGlobalTheme = useCallback(async (newTheme: ThemeMode) => {
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
      theme?: ThemeMode;
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

  const isDark = theme === "dark";

  // Compute resolved tokens and legacy styles
  const { tokens, themeStyles, accent } = useMemo(() => {
    let effectiveAccent: any = isDark ? DEFAULT_ACCENT_DARK : DEFAULT_ACCENT_LIGHT;
    let paletteOverride: any = undefined;

    if (monetEnabled) {
      if (syncWithSystemAndroid && Platform.OS === "android") {
        const seedHex = ANDROID_SYSTEM_ACCENT_FALLBACK;
        const palette = generateMonetPalette(seedHex, isDark && amoledEnabled);
        paletteOverride = isDark ? palette.dark : palette.light;

        const supportsDynamicColor =
          typeof Platform.Version === "number"
            ? Platform.Version >= 31
            : parseInt(String(Platform.Version), 10) >= 31;

        effectiveAccent = supportsDynamicColor
          ? PlatformColor("@android:color/system_accent1_500")
          : paletteOverride.accent;
      } else {
        const palette = generateMonetPalette(monetSeedColor, isDark && amoledEnabled);
        paletteOverride = isDark ? palette.dark : palette.light;
        effectiveAccent = paletteOverride.accent;
      }
    }

    const semantic = getSemanticTokens(
      theme,
      isDark && amoledEnabled,
      typeof effectiveAccent === "string" ? effectiveAccent : DEFAULT_ACCENT_LIGHT,
      paletteOverride
    );

    const dsTokens: DesignSystemTokens = {
      primitives,
      semantic,
    };

    // Legacy StyleSheet compatibility mapped directly to semantic tokens
    const legacyStyles: LegacyThemeStyles = StyleSheet.create({
      bg: { backgroundColor: semantic.colors.surface.background },
      headerBg: {
        backgroundColor: semantic.colors.surface.header,
        borderBottomColor: semantic.colors.border.header,
      },
      card: { backgroundColor: semantic.colors.surface.card },
      border: { borderColor: semantic.colors.border.default },
      text: { color: semantic.colors.text.primary },
      subText: { color: semantic.colors.text.secondary },
      btnToggleOff: { backgroundColor: semantic.colors.border.default },
      inputBg: {
        backgroundColor: semantic.colors.surface.input,
        borderColor: semantic.colors.border.input,
      },
    });

    return {
      tokens: dsTokens,
      themeStyles: legacyStyles,
      accent: effectiveAccent,
    };
  }, [theme, isDark, amoledEnabled, monetEnabled, syncWithSystemAndroid, monetSeedColor]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark,
      amoledEnabled,
      monetEnabled,
      syncWithSystemAndroid,
      monetSeedColor,
      accent,
      tokens,
      themeStyles,
      setGlobalTheme,
      setAmoledEnabled,
      setMonetEnabled,
      setSyncWithSystemAndroid,
      setMonetSeedColor,
      applyThemeSettingsBatch,
    }),
    [
      theme,
      isDark,
      amoledEnabled,
      monetEnabled,
      syncWithSystemAndroid,
      monetSeedColor,
      accent,
      tokens,
      themeStyles,
      setGlobalTheme,
      setAmoledEnabled,
      setMonetEnabled,
      setSyncWithSystemAndroid,
      setMonetSeedColor,
      applyThemeSettingsBatch,
    ],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
};

/**
 * Direct hook to access only the semantic & primitive tokens.
 */
export const useThemeTokens = () => {
  const { tokens } = useTheme();
  return tokens;
};
