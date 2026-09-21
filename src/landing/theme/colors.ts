// Primitivos locais para isolar a landing page do restante do projeto
export const primitiveColors = {
    lightPalette: { bg: "#FFFFFF", card: "#F8F9FA", headerBg: "#FFFFFF", inputBg: "#F1F3F5", text: "#1A1A1A", subText: "#6C757D", border: "#E9ECEF" },
    darkPalette: { bg: "#121212", card: "#1E1E1E", headerBg: "#121212", inputBg: "#2C2C2E", text: "#F8F9FA", subText: "#A1A1A6", border: "#2C2C2E" },
    amoledPalette: { bg: "#000000", card: "#101010", headerBg: "#000000", inputBg: "#1C1C1E", text: "#FFFFFF", subText: "#8E8E93", border: "#1C1C1E", divider: "#1C1C1E" },
    neutral: { white: "#FFFFFF", gray200: "#E9ECEF", gray300: "#DEE2E6", gray400: "#CED4DA", gray500: "#ADB5BD", gray600: "#6C757D", gray700: "#495057", gray800: "#343A40", gray900: "#212529" },
    overlay: { black45: "rgba(0,0,0,0.45)" },
    system: { red500: "#EF4444", green500: "#10B981", amber500: "#F59E0B", blue500: "#3B82F6", red600: "#DC2626", green600: "#059669", amber600: "#D97706", blue600: "#2563EB" },
};

export type ThemeMode = "light" | "dark";

export function createSemanticColors(
    mode: ThemeMode,
    isAmoled: boolean,
    accent: string
) {
    const isDark = mode === "dark";

    if (isDark) {
        const palette = isAmoled ? primitiveColors.amoledPalette : primitiveColors.darkPalette;
        return {
            surface: {
                background: palette.bg,
                card: palette.card,
                header: palette.headerBg,
                input: palette.inputBg,
                overlay: primitiveColors.overlay.black45,
                highlight: accent + "18",
                footer: palette.headerBg,
            },
            text: {
                primary: palette.text,
                secondary: palette.subText,
                tertiary: primitiveColors.neutral.gray500,
                inverse: primitiveColors.neutral.white,
                accent: accent,
            },
            border: {
                default: palette.border,
                header: palette.border,
                divider: palette.border,
            },
        };
    }

    return {
        surface: {
            background: primitiveColors.lightPalette.bg,
            card: primitiveColors.lightPalette.card,
            header: primitiveColors.lightPalette.headerBg,
            input: primitiveColors.lightPalette.inputBg,
            overlay: primitiveColors.overlay.black45,
            highlight: accent + "18",
            footer: primitiveColors.lightPalette.headerBg,
        },
        text: {
            primary: primitiveColors.lightPalette.text,
            secondary: primitiveColors.lightPalette.subText,
            tertiary: primitiveColors.neutral.gray400,
            inverse: primitiveColors.neutral.white,
            accent: accent,
        },
        border: {
            default: primitiveColors.lightPalette.border,
            header: primitiveColors.lightPalette.border,
            divider: primitiveColors.lightPalette.border,
        },
    };
}