import { MonetPreset } from "../types";

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

export function hslToHex(h: number, s: number, l: number): string {
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
export function generateMonetPalette(seedHex: string, isAmoled: boolean = false) {
  const { h } = hexToHsl(seedHex);

  return {
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

export const DEFAULT_ACCENT_LIGHT = "#2E7D32";
export const DEFAULT_ACCENT_DARK = "#F5B731";
export const ANDROID_SYSTEM_ACCENT_FALLBACK = "#3885FF"; // Material You System Blue

export const MONET_PRESETS: readonly MonetPreset[] = [
  { name: "Verde",    hex: "#2E7D32" },
  { name: "Azul",     hex: "#1565C0" },
  { name: "Roxo",     hex: "#7B1FA2" },
  { name: "Rosa",     hex: "#C2185B" },
  { name: "Laranja",  hex: "#E65100" },
  { name: "Teal",     hex: "#00796B" },
  { name: "Índigo",   hex: "#283593" },
  { name: "Marrom",   hex: "#4E342E" },
] as const;
