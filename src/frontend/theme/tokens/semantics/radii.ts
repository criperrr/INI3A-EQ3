import { SemanticRadii } from "../../types";
import { primitiveRadii } from "../primitives/radii";

export const semanticRadii: SemanticRadii = {
  card: primitiveRadii["2xl"], // 20
  button: primitiveRadii.xl,   // 16
  input: primitiveRadii.xl,    // 16
  image: primitiveRadii.lg,    // 14
  chip: primitiveRadii.lg,     // 14
  badge: primitiveRadii.md,    // 10
  pill: primitiveRadii.full,   // 9999
  avatar: primitiveRadii.full, // 9999
  modal: primitiveRadii["3xl"], // 24
};
