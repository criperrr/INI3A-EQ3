const primitiveTypography = {
    size: { title1: 22, title2: 20, title3: 18, base: 16, callout: 15, body: 14, sub: 12, sm: 11, xs: 10 },
    weight: { regular: "400" as const, medium: "500" as const, semibold: "600" as const, bold: "700" as const },
    lineHeight: { hero: 28, title: 26, relaxed: 24, body: 22, normal: 20, snug: 16 },
    letterSpacing: { tight: -0.5, wide: 0.5, wider: 1.0 },
};

export const semanticTypography = {
    hero: {
        fontSize: primitiveTypography.size.title1,
        fontWeight: primitiveTypography.weight.bold,
        lineHeight: primitiveTypography.lineHeight.hero,
        letterSpacing: primitiveTypography.letterSpacing.tight,
    },
    sectionTitle: {
        fontSize: primitiveTypography.size.title3,
        fontWeight: primitiveTypography.weight.bold,
        lineHeight: primitiveTypography.lineHeight.relaxed,
    },
    productTitle: {
        fontSize: primitiveTypography.size.title2,
        fontWeight: primitiveTypography.weight.bold,
        lineHeight: primitiveTypography.lineHeight.title,
    },
    subtitle: {
        fontSize: primitiveTypography.size.base,
        fontWeight: primitiveTypography.weight.semibold,
        lineHeight: primitiveTypography.lineHeight.body,
    },
    body: {
        fontSize: primitiveTypography.size.body,
        fontWeight: primitiveTypography.weight.regular,
        lineHeight: primitiveTypography.lineHeight.normal,
    },
    bodyMedium: {
        fontSize: primitiveTypography.size.body,
        fontWeight: primitiveTypography.weight.medium,
        lineHeight: primitiveTypography.lineHeight.normal,
    },
    badge: {
        fontSize: primitiveTypography.size.sm,
        fontWeight: primitiveTypography.weight.bold,
        letterSpacing: primitiveTypography.letterSpacing.wider,
    },
    button: {
        fontSize: primitiveTypography.size.callout,
        fontWeight: primitiveTypography.weight.bold,
        lineHeight: primitiveTypography.lineHeight.body,
    },
    caption: {
        fontSize: primitiveTypography.size.sub,
        fontWeight: primitiveTypography.weight.regular,
        lineHeight: primitiveTypography.lineHeight.snug,
    },
};