import { createSemanticColors } from "./colors";
import { semanticTypography } from "./typography";

export const ACCENT_COLOR = "#00D1B2"; // Cor primária da landing page

export const themeColors = createSemanticColors("dark", false, ACCENT_COLOR);
export const themeTypography = semanticTypography;