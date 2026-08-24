import { SemanticColors, ThemeMode } from "../../types";
import { primitiveColors } from "../primitives/colors";

export function createSemanticColors(
  mode: ThemeMode,
  isAmoled: boolean,
  accent: string,
  paletteOverride?: {
    bg?: string;
    headerBg?: string;
    headerBorder?: string;
    card?: string;
    border?: string;
    text?: string;
    subText?: string;
    inputBg?: string;
    inputBorder?: string;
  }
): SemanticColors {
  const isDark = mode === "dark";

  if (paletteOverride) {
    return {
      surface: {
        background: paletteOverride.bg || (isDark ? (isAmoled ? primitiveColors.amoledPalette.bg : primitiveColors.darkPalette.bg) : primitiveColors.lightPalette.bg),
        card: paletteOverride.card || (isDark ? (isAmoled ? primitiveColors.amoledPalette.card : primitiveColors.darkPalette.card) : primitiveColors.lightPalette.card),
        header: paletteOverride.headerBg || (isDark ? (isAmoled ? primitiveColors.amoledPalette.headerBg : primitiveColors.darkPalette.headerBg) : primitiveColors.lightPalette.headerBg),
        input: paletteOverride.inputBg || (isDark ? (isAmoled ? primitiveColors.amoledPalette.inputBg : primitiveColors.darkPalette.inputBg) : primitiveColors.lightPalette.inputBg),
        overlay: primitiveColors.overlay.black45,
        highlight: accent + "18",
        disabled: isDark ? primitiveColors.neutral.gray800 : primitiveColors.neutral.gray200,
        footer: paletteOverride.headerBg || (isDark ? (isAmoled ? primitiveColors.amoledPalette.headerBg : primitiveColors.darkPalette.headerBg) : primitiveColors.lightPalette.headerBg),
        centerCircle: isDark ? primitiveColors.neutral.gray700 : "#2C2C2E",
      },
      text: {
        primary: paletteOverride.text || (isDark ? (isAmoled ? primitiveColors.amoledPalette.text : primitiveColors.darkPalette.text) : primitiveColors.lightPalette.text),
        secondary: paletteOverride.subText || (isDark ? (isAmoled ? primitiveColors.amoledPalette.subText : primitiveColors.darkPalette.subText) : primitiveColors.lightPalette.subText),
        tertiary: isDark ? primitiveColors.neutral.gray500 : primitiveColors.neutral.gray400,
        inverse: primitiveColors.neutral.white,
        accent: accent,
        error: primitiveColors.system.red500,
        success: primitiveColors.system.green500,
        warning: primitiveColors.system.amber500,
        info: primitiveColors.system.blue500,
      },
      border: {
        default: paletteOverride.border || (isDark ? (isAmoled ? primitiveColors.amoledPalette.border : primitiveColors.darkPalette.border) : primitiveColors.lightPalette.border),
        header: paletteOverride.headerBorder || (isDark ? (isAmoled ? primitiveColors.amoledPalette.divider : primitiveColors.darkPalette.border) : primitiveColors.lightPalette.border),
        subtle: isDark ? (isAmoled ? primitiveColors.amoledPalette.divider : primitiveColors.neutral.gray800) : primitiveColors.neutral.gray200,
        focus: accent,
        divider: paletteOverride.border || (isDark ? (isAmoled ? primitiveColors.amoledPalette.divider : primitiveColors.darkPalette.border) : primitiveColors.lightPalette.border),
        input: paletteOverride.inputBorder || paletteOverride.border || (isDark ? (isAmoled ? primitiveColors.amoledPalette.border : primitiveColors.darkPalette.border) : primitiveColors.lightPalette.border),
      },
      icon: {
        primary: paletteOverride.text || (isDark ? (isAmoled ? primitiveColors.amoledPalette.text : primitiveColors.darkPalette.text) : primitiveColors.lightPalette.text),
        secondary: isDark ? primitiveColors.neutral.gray400 : primitiveColors.neutral.gray500,
        interactive: isDark ? primitiveColors.neutral.gray300 : primitiveColors.neutral.gray600,
        inverse: primitiveColors.neutral.white,
        accent: accent,
        inactive: isDark ? primitiveColors.neutral.gray500 : primitiveColors.neutral.gray400,
      },
      feedback: {
        success: primitiveColors.system.green500,
        warning: primitiveColors.system.amber500,
        error: primitiveColors.system.red500,
        info: primitiveColors.system.blue500,
      },
    };
  }

  if (isDark) {
    if (isAmoled) {
      return {
        surface: {
          background: primitiveColors.amoledPalette.bg,
          card: primitiveColors.amoledPalette.card,
          header: primitiveColors.amoledPalette.headerBg,
          input: primitiveColors.amoledPalette.inputBg,
          overlay: primitiveColors.overlay.black45,
          highlight: accent + "18",
          disabled: primitiveColors.neutral.gray900,
          footer: primitiveColors.amoledPalette.headerBg,
          centerCircle: primitiveColors.neutral.gray700,
        },
        text: {
          primary: primitiveColors.amoledPalette.text,
          secondary: primitiveColors.amoledPalette.subText,
          tertiary: primitiveColors.neutral.gray500,
          inverse: primitiveColors.neutral.white,
          accent: accent,
          error: primitiveColors.system.red500,
          success: primitiveColors.system.green500,
          warning: primitiveColors.system.amber500,
          info: primitiveColors.system.blue500,
        },
        border: {
          default: primitiveColors.amoledPalette.border,
          header: primitiveColors.amoledPalette.divider,
          subtle: primitiveColors.amoledPalette.divider,
          focus: accent,
          divider: primitiveColors.amoledPalette.divider,
          input: primitiveColors.amoledPalette.border,
        },
        icon: {
          primary: primitiveColors.amoledPalette.text,
          secondary: primitiveColors.neutral.gray400,
          interactive: primitiveColors.neutral.gray300,
          inverse: primitiveColors.neutral.white,
          accent: accent,
          inactive: primitiveColors.neutral.gray500,
        },
        feedback: {
          success: primitiveColors.system.green500,
          warning: primitiveColors.system.amber500,
          error: primitiveColors.system.red500,
          info: primitiveColors.system.blue500,
        },
      };
    }

    return {
      surface: {
        background: primitiveColors.darkPalette.bg,
        card: primitiveColors.darkPalette.card,
        header: primitiveColors.darkPalette.headerBg,
        input: primitiveColors.darkPalette.inputBg,
        overlay: primitiveColors.overlay.black45,
        highlight: accent + "18",
        disabled: primitiveColors.neutral.gray800,
        footer: primitiveColors.darkPalette.headerBg,
        centerCircle: primitiveColors.neutral.gray700,
      },
      text: {
        primary: primitiveColors.darkPalette.text,
        secondary: primitiveColors.darkPalette.subText,
        tertiary: primitiveColors.neutral.gray500,
        inverse: primitiveColors.neutral.white,
        accent: accent,
        error: primitiveColors.system.red500,
        success: primitiveColors.system.green500,
        warning: primitiveColors.system.amber500,
        info: primitiveColors.system.blue500,
      },
      border: {
        default: primitiveColors.darkPalette.border,
        header: primitiveColors.darkPalette.border,
        subtle: primitiveColors.neutral.gray800,
        focus: accent,
        divider: primitiveColors.darkPalette.border,
        input: primitiveColors.darkPalette.border,
      },
      icon: {
        primary: primitiveColors.darkPalette.text,
        secondary: primitiveColors.neutral.gray400,
        interactive: primitiveColors.neutral.gray300,
        inverse: primitiveColors.neutral.white,
        accent: accent,
        inactive: primitiveColors.neutral.gray500,
      },
      feedback: {
        success: primitiveColors.system.green500,
        warning: primitiveColors.system.amber500,
        error: primitiveColors.system.red500,
        info: primitiveColors.system.blue500,
      },
    };
  }

  // Light theme
  return {
    surface: {
      background: primitiveColors.lightPalette.bg,
      card: primitiveColors.lightPalette.card,
      header: primitiveColors.lightPalette.headerBg,
      input: primitiveColors.lightPalette.inputBg,
      overlay: primitiveColors.overlay.black45,
      highlight: accent + "18",
      disabled: primitiveColors.neutral.gray200,
      footer: primitiveColors.lightPalette.headerBg,
      centerCircle: "#2C2C2E",
    },
    text: {
      primary: primitiveColors.lightPalette.text,
      secondary: primitiveColors.lightPalette.subText,
      tertiary: primitiveColors.neutral.gray400,
      inverse: primitiveColors.neutral.white,
      accent: accent,
      error: primitiveColors.system.red600,
      success: primitiveColors.system.green600,
      warning: primitiveColors.system.amber600,
      info: primitiveColors.system.blue600,
    },
    border: {
      default: primitiveColors.lightPalette.border,
      header: primitiveColors.lightPalette.border,
      subtle: primitiveColors.neutral.gray200,
      focus: accent,
      divider: primitiveColors.lightPalette.border,
      input: primitiveColors.lightPalette.border,
    },
    icon: {
      primary: primitiveColors.lightPalette.text,
      secondary: primitiveColors.neutral.gray500,
      interactive: primitiveColors.neutral.gray600,
      inverse: primitiveColors.neutral.white,
      accent: accent,
      inactive: primitiveColors.neutral.gray400,
    },
    feedback: {
      success: primitiveColors.system.green600,
      warning: primitiveColors.system.amber600,
      error: primitiveColors.system.red600,
      info: primitiveColors.system.blue600,
    },
  };
}
