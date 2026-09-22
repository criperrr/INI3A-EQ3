import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface SecurityProtectionSectionProps {
    theme: SemanticTheme;
    onOpenPolicies: (tab?: "terms" | "privacy" | "guidelines" | "cookies") => void;
}

export const SecurityProtectionSection: React.FC<SecurityProtectionSectionProps> = ({
    theme,
    onOpenPolicies,
}) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    const protectionPillars = [
        {
            icon: "🛡️",
            title: "Quórum Comunitário Anti-Fraude",
            desc: "Cada preço reportado passa por votação e validação de outros consumidores locais. Ocorrências suspeitas ou destoantes são marcadas e suspensas preventivamente pelo algoritmo de confiança.",
        },
        {
            icon: "🔐",
            title: "2FA com Resend OTP",
            desc: "Autenticação em duas etapas via código criptográfico de uso único no seu email, blindando as edições de catálogo e ações de moderação contra robôs e invasores.",
        },
        {
            icon: "📍",
            title: "Geofencing & Rate Limiting Atômico",
            desc: "Validação espacial das coordenadas do supermercado via PostGIS aliada a cooldowns em memória no Redis, impedindo spam e manipulação coordenada de ofertas.",
        },
        {
            icon: "⚖️",
            title: "Conformidade Rígida com a LGPD",
            desc: "Total respeito à Lei 13.709/2018. Permissões de GPS e câmera sob demanda, sem rastreamento de anúncios de terceiros e com direito à exclusão definitiva da conta com 1 toque.",
        },
    ];

    return (
        <View
            nativeID="protection"
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
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                borderColor: theme.accent + "50",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                            SISTEMA DE PROTEÇÃO & TRANSPARÊNCIA
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
                        Confiabilidade feita para{" "}
                        <Text style={{ color: theme.accent }}>proteger você e o seu bolso</Text>
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        O Presco implementa políticas rígidas de cibersegurança, governança descentralizada
                        e proteção de dados para assegurar que cada centavo economizado venha de fontes legítimas.
                    </Text>
                </View>

                {/* 4 Pillars Grid */}
                <View style={[styles.pillarsGrid, isDesktop && styles.pillarsGridDesktop]}>
                    {protectionPillars.map((p, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.pillarCard,
                                isDesktop && styles.pillarCardDesktop,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <Text style={styles.pillarIcon}>{p.icon}</Text>
                            <Text
                                style={[
                                    styles.pillarTitle,
                                    { color: theme.text.primary },
                                ]}
                            >
                                {p.title}
                            </Text>
                            <Text
                                style={[
                                    styles.pillarDesc,
                                    { color: theme.text.secondary },
                                ]}
                            >
                                {p.desc}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Policy Interactive Callout Banner */}
                <View
                    style={[
                        styles.calloutCard,
                        {
                            backgroundColor: theme.surface.card,
                            borderColor: theme.accent + "40",
                        },
                    ]}
                >
                    <View style={styles.calloutLeft}>
                        <Text style={[styles.calloutTitle, { color: theme.text.primary }]}>
                            Central Oficial de Políticas & Governança
                        </Text>
                        <Text style={[styles.calloutText, { color: theme.text.secondary }]}>
                            Acesse os documentos completos sobre nossos termos de uso, tratamento de dados
                            pessoais sob a LGPD, diretrizes de conduta e armazenamento local.
                        </Text>
                    </View>

                    <View style={styles.calloutActions}>
                        <TouchableOpacity
                            style={[styles.policyBtn, { borderColor: theme.surface.border }]}
                            onPress={() => onOpenPolicies("terms")}
                        >
                            <Text style={[styles.policyBtnText, { color: theme.text.primary }]}>
                                Termos de Uso
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.policyBtn,
                                {
                                    backgroundColor: theme.accent,
                                    borderColor: theme.accent,
                                },
                            ]}
                            onPress={() => onOpenPolicies("privacy")}
                        >
                            <Text style={[styles.policyBtnText, { color: "#030712", fontWeight: "800" }]}>
                                Privacidade & LGPD
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.policyBtn, { borderColor: theme.surface.border }]}
                            onPress={() => onOpenPolicies("guidelines")}
                        >
                            <Text style={[styles.policyBtnText, { color: theme.text.primary }]}>
                                Moderação de Preços
                            </Text>
                        </TouchableOpacity>
                    </View>
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
        maxWidth: 760,
        marginHorizontal: "auto",
        marginBottom: 48,
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
        marginBottom: 16,
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
    },
    pillarsGrid: {
        flexDirection: "column",
        gap: 20,
        marginBottom: 40,
    },
    pillarsGridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    pillarCard: {
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        width: "100%",
    },
    pillarCardDesktop: {
        width: "48.5%",
    },
    pillarIcon: {
        fontSize: 32,
        marginBottom: 14,
    },
    pillarTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    pillarDesc: {
        fontSize: 14,
        lineHeight: 22,
    },
    calloutCard: {
        padding: 28,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: "column",
        gap: 20,
    },
    calloutLeft: {
        maxWidth: 700,
    },
    calloutTitle: {
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 8,
    },
    calloutText: {
        fontSize: 14,
        lineHeight: 22,
    },
    calloutActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    policyBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1,
    },
    policyBtnText: {
        fontSize: 13,
        fontWeight: "700",
    },
});
