/**
 * Safe date parsing and formatting utilities for React Native / Hermes / Web
 * Prevents "Invalid Date" and NaN crashes with PostgreSQL timestamps and invalid inputs.
 */

/**
 * Safely parses any date representation into a valid Date object.
 * Returns a fallback Date (current date or specified fallback) if invalid.
 */
export function parseDateSafe(
  dateInput: string | Date | number | null | undefined,
  fallback: Date = new Date()
): Date {
  if (dateInput === null || dateInput === undefined || dateInput === "") {
    return fallback;
  }
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? fallback : dateInput;
  }
  if (typeof dateInput === "number") {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? fallback : d;
  }

  let str = String(dateInput).trim();
  if (!str) return fallback;

  // Try direct parsing first
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  // Handle PostgreSQL timestamp strings e.g. "2026-08-31 11:03:23.583959-03"
  if (str.includes(" ")) {
    str = str.replace(" ", "T");
  }
  // Convert 2-digit timezone offset (-03) to 4-digit (-03:00) for Hermes/Safari compatibility
  str = str.replace(/([+-]\d{2})$/, "$1:00");

  parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return fallback;
}

/**
 * Safely returns unix milliseconds timestamp (never NaN).
 */
export function parseDateSafeMs(
  dateInput: string | Date | number | null | undefined,
  fallbackMs: number = Date.now()
): number {
  const d = parseDateSafe(dateInput, new Date(fallbackMs));
  const ms = d.getTime();
  return isNaN(ms) ? fallbackMs : ms;
}

/**
 * Maps app locale code (e.g. 'pt', 'en', 'es', 'pt-BR') to standard BCP 47 language tag
 */
export function normalizeLocale(locale?: string): string {
  if (!locale) return "pt-BR";
  switch (locale) {
    case "pt":
    case "pt-BR":
      return "pt-BR";
    case "en":
    case "en-US":
      return "en-US";
    case "es":
    case "es-ES":
      return "es-ES";
    case "de":
    case "de-DE":
      return "de-DE";
    case "ru":
    case "ru-RU":
      return "ru-RU";
    case "zh":
    case "zh-CN":
      return "zh-CN";
    case "ja":
    case "ja-JP":
      return "ja-JP";
    default:
      return locale;
  }
}

/**
 * Standard localized date formatter e.g. "05/09/2026"
 */
export function formatDisplayDate(
  dateInput: string | Date | number | null | undefined,
  locale = "pt-BR",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleDateString(
      normalizeLocale(locale),
      options || { day: "2-digit", month: "2-digit", year: "numeric" }
    );
  } catch {
    const now = new Date();
    return now.toLocaleDateString("pt-BR");
  }
}

/**
 * Full localized date formatter e.g. "05 de set. de 2026"
 */
export function formatFullDisplayDate(
  dateInput: string | Date | number | null | undefined,
  locale = "pt-BR"
): string {
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleDateString(normalizeLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return formatDisplayDate(dateInput, locale);
  }
}

/**
 * Short date formatter for charts e.g. "05/09"
 */
export function formatShortDate(
  dateInput: string | Date | number | null | undefined,
  locale = "pt-BR"
): string {
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleDateString(normalizeLocale(locale), {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Long date with weekday for register screen headers e.g. "sábado, 5 de setembro de 2026"
 */
export function formatLongDateWithWeekday(
  dateInput: string | Date | number | null | undefined,
  locale = "pt-BR"
): string {
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleDateString(normalizeLocale(locale), {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return formatDisplayDate(dateInput, locale);
  }
}
