import { SemanticElevation } from "../../types";
import { primitiveShadows } from "../primitives/shadows";

export const semanticElevation: SemanticElevation = {
  none: primitiveShadows.none,
  card: primitiveShadows.md,      // elevation 3, offset {0, 4}, opacity 0.05, radius 8
  button: primitiveShadows.md,    // elevation 3, offset {0, 4}, opacity 0.2, radius 6
  header: primitiveShadows.sm,    // elevation 2
  footer: primitiveShadows.floating, // elevation 5, offset {0, -2}
  floating: primitiveShadows.xl,  // elevation 8, offset {0, 4}
  modal: primitiveShadows.xl,     // elevation 8
};
