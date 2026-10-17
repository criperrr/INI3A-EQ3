import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
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

    // Responsive mockup frame dimensions for the settings preview
    const previewWidth = isMobile
        ? Math.min(windowWidth - 72, 240)
        : 260;
    const previewHeight = Math.round(previewWidth * 1.84);

    const protectionPillars = [
        {
            code: "QUÓRUM",
            title: "Quórum Comunitário Anti-Fraude",
            desc: "Cada preço reportado passa por votação e validação de outros consumidores locais. Ocorrências suspeitas ou destoantes são marcadas e suspensas preventivamente pelo algoritmo de confiança.",
        },
        {
            code: "2FA",
            title: "2FA com Resend OTP",
            desc: "Autenticação em duas etapas via código criptográfico de uso único no seu email, blindando as edições de catálogo e ações de moderação contra robôs e invasores.",
        },
        {
            code: "GEO",
            title: "Geofencing & Rate Limiting Atômico",
            desc: "Validação espacial das coordenadas do supermercado via PostGIS aliada a cooldowns em memória no Redis, impedindo spam e manipulação coordenada de ofertas.",
        },
        {
            code: "LGPD",
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
                                fontSize: isDesktop ? 36 : 26,
                                lineHeight: isDesktop ? 44 : 32,
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
                                isMobile && styles.pillarCardMobile,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.pillarBadge,
                                    { backgroundColor: theme.accent + "18" },
                                ]}
                            >
                                <Text style={[styles.pillarBadgeText, { color: theme.accent }]}>
                                    {p.code}
                                </Text>
                            </View>
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

                {/* Policy Interactive Callout Banner with Authentic Settings Screenshot */}
                <View
                    style={[
                        styles.calloutCard,
                        isDesktop && styles.calloutCardDesktop,
                        isMobile && styles.calloutCardMobile,
                        {
                            backgroundColor: theme.surface.card,
                            borderColor: theme.accent + "40",
                        },
                    ]}
                >
                    <View style={[styles.calloutLeft, isDesktop && styles.calloutLeftDesktop]}>
                        <View
                            style={[
                                styles.calloutBadge,
                                { backgroundColor: theme.accent + "18" },
                            ]}
                        >
                            <Text style={[styles.calloutBadgeText, { color: theme.accent }]}>
                                PRIVACIDADE & SEGURANÇA VERIFICÁVEL
                            </Text>
                        </View>

                        <Text style={[styles.calloutTitle, { color: theme.text.primary }]}>
                            Central Oficial de Políticas & Governança
                        </Text>
                        <Text style={[styles.calloutText, { color: theme.text.secondary }]}>
                            Tudo o que defendemos está implementado no código. Consulte nossos termos de uso,
                            diretrizes de tratamento de dados sob a LGPD (Lei 13.709/2018), auditoria comunitária
                            e políticas de armazenamento local.
                        </Text>

                        <View style={styles.complianceChecks}>
                            <Text style={[styles.checkItem, { color: theme.text.primary }]}>
                                • Autenticação em Duas Etapas (2FA) nativa com código descartável
                            </Text>
                            <Text style={[styles.checkItem, { color: theme.text.primary }]}>
                                • Opção de perfil anônimo e exclusão definitiva de dados em 1 toque
                            </Text>
                            <Text style={[styles.checkItem, { color: theme.text.primary }]}>
                                • Zero rastreamento publicitário ou comercialização de relatórios
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

                    {/* Screenshot Frame of App Settings with Dynamic Scaled Sizing */}
                    <View style={styles.calloutRight}>
                        <View
                            style={[
                                styles.settingsPreviewFrame,
                                {
                                    width: previewWidth,
                                    height: previewHeight,
                                    borderRadius: Math.round(previewWidth * 0.12),
                                    borderColor: theme.accent + "50",
                                    backgroundColor: "#05070A",
                                },
                            ]}
                        >
                            <Image
                                source={require("../assets/prints/print-settings.jpg")}
                                style={styles.settingsPreviewImage}
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 56,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 760,
        marginHorizontal: "auto",
        marginBottom: 40,
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
        fontSize: 15,
        lineHeight: 23,
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
        rowGap: 24,
    },
    pillarCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        width: "100%",
    },
    pillarCardDesktop: {
        width: "48.5%",
    },
    pillarCardMobile: {
        padding: 18,
    },
    pillarBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 12,
    },
    pillarBadgeText: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    pillarTitle: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    pillarDesc: {
        fontSize: 14,
        lineHeight: 21,
    },
    calloutCard: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 28,
        flexDirection: "column",
        gap: 24,
        alignItems: "center",
    },
    calloutCardDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 40,
    },
    calloutCardMobile: {
        padding: 20,
    },
    calloutLeft: {
        width: "100%",
    },
    calloutLeftDesktop: {
        width: "58%",
    },
    calloutBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    calloutBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    calloutTitle: {
        fontSize: 22,
        fontWeight: "900",
        marginBottom: 8,
        letterSpacing: -0.4,
    },
    calloutText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    complianceChecks: {
        gap: 8,
        marginBottom: 24,
    },
    checkItem: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: "600",
    },
    calloutActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    calloutRight: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    settingsPreviewFrame: {
        borderWidth: 3,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 12,
        alignSelf: "center",
    },
    settingsPreviewImage: {
        width: "100%",
        height: "100%",
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
