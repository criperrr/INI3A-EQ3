import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import { PhoneMockup } from "./PhoneMockup";

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
    const { width } = Dimensions.get("window");
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

            <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
                {/* Left Column: Text & Actions */}
                <View style={[styles.textContent, isDesktop && styles.textContentDesktop]}>
                    {/* ClickUp-style Header Pill Badge */}
                    <View
                        style={[
                            styles.badgeRow,
                            {
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "50",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                            ✨ O APLICATIVO INTELIGENTE QUE SUBSTITUI A DÚVIDA NO MERCADO
                        </Text>
                    </View>

                    {/* Main Headline */}
                    <Text
                        style={[
                            styles.headline,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 52 : 36,
                                lineHeight: isDesktop ? 60 : 44,
                            },
                        ]}
                    >
                        Economize nas compras da semana com a{" "}
                        <Text style={{ color: theme.accent }}>
                            força da sua comunidade.
                        </Text>
                    </Text>

                    {/* Subtitle */}
                    <Text
                        style={[
                            styles.subtitle,
                            {
                                color: theme.text.secondary,
                                fontSize: isDesktop ? 18 : 16,
                                lineHeight: isDesktop ? 28 : 24,
                            },
                        ]}
                    >
                        Chega de ser surpreendido no caixa. O Presco combina leitor óptico de gôndola,
                        cotações em tempo real e um motor de rota veicular que desconta o combustível para
                        garantir economia líquida no seu bolso.
                    </Text>

                    {/* CTA Actions */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[
                                styles.btnPrimary,
                                {
                                    backgroundColor: theme.accent,
                                },
                            ]}
                            activeOpacity={0.85}
                            onPress={onDownload}
                        >
                            <Text style={styles.btnPrimaryText}>Baixar APK Gratuito</Text>
                            <Text style={styles.btnPrimarySub}>Android 8.0+ • v1.3.5 Oficial</Text>
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
                            <Text style={[styles.btnSecondaryText, { color: theme.text.primary }]}>
                                Como Funciona? ➔
                            </Text>
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

                    {/* Social Proof & Trust Strip */}
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
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                🛡️ 100% Seguro & LGPD
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.trustDot, { color: theme.text.secondary }]}>•</Text>

                        <View style={styles.trustItem}>
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                📍 Radar PostGIS 15km
                            </Text>
                        </View>

                        <Text style={[styles.trustDot, { color: theme.text.secondary }]}>•</Text>

                        <View style={styles.trustItem}>
                            <Text style={[styles.trustItemText, { color: theme.text.secondary }]}>
                                ⚡ Código Aberto & Livre
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
        paddingHorizontal: 24,
        flexDirection: "column",
        alignItems: "center",
        gap: 48,
    },
    innerDesktop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
    },
    textContent: {
        width: "100%",
        alignItems: "flex-start",
    },
    textContentDesktop: {
        flex: 1,
        maxWidth: 620,
    },
    badgeRow: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    headline: {
        fontWeight: "900",
        letterSpacing: -1.2,
        marginBottom: 20,
    },
    subtitle: {
        fontWeight: "400",
        letterSpacing: -0.2,
        marginBottom: 32,
    },
    actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 32,
        width: "100%",
    },
    btnPrimary: {
        paddingVertical: 14,
        paddingHorizontal: 28,
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
        paddingHorizontal: 22,
        borderRadius: 14,
        borderWidth: 1,
        minWidth: 180,
    },
    btnSecondaryText: {
        fontSize: 14,
        fontWeight: "800",
        textAlign: "center",
    },
    btnSecondarySub: {
        fontSize: 11,
        fontWeight: "500",
        textAlign: "center",
        marginTop: 2,
    },
    trustRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        width: "100%",
    },
    trustItem: {},
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
    },
    mockupColumnDesktop: {
        flex: 1,
        maxWidth: 460,
    },
});
