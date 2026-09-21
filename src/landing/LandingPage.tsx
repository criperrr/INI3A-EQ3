import React from "react";
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Dimensions,
} from "react-native";
import { themeColors as colors, themeTypography as typography } from "./theme";

const { width } = Dimensions.get("window");
const isDesktop = width > 768;

export const LandingPage: React.FC = () => {
    const handleDownloadAppStore = () => Linking.openURL("https://apps.apple.com/");
    const handleDownloadPlayStore = () => Linking.openURL("https://play.google.com/store");
    const handleDownloadAPK = () => Linking.openURL("https://seu-dominio.com/app.apk");

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.surface.background }]}>
            {/* HEADER */}
            <View style={[styles.header, { backgroundColor: colors.surface.header, borderBottomColor: colors.border.header }]}>
                <Text style={[styles.brandText, { color: colors.text.accent }]}>MeuApp</Text>
                <TouchableOpacity style={[styles.btnHeader, { backgroundColor: colors.text.accent }]} onPress={handleDownloadPlayStore}>
                    <Text style={[styles.btnTextHeader, { color: colors.text.inverse }]}>Baixar App</Text>
                </TouchableOpacity>
            </View>

            {/* HERO SECTION */}
            <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
                <View style={styles.heroTextContent}>
                    <View style={[styles.badge, { backgroundColor: colors.surface.highlight }]}>
                        <Text style={[styles.badgeText, { color: colors.text.accent }]}>VERSÃO MOBILE</Text>
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
                        Gerencie tudo na palma da sua mão
                    </Text>
                    <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                        Baixe o aplicativo oficial e tenha acesso rápido e seguro a todas as funcionalidades do projeto.
                    </Text>

                    <View style={styles.actionGroup}>
                        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.text.accent }]} onPress={handleDownloadPlayStore}>
                            <Text style={[styles.btnPrimaryText, { color: colors.text.inverse }]}>Google Play</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]} onPress={handleDownloadAppStore}>
                            <Text style={[styles.btnSecondaryText, { color: colors.text.primary }]}>App Store</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleDownloadAPK} style={styles.apkLink}>
                        <Text style={[styles.apkLinkText, { color: colors.text.accent }]}>Download direto via APK</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.heroImageWrapper}>
                    <View style={[styles.previewCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
                        <Text style={{ color: colors.text.tertiary }}>[ Visualização do App ]</Text>
                    </View>
                </View>
            </View>

            {/* FOOTER */}
            <View style={[styles.footer, { backgroundColor: colors.surface.footer, borderTopColor: colors.border.divider }]}>
                <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
                    © {new Date().getFullYear()} MeuApp. Todos os direitos reservados.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 64,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
    },
    brandText: {
        fontSize: typography.productTitle.fontSize,
        fontWeight: typography.productTitle.fontWeight,
    },
    btnHeader: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    btnTextHeader: {
        fontSize: typography.caption.fontSize,
        fontWeight: typography.button.fontWeight,
    },
    hero: {
        padding: 24,
        alignItems: "center",
    },
    heroDesktop: {
        flexDirection: "row",
        paddingVertical: 64,
        paddingHorizontal: 64,
        justifyContent: "space-between",
    },
    heroTextContent: {
        flex: 1,
        maxWidth: 520,
        marginBottom: 32,
    },
    badge: {
        alignSelf: "flex-start",
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 9999,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: typography.badge.fontSize,
        fontWeight: typography.badge.fontWeight,
        letterSpacing: typography.badge.letterSpacing,
    },
    heroTitle: {
        fontSize: typography.hero.fontSize,
        fontWeight: typography.hero.fontWeight,
        lineHeight: typography.hero.lineHeight,
        letterSpacing: typography.hero.letterSpacing,
        marginBottom: 16,
    },
    heroSubtitle: {
        fontSize: typography.subtitle.fontSize,
        lineHeight: typography.subtitle.lineHeight,
        marginBottom: 24,
    },
    actionGroup: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    btnPrimary: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
    },
    btnPrimaryText: {
        fontSize: typography.button.fontSize,
        fontWeight: typography.button.fontWeight,
    },
    btnSecondary: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
        borderWidth: 1,
    },
    btnSecondaryText: {
        fontSize: typography.button.fontSize,
        fontWeight: typography.button.fontWeight,
    },
    apkLink: {
        paddingVertical: 4,
    },
    apkLinkText: {
        fontSize: typography.bodyMedium.fontSize,
        fontWeight: typography.bodyMedium.fontWeight,
        textDecorationLine: "underline",
    },
    heroImageWrapper: {
        flex: 1,
        width: "100%",
        maxWidth: 360,
        alignItems: "center",
    },
    previewCard: {
        width: "100%",
        height: 380,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        alignItems: "center",
    },
    footerText: {
        fontSize: typography.caption.fontSize,
    },
});