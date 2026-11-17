import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme, ThemeType } from "../theme";
import {
    SvgMoonIcon,
    SvgAmoledIcon,
    SvgSunIcon,
    SvgDownloadIcon,
} from "./SvgIcons";

interface HeaderProps {
    theme: SemanticTheme;
    themeType: ThemeType;
    visible?: boolean;
    onToggleTheme: () => void;
    onOpenPolicies: (tab?: "terms" | "privacy" | "guidelines" | "cookies") => void;
    onScrollToSection: (sectionId: string) => void;
    onDownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    theme,
    themeType,
    visible = true,
    onToggleTheme,
    onOpenPolicies,
    onScrollToSection,
    onDownload,
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 920;
    const isMobile = width < 540;

    const logoSource = theme.isDark
        ? require("../assets/logo-darkmode.png")
        : require("../assets/logo-presco.png");

    return (
        <View
            nativeID="landing-header"
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.header,
                    borderBottomColor: theme.surface.borderSubtle,
                    transform: [{ translateY: visible ? 0 : -100 }],
                    boxShadow: visible
                        ? theme.isDark
                            ? "0 4px 24px rgba(0, 0, 0, 0.45)"
                            : "0 4px 20px rgba(0, 0, 0, 0.06)"
                        : "none",
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Brand Logo */}
                <TouchableOpacity
                    style={styles.logoRow}
                    activeOpacity={0.8}
                    onPress={() => onScrollToSection("hero")}
                >
                    <Image
                        source={logoSource}
                        style={[styles.logoImage, isMobile && styles.logoImageMobile]}
                        resizeMode="contain"
                    />
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
                            <Text style={[styles.navText, { color: theme.text.primary }]}>
                                FAQ
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Right Actions: Theme Toggle + Yellow CTA */}
                <View style={[styles.rightActions, isMobile && styles.rightActionsMobile]}>
                    <TouchableOpacity
                        style={[
                            styles.themeBtn,
                            {
                                backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                                borderColor: theme.surface.borderSubtle,
                            },
                        ]}
                        activeOpacity={0.7}
                        onPress={onToggleTheme}
                        accessibilityLabel="Alternar tema visual"
                    >
                        {themeType === "dark" ? (
                            <SvgMoonIcon size={12} color={theme.text.secondary} />
                        ) : themeType === "amoled" ? (
                            <SvgAmoledIcon size={12} color={theme.text.secondary} />
                        ) : (
                            <SvgSunIcon size={12} color={theme.text.secondary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.ctaBtn,
                            isMobile && styles.ctaBtnMobile,
                            { backgroundColor: theme.accent, shadowColor: theme.accent },
                        ]}
                        activeOpacity={0.85}
                        onPress={onDownload}
                    >
                        <View style={styles.ctaBtnRow}>
                            <SvgDownloadIcon size={14} color={theme.text.inverse} />
                            <Text style={[styles.ctaBtnText, { color: theme.text.inverse }]}>
                                {isDesktop ? "Baixar APK (Android)" : isMobile ? "Baixar" : "Baixar APK"}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "fixed" as any,
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        borderBottomWidth: 1,
        zIndex: 100,
        // @ts-ignore: React Native Web backdrop filter
        backdropFilter: "blur(16px)",
        // @ts-ignore: CSS transition for ultra smooth Google style
        transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, background-color 0.2s ease",
        // @ts-ignore: GPU hardware acceleration
        willChange: "transform",
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
    },
    logoImage: {
        width: 54,
        height: 54,
        aspectRatio: 1,
    },
    logoImageMobile: {
        width: 44,
        height: 44,
        aspectRatio: 1,
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
    rightActionsMobile: {
        gap: 8,
    },
    themeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.75,
    },
    ctaBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 4,
    },
    ctaBtnMobile: {
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    ctaBtnRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    ctaBtnText: {
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
});
