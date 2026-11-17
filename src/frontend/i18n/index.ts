import { pt } from "./locales/pt";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { de } from "./locales/de";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { LanguageInfo, SupportedLanguage, TranslationSchema } from "./types";

export * from "./types";

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "pt-BR",
    nativeName: "Português (Brasil)",
    englishName: "Portuguese (Brazil)",
    flag: "PT",
  },
  {
    code: "en-US",
    nativeName: "English (US)",
    englishName: "English (United States)",
    flag: "EN",
  },
  {
    code: "es-ES",
    nativeName: "Español",
    englishName: "Spanish",
    flag: "ES",
  },
  {
    code: "de-DE",
    nativeName: "Deutsch",
    englishName: "German",
    flag: "DE",
  },
  {
    code: "ru-RU",
    nativeName: "Русский",
    englishName: "Russian",
    flag: "RU",
  },
  {
    code: "zh-CN",
    nativeName: "简体中文",
    englishName: "Chinese (Simplified)",
    flag: "ZH",
  },
  {
    code: "ja-JP",
    nativeName: "日本語",
    englishName: "Japanese",
    flag: "JA",
  },
];

export const DICTIONARIES: Record<SupportedLanguage, TranslationSchema> = {
  "pt-BR": pt,
  "en-US": en,
  "es-ES": es,
  "de-DE": de,
  "ru-RU": ru,
  "zh-CN": zh,
  "ja-JP": ja,
};

export const DEFAULT_LANGUAGE: SupportedLanguage = "pt-BR";
