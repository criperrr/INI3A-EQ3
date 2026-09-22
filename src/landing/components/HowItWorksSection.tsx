import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface HowItWorksSectionProps {
    theme: SemanticTheme;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ theme }) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    const steps = [
        {
            stepNumber: "01",
            icon: "📍",
            title: "Descubra no Radar 15km",
            desc: "Abra o app e consulte supermercados, atacados e feiras na sua região. O Presco mapeia as menores cotações registradas pela própria comunidade local.",
            tag: "GEOPROCESSAMENTO POSTGIS",
        },
        {
            stepNumber: "02",
            icon: "📸",
            title: "Aponte na Gôndola",
            desc: "Escaneie o código de barras EAN-13 direto pela câmera. O Presco sincroniza com o OpenFoodFacts, valida o histórico e premia você com XP no ranking comunitário.",
            tag: "SCANNER ÓPTICO INSTANTÂNEO",
        },
        {
            stepNumber: "03",
            icon: "🚗",
            title: "Economize no Caixa & na Gasolina",
            desc: "O motor matemático calcula a rota ideal e só sugere dividir a lista de compras se o desconto total cobrir com folga o combustível gasto no trajeto.",
            tag: "OTIMIZADOR MULTILOJAS",
        },
    ];

    return (
        <View
            nativeID="how-it-works"
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.background,
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Header */}
                <View style={styles.headerArea}>
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "50",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                            JORNADA DO CONSUMIDOR INTELIGENTE
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 28,
                                lineHeight: isDesktop ? 44 : 34,
                            },
                        ]}
                    >
                        Como o Presco funciona no dia a dia
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        Três passos simples que devolvem o controle do seu orçamento familiar e
                        combatem preços inflacionados no carrinho de supermercado.
                    </Text>
                </View>

                {/* 3 Step Cards */}
                <View style={[styles.stepsRow, isDesktop && styles.stepsRowDesktop]}>
                    {steps.map((s, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.stepCard,
                                isDesktop && styles.stepCardDesktop,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View
                                    style={[
                                        styles.stepNumCircle,
                                        { backgroundColor: theme.accent },
                                    ]}
                                >
                                    <Text style={styles.stepNumText}>{s.stepNumber}</Text>
                                </View>
                                <Text style={styles.stepIcon}>{s.icon}</Text>
                            </View>

                            <View
                                style={[
                                    styles.tagPill,
                                    { backgroundColor: theme.accent + "18" },
                                ]}
                            >
                                <Text style={[styles.tagPillText, { color: theme.accent }]}>
                                    {s.tag}
                                </Text>
                            </View>

                            <Text
                                style={[
                                    styles.stepTitle,
                                    { color: theme.text.primary },
                                ]}
                            >
                                {s.title}
                            </Text>

                            <Text
                                style={[
                                    styles.stepDesc,
                                    { color: theme.text.secondary },
                                ]}
                            >
                                {s.desc}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 72,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 720,
        marginHorizontal: "auto",
        marginBottom: 56,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    title: {
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 14,
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
    },
    stepsRow: {
        flexDirection: "column",
        gap: 24,
    },
    stepsRowDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    stepCard: {
        padding: 32,
        borderRadius: 28,
        borderWidth: 1,
        width: "100%",
        position: "relative",
    },
    stepCardDesktop: {
        width: "31.5%",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    stepNumCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
    },
    stepNumText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
    stepIcon: {
        fontSize: 28,
    },
    tagPill: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 12,
    },
    tagPillText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    stepDesc: {
        fontSize: 14,
        lineHeight: 22,
    },
});
