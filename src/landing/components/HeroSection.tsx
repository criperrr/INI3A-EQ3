import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import { PhoneMockup } from "./PhoneMockup";
import { TropicalFaunaFloraCanvas } from "./TropicalFaunaFloraCanvas";
import {
    SvgSparkleIcon,
    SvgShieldIcon,
    SvgMapPinIcon,
    SvgGithubIcon,
    SvgChevronRightIcon,
} from "./SvgIcons";

interface HeroSectionProps {
    theme: SemanticTheme;
    onDownload: () => void;
    onOpenPolicies: (tab?: "terms" | "privacy" | "guidelines" | "cookies") => void;
    onExploreFeatures: () => void;
    onScrollToHowItWorks?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    theme,
    onDownload,
    onOpenPolicies,
    onExploreFeatures,
    onScrollToHowItWorks,
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 960;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.background,
                },
            ]}
        >
            <View style={styles.ambientGlow} />

            {/* JavaScript Canvas 2D: Arara-canindé e Folhas de Costela-de-Adão */}
            <TropicalFaunaFloraCanvas theme={theme} showMacaw={true} showLeaves={true} />

            <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
                {/* Left Column: Text & Actions */}
                <View style={[styles.textContent, isDesktop && styles.textContentDesktop]}>
                    {/* Header Pill Badge */}
                    <View
                        style={[
                            styles.badgeRow,
                            {
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "50",
                            },
                        ]}
                    >
                        <SvgSparkleIcon size={13} color={theme.accent} />
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                            {width < 400 ? "INTELIGÊNCIA COLABORATIVA" : "INTELIGÊNCIA COLABORATIVA CONTRA A INFLAÇÃO"}
                        </Text>
                    </View>

                    {/* Main Headline */}
                    <Text
                        style={[
                            styles.headline,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? (width >= 1200 ? 46 : 38) : (width < 380 ? 26 : 30),
                                lineHeight: isDesktop ? (width >= 1200 ? 54 : 46) : (width < 380 ? 34 : 38),
                            },
                        ]}
                    >
                        Economize até 35% no supermercado com a{" "}
                        <Text style={{ color: theme.accent }}>
                            força da sua comunidade
                        </Text>
                    </Text>

                    {/* Subtitle */}
                    <Text
                        style={[
                            styles.subtitle,
                            {
                                color: theme.text.secondary,
                                fontSize: isDesktop ? 17 : 15,
                                lineHeight: isDesktop ? 26 : 22,
                            },
                        ]}
                    >
                        Chega de surpresas indigestas no caixa. O Presco combina leitor óptico instantâneo na gôndola,
                        cotações em tempo real e um motor de rota veicular que desconta o combustível gasto para
                        garantir economia líquida no seu bolso.
                    </Text>

                    {/* CTA Actions */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[
                                styles.btnPrimary,
                                {
                                    backgroundColor: theme.accent,
                                    shadowColor: theme.accent,
                                },
                            ]}
                            activeOpacity={0.85}
                            onPress={onDownload}
                        >
                            <Text style={[styles.btnPrimaryText, { color: theme.text.inverse }]}>Baixar APK Gratuito</Text>
                            <Text style={[styles.btnPrimarySub, { color: theme.isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.7)" }]}>Android 8.0+ • v1.4.5 Oficial • 100% Livre</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.btnSecondary,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                            activeOpacity={0.8}
                            onPress={onScrollToHowItWorks || onExploreFeatures}
                        >
                            <View style={styles.secondaryBtnRow}>
                                <Text style={[styles.btnSecondaryText, { color: theme.text.primary }]}>
                                    Como Funciona
                                </Text>
                                <SvgChevronRightIcon size={14} color={theme.text.primary} />
                            </View>
                            <Text
                                style={[
                                    styles.btnSecondarySub,
                                    { color: theme.text.secondary },
                                ]}
                            >
                                Jornada em 3 passos
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Social Proof & Trust Strip with 100% SVG Icons */}
                    <View
                        style={[
                            styles.trustRow,
                            {
                                borderTopColor: theme.surface.borderSubtle,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.trustItem}
                            onPress={() => onOpenPolicies("privacy")}
                        >
                            <SvgShieldIcon size={14} color={theme.accent} />
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                Sem Anúncios & LGPD
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.trustDot, { color: theme.text.secondary }]}>•</Text>

                        <View style={styles.trustItem}>
                            <SvgMapPinIcon size={14} color={theme.accent} />
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                400+ Mercados Mapeados
                            </Text>
                        </View>

                        <Text style={[styles.trustDot, { color: theme.text.secondary }]}>•</Text>

                        <View style={styles.trustItem}>
                            <SvgGithubIcon size={14} color={theme.accent} />
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                Código Aberto no GitHub
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Right Column: Interactive Phone Mockup with App Prints */}
                <View style={[styles.mockupColumn, isDesktop && styles.mockupColumnDesktop]}>
                    <PhoneMockup theme={theme} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 56,
        position: "relative",
        overflow: "hidden",
    },
    ambientGlow: {
        position: "absolute",
        top: -120,
        left: "50%",
        transform: [{ translateX: -300 }],
        width: 600,
        height: 600,
        borderRadius: 300,
        backgroundColor: "rgba(255, 183, 3, 0.08)",
        // @ts-ignore
        filter: "blur(140px)",
        pointerEvents: "none",
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
        flexDirection: "column",
        alignItems: "center",
        gap: 36,
        position: "relative",
    },
    innerDesktop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
    },
    textContent: {
        width: "100%",
        alignItems: "flex-start",
        position: "relative",
    },
    textContentDesktop: {
        flex: 1.25,
        maxWidth: 640,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
        position: "relative",
        zIndex: 30,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    headline: {
        fontWeight: "900",
        letterSpacing: -1.0,
        marginBottom: 18,
        position: "relative",
        zIndex: 30,
    },
    subtitle: {
        fontWeight: "400",
        letterSpacing: -0.2,
        marginBottom: 28,
        maxWidth: 560,
        position: "relative",
        zIndex: 30,
    },
    actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 28,
        width: "100%",
        position: "relative",
        zIndex: 10,
    },
    btnPrimary: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        shadowColor: "#FFB703",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
        minWidth: 190,
    },
    btnPrimaryText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
        textAlign: "center",
    },
    btnPrimarySub: {
        color: "rgba(0, 0, 0, 0.7)",
        fontSize: 11,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 2,
    },
    btnSecondary: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        minWidth: 160,
        justifyContent: "center",
    },
    secondaryBtnRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    btnSecondaryText: {
        fontSize: 14,
        fontWeight: "800",
        textAlign: "center",
    },
    btnSecondarySub: {
        fontSize: 11,
        textAlign: "center",
        marginTop: 2,
    },
    trustRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        paddingTop: 18,
        borderTopWidth: 1,
        width: "100%",
        position: "relative",
        zIndex: 30,
    },
    trustItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    trustItemText: {
        fontSize: 12,
        fontWeight: "700",
    },
    trustDot: {
        fontSize: 12,
    },
    mockupColumn: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 10,
    },
    mockupColumnDesktop: {
        flex: 0.85,
        maxWidth: 390,
    },
});
