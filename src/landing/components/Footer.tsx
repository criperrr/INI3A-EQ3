import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import { PolicyTab } from "./PolicyModal";

interface FooterProps {
    theme: SemanticTheme;
    onOpenPolicies: (tab?: PolicyTab) => void;
    onScrollToSection: (sectionId: string) => void;
    onOpenRepo: () => void;
}

export const Footer: React.FC<FooterProps> = ({
    theme,
    onOpenPolicies,
    onScrollToSection,
    onOpenRepo,
}) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    const logoSource = theme.isDark
        ? require("../assets/logo-darkmode.png")
        : require("../assets/logo-presco.png");

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.isDark ? "#06080B" : "#E8EDE2",
                    borderTopColor: theme.surface.borderSubtle,
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Top Section */}
                <View style={[styles.topRow, isDesktop && styles.topRowDesktop]}>
                    {/* Brand Column */}
                    <View style={styles.brandCol}>
                        <Image
                            source={logoSource}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.brandDesc, { color: theme.text.secondary }]}>
                            Economia Inteligente & Comparação Colaborativa. Democratizando o acesso à
                            informação de preços no comércio varejista local de forma transparente,
                            segura e aberta.
                        </Text>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
                            <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                                Sistemas Operacionais • Versão v1.3.3
                            </Text>
                        </View>
                    </View>

                    {/* Columns of Links */}
                    <View style={[styles.linksGrid, isDesktop && styles.linksGridDesktop]}>
                        {/* Col 1: Produto */}
                        <View style={styles.linkGroup}>
                            <Text style={[styles.groupTitle, { color: theme.text.primary }]}>
                                Produto
                            </Text>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onScrollToSection("features")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Recursos do App
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onScrollToSection("optimizer")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Otimizador Multilojas
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onScrollToSection("download")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Download APK
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onScrollToSection("faq")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Perguntas Frequentes
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Col 2: Proteção & Políticas */}
                        <View style={styles.linkGroup}>
                            <Text style={[styles.groupTitle, { color: theme.text.primary }]}>
                                Proteção & LGPD
                            </Text>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onOpenPolicies("terms")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Termos de Uso
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onOpenPolicies("privacy")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Privacidade & LGPD
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onOpenPolicies("guidelines")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Moderação Comunitária
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={() => onOpenPolicies("cookies")}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Armazenamento Local
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Col 3: Comunidade & Código */}
                        <View style={styles.linkGroup}>
                            <Text style={[styles.groupTitle, { color: theme.text.primary }]}>
                                Comunidade
                            </Text>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={onOpenRepo}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    GitHub Oficial
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={onOpenRepo}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Notas de Versão
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkItem}
                                onPress={onOpenRepo}
                            >
                                <Text style={[styles.linkText, { color: theme.text.secondary }]}>
                                    Reportar Anomalia
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Bottom Bar: Copyright & Compliance */}
                <View
                    style={[
                        styles.bottomRow,
                        { borderTopColor: theme.surface.borderSubtle },
                    ]}
                >
                    <Text style={[styles.copyText, { color: theme.text.secondary }]}>
                        © {new Date().getFullYear()} Presco. Todos os direitos reservados.
                        Conformidade com a Lei Federal nº 13.709/2018 (LGPD).
                    </Text>

                    <Text style={[styles.licenseText, { color: theme.text.secondary }]}>
                        Código-fonte aberto para a sociedade. Desenvolvido para máxima economia.
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingTop: 64,
        paddingBottom: 36,
        borderTopWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    topRow: {
        flexDirection: "column",
        gap: 40,
        marginBottom: 48,
    },
    topRowDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    brandCol: {
        maxWidth: 380,
    },
    logo: {
        width: 140,
        height: 40,
        marginBottom: 16,
    },
    brandDesc: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
    },
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    linksGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 32,
    },
    linksGridDesktop: {
        gap: 48,
    },
    linkGroup: {
        minWidth: 140,
        gap: 12,
    },
    groupTitle: {
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 0.2,
        marginBottom: 4,
    },
    linkItem: {
        paddingVertical: 2,
    },
    linkText: {
        fontSize: 14,
        fontWeight: "500",
    },
    bottomRow: {
        borderTopWidth: 1,
        paddingTop: 24,
        flexDirection: "column",
        gap: 8,
    },
    copyText: {
        fontSize: 13,
    },
    licenseText: {
        fontSize: 12,
    },
});
