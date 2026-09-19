import { SemanticTokens, ThemeMode } from "../../types";
import { createSemanticColors } from "./colors";
import { semanticSpacing } from "./spacing";
import { semanticTypography } from "./typography";
import { semanticRadii } from "./radii";
import { semanticElevation } from "./elevation";

export {
  createSemanticColors,
  semanticSpacing,
  semanticTypography,
  semanticRadii,
  semanticElevation,
};

export function getSemanticTokens(
  mode: ThemeMode,
  isAmoled: boolean,
  accent: string,
  paletteOverride?: any
): SemanticTokens {
  return {
    colors: createSemanticColors(mode, isAmoled, accent, paletteOverride),
    spacing: semanticSpacing,
    typography: semanticTypography,
    radius: semanticRadii,
    elevation: semanticElevation,
  };
}
