import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface FeaturesSectionProps {
    theme: SemanticTheme;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ theme }) => {
    const [windowWidth, setWindowWidth] = useState(Dimensions.get("window").width);

    useEffect(() => {
        const onChange = ({ window }: { window: { width: number } }) => {
            setWindowWidth(window.width);
        };
        const sub = Dimensions.addEventListener("change", onChange);
        return () => {
            // @ts-ignore
            if (sub?.remove) sub.remove();
        };
    }, []);

    const isDesktop = windowWidth >= 860;
    const isMobile = windowWidth < 480;

    const features = [
        {
            code: "EAN",
            tag: "SCANNER EAN-13",
            title: "Leitor de Gôndola com OpenFoodFacts",
            desc: "Aponte a câmera para o código de barras no supermercado. O Presco identifica instantaneamente o produto, fotos oficiais e dados nutricionais em milissegundos.",
            highlight: "+15 XP por preço • +25 XP novo produto",
        },
        {
            code: "ROTA",
            tag: "OTIMIZADOR MULTILOJAS",
            title: "Cálculo de Rota, Tempo e Combustível",
            desc: "Vale a pena ir a dois mercados? Nosso motor matemático analisa os preços e desconta o gasto da gasolina (km/L) e o tempo de trânsito para garantir economia líquida real.",
            highlight: "Economia Líquida: Preço Menor - Custo de Viagem",
        },
        {
            code: "GPS",
            tag: "MOTOR ESPACIAL",
            title: "Radar Geográfico PostGIS (15 km)",
            desc: "Descubra atacadões, hipermercados e quitandas locais no raio de proximidade configurável. Rotas integradas com 1 toque no Waze, Google Maps e Apple Maps.",
            highlight: "Precisão PostGIS com PostgreSQL",
        },
        {
            code: "RANK",
            tag: "GAMIFICAÇÃO & HONRA",
            title: "Níveis, Medalhas e Loja de Cosméticos",
            desc: "Contribua com a economia da sua comunidade e ganhe pontos, títulos de autoridade na plataforma e personalize seu perfil com molduras e temas exclusivos.",
            highlight: "100% Mérito Comunitário • Sem Pay-to-Win",
        },
    ];

    return (
        <View
            nativeID="features"
            style={[
                styles.container,
                {
                    backgroundColor: theme.isDark ? "#0A0D12" : "#F0F4EC",
                    borderTopColor: theme.surface.borderSubtle,
                    borderBottomColor: theme.surface.borderSubtle,
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Section Header */}
                <View style={styles.headerArea}>
                    <View
                        style={[
                            styles.sectionTag,
                            {
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "40",
                            },
                        ]}
                    >
                        <Text style={[styles.sectionTagText, { color: theme.accent }]}>
                            ARQUITETURA & EXPERIÊNCIA
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.sectionTitle,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 26,
                                lineHeight: isDesktop ? 44 : 32,
                            },
                        ]}
                    >
                        Tudo o que você precisa para{" "}
                        <Text style={{ color: theme.accent }}>nunca mais pagar caro</Text>
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
                        Concebido com padrões modernos de computação móvel, geoprocessamento e inteligência colaborativa.
                    </Text>
                </View>

                {/* Features Grid */}
                <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                    {features.map((feat, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.featureCard,
                                isDesktop && styles.featureCardDesktop,
                                isMobile && styles.featureCardMobile,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <View style={styles.cardTopRow}>
                                <View
                                    style={[
                                        styles.iconBox,
                                        { backgroundColor: theme.accent + "18" },
                                    ]}
                                >
                                    <Text style={[styles.iconText, { color: theme.accent }]}>
                                        {feat.code}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.tagBadge,
                                        {
                                            backgroundColor: theme.isDark
                                                ? "#1F2937"
                                                : "#E5E7EB",
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tagBadgeText,
                                            { color: theme.text.secondary },
                                        ]}
                                    >
                                        {feat.tag}
                                    </Text>
                                </View>
                            </View>

                            <Text
                                style={[
                                    styles.cardTitle,
                                    { color: theme.text.primary },
                                ]}
                            >
                                {feat.title}
                            </Text>

                            <Text
                                style={[
                                    styles.cardDesc,
                                    { color: theme.text.secondary },
                                ]}
                            >
                                {feat.desc}
                            </Text>

                            <View
                                style={[
                                    styles.cardFooter,
                                    {
                                        borderTopColor: theme.surface.borderSubtle,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.highlightText,
                                        { color: theme.accent },
                                    ]}
                                >
                                    {feat.highlight}
                                </Text>
                            </View>
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
        paddingVertical: 56,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 700,
        marginHorizontal: "auto",
        marginBottom: 40,
    },
    sectionTag: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionTagText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    sectionTitle: {
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 14,
        letterSpacing: -0.8,
    },
    sectionSubtitle: {
        fontSize: 15,
        lineHeight: 23,
        textAlign: "center",
    },
    grid: {
        flexDirection: "column",
        gap: 20,
    },
    gridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 24,
    },
    featureCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        width: "100%",
    },
    featureCardDesktop: {
        width: "48.5%",
    },
    featureCardMobile: {
        padding: 18,
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    iconBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    iconText: {
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagBadgeText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: "800",
        letterSpacing: -0.4,
        marginBottom: 10,
    },
    cardDesc: {
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 16,
    },
    cardFooter: {
        borderTopWidth: 1,
        paddingTop: 14,
    },
    highlightText: {
        fontSize: 12,
        fontWeight: "700",
    },
});

