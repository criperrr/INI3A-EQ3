import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
} from "react-native";
import { SemanticTheme, ThemeType } from "../theme";

interface HeaderProps {
    theme: SemanticTheme;
    themeType: ThemeType;
    onToggleTheme: () => void;
    onOpenPolicies: (tab?: "terms" | "privacy" | "guidelines" | "cookies") => void;
    onScrollToSection: (sectionId: string) => void;
    onDownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    theme,
    themeType,
    onToggleTheme,
    onOpenPolicies,
    onScrollToSection,
    onDownload,
}) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 920;

    const logoSource = theme.isDark
        ? require("../assets/logo-darkmode.png")
        : require("../assets/logo-presco.png");

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.header,
                    borderBottomColor: theme.surface.borderSubtle,
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Brand Logo & Version Badge */}
                <TouchableOpacity
                    style={styles.logoRow}
                    activeOpacity={0.8}
                    onPress={() => onScrollToSection("hero")}
                >
                    <Image
                        source={logoSource}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <View
                        style={[
                            styles.versionBadge,
                            {
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "40",
                            },
                        ]}
                    >
                        <View style={[styles.pulseDot, { backgroundColor: theme.accent }]} />
                        <Text style={[styles.versionText, { color: theme.accent }]}>
                            v1.3.5
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* ClickUp-style Desktop Navigation Links */}
                {isDesktop && (
                    <View style={styles.navLinks}>
                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => onScrollToSection("how-it-works")}
                        >
                            <Text style={[styles.navText, { color: theme.text.primary }]}>
                                Como Funciona
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => onScrollToSection("gallery")}
                        >
                            <Text style={[styles.navText, { color: theme.text.primary }]}>
                                Telas do App
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => onScrollToSection("features")}
                        >
                            <Text style={[styles.navText, { color: theme.text.primary }]}>
                                Recursos
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => onOpenPolicies("privacy")}
                        >
                            <Text style={[styles.navText, { color: theme.text.primary }]}>
                                Proteção & LGPD
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => onScrollToSection("faq")}
                        >
                            <Text style={[styles.navText, { color: theme.text.secondary }]}>
                                FAQ
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Right Actions: Theme Toggle + Yellow CTA */}
                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={[
                            styles.themeBtn,
                            {
                                backgroundColor: theme.surface.card,
                                borderColor: theme.surface.border,
                            },
                        ]}
                        activeOpacity={0.8}
                        onPress={onToggleTheme}
                        accessibilityLabel="Alternar tema visual"
                    >
                        <Text style={[styles.themeBtnText, { color: theme.text.primary }]}>
                            {themeType === "dark" ? "🌙 Dark" : themeType === "amoled" ? "🖤 AMOLED" : "☀️ Light"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: theme.accent }]}
                        activeOpacity={0.85}
                        onPress={onDownload}
                    >
                        <Text style={styles.ctaBtnText}>
                            {isDesktop ? "Baixar APK (Android)" : "Baixar APK"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        borderBottomWidth: 1,
        zIndex: 50,
        // @ts-ignore: React Native Web backdrop filter
        backdropFilter: "blur(16px)",
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
        height: 72,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    logoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    logoImage: {
        width: 130,
        height: 38,
    },
    versionBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    versionText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    navLinks: {
        flexDirection: "row",
        alignItems: "center",
        gap: 28,
    },
    navItem: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    navText: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    rightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    themeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    themeBtnText: {
        fontSize: 12,
        fontWeight: "800",
    },
    ctaBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: "#FFB703",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 4,
    },
    ctaBtnText: {
        color: "#000000",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
});
