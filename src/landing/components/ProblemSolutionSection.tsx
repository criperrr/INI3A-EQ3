import React from "react";
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgCloseIcon,
    SvgCheckIcon,
    SvgTagIcon,
    SvgShieldIcon,
    SvgCarIcon,
} from "./SvgIcons";

interface ProblemSolutionSectionProps {
    theme: SemanticTheme;
}

export const ProblemSolutionSection: React.FC<ProblemSolutionSectionProps> = ({ theme }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const contrasts = [
        {
            painTitle: "Variação Oculta de até 45%",
            painDesc: "O mesmo arroz, leite ou sabão em pó custa até R$ 12 a mais entre dois supermercados do mesmo bairro sem você saber.",
            solutionTitle: "Transparência Instantânea na Gôndola",
            solutionDesc: "Bipe o código de barras no corredor e veja na hora o menor preço registrado na sua região em segundos.",
            Icon: SvgTagIcon,
        },
        {
            painTitle: "A Pegadinha das 'Ofertas'",
            painDesc: "Encartes promocionais e anúncios enganosos fazem você gastar tempo e combustível para descobrir que o preço subiu.",
            solutionTitle: "Cotações Auditadas em Tempo Real",
            solutionDesc: "Preços reportados por vizinhos reais com algoritmo estatístico que barra valores anômalos e fake news.",
            Icon: SvgShieldIcon,
        },
        {
            painTitle: "Economia que Vira Gasto no Tanque",
            painDesc: "Rodar a cidade atrás de desconto e gastar R$ 25 de gasolina para economizar R$ 15 em compras é prejuízo líquido.",
            solutionTitle: "Otimizador com Custo de Combustível",
            solutionDesc: "O Presco só recomenda dividir sua lista em 2 mercados se o desconto cobrir com folga a gasolina gasta por km.",
            Icon: SvgCarIcon,
        },
    ];

    return (
        <View
            nativeID="problem-solution"
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.background,
                    borderTopColor: theme.surface.borderSubtle,
                    borderBottomColor: theme.surface.borderSubtle,
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
                            POR QUE CRIAMOS O PRESCO
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 26,
                                lineHeight: isDesktop ? 44 : 32,
                            },
                        ]}
                    >
                        Fazer compras no supermercado{" "}
                        <Text style={{ color: "#EF4444" }}>não precisa ser um tiro no escuro</Text>
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        A inflação e a falta de transparência sobrecarregam o orçamento familiar.
                        Veja a diferença entre fazer compras no escuro e usar o Presco.
                    </Text>
                </View>

                {/* Contrast Grid */}
                <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                    {contrasts.map((c, idx) => {
                        const { Icon } = c;
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.card,
                                    isDesktop && styles.cardDesktop,
                                    {
                                        backgroundColor: theme.surface.card,
                                        borderColor: theme.surface.border,
                                    },
                                ]}
                            >
                                {/* Problem Side */}
                                <View style={[styles.painBox, { backgroundColor: theme.isDark ? "rgba(239, 68, 68, 0.08)" : "#FEF2F2" }]}>
                                    <View style={styles.boxHeader}>
                                        <View style={styles.badgeLabelRow}>
                                            <SvgCloseIcon size={11} color="#EF4444" />
                                            <Text style={styles.boxBadgePain}>O VELHO JEITO</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.painTitle, { color: theme.isDark ? "#FCA5A5" : "#991B1B" }]}>
                                        {c.painTitle}
                                    </Text>
                                    <Text style={[styles.boxDesc, { color: theme.isDark ? "#D1D5DB" : "#4B5563" }]}>
                                        {c.painDesc}
                                    </Text>
                                </View>

                                {/* Divider with SVG Icon */}
                                <View style={styles.dividerRow}>
                                    <View style={[styles.dividerLine, { backgroundColor: theme.surface.borderSubtle }]} />
                                    <View style={[styles.iconPill, { backgroundColor: theme.surface.card, borderColor: theme.accent + "60" }]}>
                                        <Icon size={16} color={theme.accent} />
                                    </View>
                                    <View style={[styles.dividerLine, { backgroundColor: theme.surface.borderSubtle }]} />
                                </View>

                                {/* Solution Side */}
                                <View style={[styles.solutionBox, { backgroundColor: theme.isDark ? "rgba(16, 185, 129, 0.08)" : "#ECFDF5" }]}>
                                    <View style={styles.boxHeader}>
                                        <View style={styles.badgeLabelRow}>
                                            <SvgCheckIcon size={11} color={theme.accent} />
                                            <Text style={[styles.boxBadgeSolution, { color: theme.accent }]}>COM O PRESCO</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.solutionTitle, { color: theme.isDark ? "#6EE7B7" : "#065F46" }]}>
                                        {c.solutionTitle}
                                    </Text>
                                    <Text style={[styles.boxDesc, { color: theme.isDark ? "#D1D5DB" : "#4B5563" }]}>
                                        {c.solutionDesc}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 64,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        paddingHorizontal: 20,
        width: "100%",
    },
    headerArea: {
        alignItems: "center",
        textAlign: "center" as any,
        marginBottom: 44,
    },
    badge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.2,
    },
    title: {
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 14,
        maxWidth: 800,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
        maxWidth: 680,
    },
    grid: {
        flexDirection: "column",
        gap: 20,
    },
    gridDesktop: {
        flexDirection: "row",
    },
    card: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        overflow: "hidden",
    },
    cardDesktop: {
        minWidth: 0,
    },
    painBox: {
        borderRadius: 12,
        padding: 16,
    },
    solutionBox: {
        borderRadius: 12,
        padding: 16,
    },
    boxHeader: {
        marginBottom: 8,
    },
    badgeLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    boxBadgePain: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.8,
        color: "#EF4444",
    },
    boxBadgeSolution: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    painTitle: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 6,
        lineHeight: 20,
    },
    solutionTitle: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 6,
        lineHeight: 20,
    },
    boxDesc: {
        fontSize: 13,
        lineHeight: 19,
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    iconPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        marginHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});
