import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  SupportedLanguage,
  LanguageInfo,
  TranslationKey,
  SUPPORTED_LANGUAGES,
  DICTIONARIES,
  DEFAULT_LANGUAGE,
} from "../i18n";

export * from "../i18n";

export type LanguagePreference = SupportedLanguage | "system";

interface I18nContextType {
  language: SupportedLanguage;
  languagePreference: LanguagePreference;
  languageInfo: LanguageInfo;
  isSystemLanguage: boolean;
  setLanguage: (lang: LanguagePreference) => Promise<void>;
  languages: LanguageInfo[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LANGUAGE_STORAGE_KEY = "@presco:language";
const APP_SETTINGS_KEY = "app_settings";

/**
 * Resolves the device's system language to the best matching SupportedLanguage.
 */
export function resolveSystemLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    if (!locales || locales.length === 0) {
      return DEFAULT_LANGUAGE;
    }

    for (const loc of locales) {
      const langCode = (loc.languageCode || "").toLowerCase();
      const regionCode = (loc.regionCode || "").toUpperCase();
      const fullTag = (loc.languageTag || `${langCode}-${regionCode}`).toLowerCase();

      // 1. Exact or composite matches
      if (fullTag.startsWith("pt-br") || (langCode === "pt" && regionCode === "BR")) return "pt-BR";
      if (fullTag.startsWith("en-us") || (langCode === "en" && regionCode === "US")) return "en-US";
      if (fullTag.startsWith("es-es") || (langCode === "es" && regionCode === "ES")) return "es-ES";
      if (fullTag.startsWith("de-de") || (langCode === "de" && regionCode === "DE")) return "de-DE";
      if (fullTag.startsWith("ru-ru") || (langCode === "ru" && regionCode === "RU")) return "ru-RU";
      if (fullTag.startsWith("zh-cn") || fullTag.startsWith("zh-hans") || (langCode === "zh" && regionCode === "CN")) return "zh-CN";
      if (fullTag.startsWith("ja-jp") || (langCode === "ja" && regionCode === "JP")) return "ja-JP";

      // 2. Primary language root matches
      if (langCode === "pt") return "pt-BR";
      if (langCode === "en") return "en-US";
      if (langCode === "es") return "es-ES";
      if (langCode === "de") return "de-DE";
      if (langCode === "ru") return "ru-RU";
      if (langCode === "zh") return "zh-CN";
      if (langCode === "ja") return "ja-JP";
    }
  } catch (err) {
    console.warn("[i18n] Failed to resolve system language:", err);
  }

  return DEFAULT_LANGUAGE;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LanguagePreference>("system");
  const [language, setLanguageState] = useState<SupportedLanguage>(resolveSystemLanguage);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference from AsyncStorage
  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang === "system") {
          setPreference("system");
          setLanguageState(resolveSystemLanguage());
          setIsLoaded(true);
          return;
        }

        if (savedLang && DICTIONARIES[savedLang as SupportedLanguage]) {
          setPreference(savedLang as SupportedLanguage);
          setLanguageState(savedLang as SupportedLanguage);
          setIsLoaded(true);
          return;
        }

        // Fallback to app_settings key
        const settingsJson = await AsyncStorage.getItem(APP_SETTINGS_KEY);
        if (settingsJson) {
          const parsed = JSON.parse(settingsJson);
          if (parsed?.language === "system") {
            setPreference("system");
            setLanguageState(resolveSystemLanguage());
            setIsLoaded(true);
            return;
          }
          if (parsed?.language && DICTIONARIES[parsed.language as SupportedLanguage]) {
            setPreference(parsed.language as SupportedLanguage);
            setLanguageState(parsed.language as SupportedLanguage);
            setIsLoaded(true);
            return;
          }
        }

        // Default: If no saved preference exists, automatically use system language
        setPreference("system");
        setLanguageState(resolveSystemLanguage());
      } catch (err) {
        console.warn("[i18n] Failed to load saved language, using system default:", err);
        setLanguageState(resolveSystemLanguage());
      } finally {
        setIsLoaded(true);
      }
    }

    loadSavedLanguage();
  }, []);

  // Save language preference
  const setLanguage = useCallback(async (newPreference: LanguagePreference) => {
    if (newPreference !== "system" && !DICTIONARIES[newPreference]) {
      console.warn(`[i18n] Unsupported language code: ${newPreference}`);
      return;
    }

    setPreference(newPreference);
    const resolved = newPreference === "system" ? resolveSystemLanguage() : newPreference;
    setLanguageState(resolved);

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newPreference);

      // Keep app_settings JSON in sync
      const currentSettings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      if (currentSettings) {
        const parsed = JSON.parse(currentSettings);
        parsed.language = newPreference;
        await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(parsed));
      }
    } catch (err) {
      console.warn("[i18n] Failed to persist language:", err);
    }
  }, []);

  const languageInfo = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((item) => item.code === language) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [language]);

  // Translation function with parameter interpolation
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const parts = key.split(".");
      if (parts.length !== 2) {
        return key;
      }

      const [namespace, field] = parts as [keyof typeof DICTIONARIES[typeof DEFAULT_LANGUAGE], string];

      const activeDict = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANGUAGE];
      const fallbackDict = DICTIONARIES[DEFAULT_LANGUAGE];

      let rawText = (activeDict as any)?.[namespace]?.[field];
      if (typeof rawText !== "string" || rawText.trim() === "") {
        rawText = (fallbackDict as any)?.[namespace]?.[field] || key;
      }

      if (params && typeof rawText === "string") {
        return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
          return str.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        }, rawText);
      }

      return rawText;
    },
    [language]
  );

  const value = useMemo<I18nContextType>(
    () => ({
      language,
      languagePreference: preference,
      languageInfo,
      isSystemLanguage: preference === "system",
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      t,
      isRTL: false,
    }),
    [language, preference, languageInfo, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export const useTranslation = useI18n;

