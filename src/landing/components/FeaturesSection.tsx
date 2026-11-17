import React from "react";
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgCarIcon,
    SvgCameraIcon,
    SvgShieldIcon,
    SvgLeafIcon,
    SvgSparkleIcon,
} from "./SvgIcons";

interface FeaturesSectionProps {
    theme: SemanticTheme;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ theme }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const features = [
        {
            Icon: SvgCarIcon,
            tag: "ECONOMIA LÍQUIDA REAL",
            title: "Desconto Real no Bolso (Descontando a Gasolina)",
            desc: "O motor matemático avalia sua lista inteira e só sugere ir a dois supermercados se a diferença de preço cobrir com folga o combustível gasto (km/L) e o tempo de trânsito.",
            highlight: "Economia Líquida = Preço Menor - Custo de Deslocamento",
        },
        {
            Icon: SvgCameraIcon,
            tag: "SCANNER ÓPTICO INSTANTÂNEO",
            title: "Preço Real na Gôndola em Menos de 1 Segundo",
            desc: "Aponte a câmera para o código de barras EAN-13 no corredor do mercado. O Presco identifica o item, compara com lojas vizinhas e mostra o histórico de variação na hora.",
            highlight: "+15 XP por preço confirmado • Base OpenFoodFacts",
        },
        {
            Icon: SvgShieldIcon,
            tag: "QUÓRUM ANTI-FRAUDE",
            title: "Comunidade Auditada sem Fake News de Preço",
            desc: "Algoritmo estatístico de proteção com detecção inteligente de anomalias e validação comunitária em tempo real impedem que preços errados ou abusivos enganem você.",
            highlight: "Quórum Ativo • Bloqueio de Outliers e Preços Falsos",
        },
        {
            Icon: SvgLeafIcon,
            tag: "PRIVACIDADE RADICAL",
            title: "100% Gratuito, Sem Anúncios e sem Venda de Dados",
            desc: "O Presco não vende seu histórico para redes varejistas nem exibe banners invasivos. Aplicativo de utilidade pública, transparente e de código aberto para sempre.",
            highlight: "Zero Anúncios • Sem Cartão de Crédito • Totalmente Livre",
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
                            BENEFÍCIOS REAIS • ECONOMIA NO SEU BOLSO
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.sectionTitle,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 28,
                                lineHeight: isDesktop ? 44 : 34,
                            },
                        ]}
                    >
                        Tudo o que você precisa para{" "}
                        <Text style={{ color: theme.accent }}>nunca mais pagar caro</Text>
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
                        Desenvolvido com localização inteligente por proximidade, leitor instantâneo de código de barras e cálculo real de economia no bolso.
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
                                    <feat.Icon size={20} color={theme.accent} />
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
                                <View style={styles.highlightRow}>
                                    <SvgSparkleIcon size={13} color={theme.accent} />
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
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    headerArea: {
        alignItems: "center",
        textAlign: "center",
        maxWidth: 700,
        marginHorizontal: "auto",
        marginBottom: 56,
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
        marginBottom: 16,
        letterSpacing: -0.8,
    },
    sectionSubtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
    },
    grid: {
        flexDirection: "column",
        gap: 24,
    },
    gridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    featureCard: {
        padding: 28,
        borderRadius: 24,
        borderWidth: 1,
        width: "100%",
    },
    featureCardDesktop: {
        width: "48.5%",
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    iconText: {
        fontSize: 24,
    },
    tagBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagBadgeText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.4,
        marginBottom: 12,
    },
    cardDesc: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    cardFooter: {
        borderTopWidth: 1,
        paddingTop: 16,
    },
    highlightRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    highlightText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
