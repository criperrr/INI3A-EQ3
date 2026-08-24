import { SemanticTypography } from "../../types";
import { primitiveTypography } from "../primitives/typography";

export const semanticTypography: SemanticTypography = {
  hero: {
    fontSize: primitiveTypography.size.title1, // 22
    fontWeight: primitiveTypography.weight.bold,
    lineHeight: primitiveTypography.lineHeight.hero, // 28
    letterSpacing: primitiveTypography.letterSpacing.tight, // -0.5
  },
  sectionTitle: {
    fontSize: primitiveTypography.size.title3, // 18
    fontWeight: primitiveTypography.weight.bold,
    lineHeight: primitiveTypography.lineHeight.relaxed, // 24
  },
  productTitle: {
    fontSize: primitiveTypography.size.title2, // 20
    fontWeight: primitiveTypography.weight.bold,
    lineHeight: primitiveTypography.lineHeight.title, // 26
  },
  subtitle: {
    fontSize: primitiveTypography.size.base, // 16
    fontWeight: primitiveTypography.weight.semibold,
    lineHeight: primitiveTypography.lineHeight.body, // 22
  },
  body: {
    fontSize: primitiveTypography.size.body, // 14
    fontWeight: primitiveTypography.weight.regular,
    lineHeight: primitiveTypography.lineHeight.normal, // 20
  },
  bodyMedium: {
    fontSize: primitiveTypography.size.body, // 14
    fontWeight: primitiveTypography.weight.medium,
    lineHeight: primitiveTypography.lineHeight.normal, // 20
  },
  bodyBold: {
    fontSize: primitiveTypography.size.body, // 14
    fontWeight: primitiveTypography.weight.bold,
    lineHeight: primitiveTypography.lineHeight.normal, // 20
  },
  caption: {
    fontSize: primitiveTypography.size.sub, // 12
    fontWeight: primitiveTypography.weight.regular,
    lineHeight: primitiveTypography.lineHeight.snug, // 16
  },
  badge: {
    fontSize: primitiveTypography.size.sm, // 11
    fontWeight: primitiveTypography.weight.bold,
    letterSpacing: primitiveTypography.letterSpacing.wider, // 1.0
  },
  button: {
    fontSize: primitiveTypography.size.callout, // 15
    fontWeight: primitiveTypography.weight.bold,
    lineHeight: primitiveTypography.lineHeight.body, // 22
  },
  input: {
    fontSize: primitiveTypography.size.base, // 16
    fontWeight: primitiveTypography.weight.medium,
    lineHeight: primitiveTypography.lineHeight.body, // 22
  },
  micro: {
    fontSize: primitiveTypography.size.xs, // 10
    fontWeight: primitiveTypography.weight.bold,
    letterSpacing: primitiveTypography.letterSpacing.wide, // 0.5
  },
};
