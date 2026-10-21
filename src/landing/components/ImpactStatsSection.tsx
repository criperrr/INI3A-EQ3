import React from "react";
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgMoneyIcon,
    SvgMapPinIcon,
    SvgLeafIcon,
    SvgShieldIcon,
} from "./SvgIcons";

interface ImpactStatsSectionProps {
    theme: SemanticTheme;
}

export const ImpactStatsSection: React.FC<ImpactStatsSectionProps> = ({ theme }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const metrics = [
        {
            value: "R$ 38,70",
            label: "Economia Média Semanal",
            sub: "Calculada pelo otimizador já descontando o combustível",
            Icon: SvgMoneyIcon,
        },
        {
            value: "15 km",
            label: "Radar de Proximidade",
            sub: "Pesquisa em tempo real de supermercados e atacados",
            Icon: SvgMapPinIcon,
        },
        {
            value: "100%",
            label: "Livre & Aberto",
            sub: "Sem assinaturas, compras embutidas ou anúncios espiões",
            Icon: SvgLeafIcon,
        },
        {
            value: "2FA Ativo",
            label: "Proteção Anti-Fraude",
            sub: "Verificação segura por e-mail e moderação comunitária",
            Icon: SvgShieldIcon,
        },
    ];

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.isDark ? "#0D1E18" : "#F3EEE4",
                    borderTopColor: theme.surface.borderSubtle,
                    borderBottomColor: theme.surface.borderSubtle,
                },
            ]}
        >
            <View style={styles.inner}>
                <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                    {metrics.map((m, idx) => {
                        const { Icon } = m;
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
                                <View style={styles.cardTop}>
                                    <View style={styles.iconWrap}>
                                        <Icon size={22} color={theme.accent} />
                                    </View>
                                    <Text
                                        style={[
                                            styles.value,
                                            { color: theme.accent },
                                        ]}
                                    >
                                        {m.value}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.label,
                                        { color: theme.text.primary },
                                    ]}
                                >
                                    {m.label}
                                </Text>
                                <Text
                                    style={[
                                        styles.sub,
                                        { color: theme.text.secondary },
                                    ]}
                                >
                                    {m.sub}
                                </Text>
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
        paddingVertical: 48,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    grid: {
        flexDirection: "column",
        gap: 16,
    },
    gridDesktop: {
        flexDirection: "row",
    },
    card: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
    },
    cardDesktop: {
        minWidth: 0,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    iconWrap: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: "rgba(255, 183, 3, 0.1)",
    },
    value: {
        fontSize: 26,
        fontWeight: "900",
        letterSpacing: -0.6,
    },
    label: {
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 6,
    },
    sub: {
        fontSize: 13,
        lineHeight: 18,
    },
});
