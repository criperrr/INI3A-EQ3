import React, { useState, useEffect } from "react";
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

    const isDesktop = windowWidth >= 960;
    const isTablet = windowWidth >= 640 && windowWidth < 960;

    const metrics = [
        {
            value: "R$ 38,70",
            badge: "LÍQUIDO",
            label: "Economia Média Semanal",
            sub: "Calculada pelo otimizador já descontando o combustível",
        },
        {
            value: "15 km",
            badge: "POSTGIS",
            label: "Radar Espacial Geodésico",
            sub: "Pesquisa em tempo real de supermercados e atacados",
        },
        {
            value: "100%",
            badge: "ABERTO",
            label: "Livre & Independente",
            sub: "Sem assinaturas, compras embutidas ou anúncios espiões",
        },
        {
            value: "2FA Ativo",
            badge: "AUDITADO",
            label: "Quórum Anti-Fraude",
            sub: "Validação criptográfica via Resend e auditoria comunitária",
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
                <View
                    style={[
                        styles.grid,
                        isTablet && styles.gridTablet,
                        isDesktop && styles.gridDesktop,
                    ]}
                >
                    {metrics.map((m, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.card,
                                isTablet && styles.cardTablet,
                                isDesktop && styles.cardDesktop,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <View style={styles.cardTop}>
                                <Text
                                    style={[
                                        styles.value,
                                        { color: theme.accent },
                                    ]}
                                >
                                    {m.value}
                                </Text>
                                <View
                                    style={[
                                        styles.badgeBox,
                                        { backgroundColor: theme.accent + "18" },
                                    ]}
                                >
                                    <Text style={[styles.badgeText, { color: theme.accent }]}>
                                        {m.badge}
                                    </Text>
                                </View>
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
        paddingVertical: 40,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
    },
    grid: {
        flexDirection: "column",
        gap: 16,
    },
    gridTablet: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    gridDesktop: {
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
    },
    card: {
        padding: 22,
        borderRadius: 20,
        borderWidth: 1,
        width: "100%",
    },
    cardTablet: {
        width: "48%",
    },
    cardDesktop: {
        width: "23.5%",
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    badgeBox: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    sub: {
        fontSize: 12,
        lineHeight: 17,
    },
});

