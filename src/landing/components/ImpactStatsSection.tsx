import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface ImpactStatsSectionProps {
    theme: SemanticTheme;
}

export const ImpactStatsSection: React.FC<ImpactStatsSectionProps> = ({ theme }) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    const metrics = [
        {
            value: "R$ 38,70",
            label: "Economia Média Semanal",
            sub: "Calculada pelo otimizador já descontando o combustível",
            icon: "💰",
        },
        {
            value: "15 km",
            label: "Radar Espacial PostGIS",
            sub: "Pesquisa em tempo real de supermercados e atacados",
            icon: "📍",
        },
        {
            value: "100%",
            label: "Livre & Aberto",
            sub: "Sem assinaturas, compras embutidas ou anúncios espiões",
            icon: "🌱",
        },
        {
            value: "2FA Ativo",
            label: "Quórum Anti-Fraude",
            sub: "Validação criptográfica via Resend e auditoria comunitária",
            icon: "🛡️",
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
                    {metrics.map((m, idx) => (
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
                                <Text style={styles.icon}>{m.icon}</Text>
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
                    ))}
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
        justifyContent: "space-between",
    },
    card: {
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        width: "100%",
    },
    cardDesktop: {
        width: "23.5%",
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    icon: {
        fontSize: 24,
    },
    value: {
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    sub: {
        fontSize: 12,
        lineHeight: 16,
    },
});
