import { createSemanticColors, ThemeType, SemanticTheme } from "./colors";
import { typography } from "./typography";

export * from "./colors";
export * from "./typography";

export const defaultTheme = createSemanticColors("dark");
export const defaultTypography = typography;