// Design Tokens oficiais do Presco - Fusão ClickUp (SaaS Crisp) + Too Good To Go (Deep Forest & Warm Cream)
export const primitiveColors = {
    brand: {
        yellow50: "#FFFBEB",
        yellow100: "#FEF3C7",
        yellow200: "#FDE68A",
        yellow300: "#FCD34D",
        yellow400: "#FBBF24",
        yellow500: "#FFB703", // Amarelo oficial Presco de alta conversão
        yellow600: "#F59E0B",
        yellow700: "#D97706",
        yellow800: "#B45309",
        yellow900: "#78350F",
        goldAccent: "#F5B731",
        forestGreen: "#005642", // Verde florestal Too Good To Go
        forestDark: "#0A1612",  // Fundo dark deep forest
        forestSurface: "#132B24",
        forestBorder: "#1C3B32",
    },
    neutral: {
        white: "#FFFFFF",
        black: "#000000",
        transparent: "transparent",
        cream50: "#FDFBF7",
        cream100: "#FBF9F4", // Fundo Too Good To Go Light
        cream200: "#F4EFE6",
        cream300: "#EAE3D5",
        cream400: "#DDD5C4",
        gray50: "#F9FAFB",
        gray100: "#F3F4F6",
        gray200: "#E5E7EB",
        gray300: "#D1D5DB",
        gray400: "#9CA3AF",
        gray500: "#6B7280",
        gray600: "#4B5563",
        gray700: "#374151",
        gray800: "#1F2937",
        gray900: "#111827",
        gray950: "#030712",
    },
    // Modo Claro acolhedor no estilo Too Good To Go
    lightPalette: {
        bg: "#FBF9F4",
        headerBg: "rgba(251, 249, 244, 0.90)",
        card: "#FFFFFF",
        cardHover: "#F7F4EE",
        border: "#E8E2D5",
        borderSubtle: "rgba(0, 0, 0, 0.06)",
        inputBg: "#F2EDE3",
        text: "#0D211A", // Verde florestal bem escuro para leitura confortável
        subText: "#4A5E56",
    },
    // Modo Escuro moderno em Deep Forest Slate (ClickUp + Too Good To Go)
    darkPalette: {
        bg: "#0A1612",
        headerBg: "rgba(10, 22, 18, 0.88)",
        card: "#112620",
        cardHover: "#16332B",
        border: "#1D3F35",
        borderSubtle: "rgba(255, 255, 255, 0.08)",
        inputBg: "#0A1612",
        text: "#F3FBF7",
        subText: "#8FA89F",
    },
    // Modo AMOLED com economia máxima de bateria
    amoledPalette: {
        bg: "#000000",
        headerBg: "rgba(0, 0, 0, 0.90)",
        card: "#07120E",
        cardHover: "#0D1E17",
        border: "#142820",
        borderSubtle: "rgba(255, 255, 255, 0.10)",
        inputBg: "#050B08",
        text: "#FFFFFF",
        subText: "#96AEA5",
    },
    overlay: {
        black45: "rgba(0, 0, 0, 0.45)",
        black75: "rgba(0, 0, 0, 0.75)",
    },
    system: {
        red500: "#EF4444",
        green500: "#10B981", // Verde de validação e economia
        amber500: "#F59E0B",
        blue500: "#3B82F6",
    },
};

export type ThemeType = "dark" | "amoled" | "light";

export function createSemanticColors(themeType: ThemeType = "dark") {
    const isDark = themeType === "dark";
    const isAmoled = themeType === "amoled";
    const isLight = themeType === "light";

    const palette = isAmoled
        ? primitiveColors.amoledPalette
        : isDark
        ? primitiveColors.darkPalette
        : primitiveColors.lightPalette;

    // Amarelo oficial do Presco (#FFB703)
    const accent = primitiveColors.brand.yellow500;
    const accentHover = primitiveColors.brand.yellow600;

    return {
        themeType,
        isDark: !isLight,
        isAmoled,
        isLight,
        accent,
        accentHover,
        surface: {
            background: palette.bg,
            header: palette.headerBg,
            card: palette.card,
            cardHover: palette.cardHover,
            input: palette.inputBg,
            border: palette.border,
            borderSubtle: palette.borderSubtle,
            overlay: primitiveColors.overlay.black75,
            highlight: accent + "18",
            badgeBg: accent + "22",
        },
        text: {
            primary: palette.text,
            secondary: palette.subText,
            tertiary: isLight ? primitiveColors.neutral.gray500 : primitiveColors.neutral.gray400,
            inverse: "#000000",
            accent: accent,
        },
        border: {
            default: palette.border,
            subtle: palette.borderSubtle,
            focus: accent,
        },
        feedback: primitiveColors.system,
    };
}

export type SemanticTheme = ReturnType<typeof createSemanticColors>;