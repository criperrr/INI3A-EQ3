import { primitiveColors } from "./colors";
import { primitiveSpacing } from "./spacing";
import { primitiveTypography } from "./typography";
import { primitiveRadii } from "./radii";
import { primitiveShadows } from "./shadows";
import { PrimitiveTokens } from "../../types";

export {
  primitiveColors,
  primitiveSpacing,
  primitiveTypography,
  primitiveRadii,
  primitiveShadows,
};

export const primitives: PrimitiveTokens = {
  colors: primitiveColors,
  spacing: primitiveSpacing,
  typography: primitiveTypography,
  radii: primitiveRadii,
  shadows: primitiveShadows,
};
