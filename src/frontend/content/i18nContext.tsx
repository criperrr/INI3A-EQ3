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
import {
  SupportedLanguage,
  LanguageInfo,
  TranslationKey,
  SUPPORTED_LANGUAGES,
  DICTIONARIES,
  DEFAULT_LANGUAGE,
} from "../i18n";

export * from "../i18n";

interface I18nContextType {
  language: SupportedLanguage;
  languageInfo: LanguageInfo;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  languages: LanguageInfo[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LANGUAGE_STORAGE_KEY = "@presco:language";
const APP_SETTINGS_KEY = "app_settings";

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference from AsyncStorage
  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        // First check dedicated key
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang && DICTIONARIES[savedLang as SupportedLanguage]) {
          setLanguageState(savedLang as SupportedLanguage);
          setIsLoaded(true);
          return;
        }

        // Fallback to app_settings key
        const settingsJson = await AsyncStorage.getItem(APP_SETTINGS_KEY);
        if (settingsJson) {
          const parsed = JSON.parse(settingsJson);
          if (parsed?.language && DICTIONARIES[parsed.language as SupportedLanguage]) {
            setLanguageState(parsed.language as SupportedLanguage);
            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn("[i18n] Failed to load saved language, using default:", err);
      } finally {
        setIsLoaded(true);
      }
    }

    loadSavedLanguage();
  }, []);

  // Save language preference
  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    if (!DICTIONARIES[newLang]) {
      console.warn(`[i18n] Unsupported language code: ${newLang}`);
      return;
    }

    setLanguageState(newLang);

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);

      // Keep app_settings JSON in sync
      const currentSettings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      if (currentSettings) {
        const parsed = JSON.parse(currentSettings);
        parsed.language = newLang;
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
      languageInfo,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      t,
      isRTL: false,
    }),
    [language, languageInfo, setLanguage, t]
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
