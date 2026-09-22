import React, { useState, useEffect, useRef } from "react";
import {
    ScrollView,
    View,
    StyleSheet,
    Linking,
} from "react-native";
import {
    createSemanticColors,
    ThemeType,
    SemanticTheme,
} from "./theme";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { ImpactStatsSection } from "./components/ImpactStatsSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { ScreenshotsGallerySection } from "./components/ScreenshotsGallerySection";
import { FeaturesSection } from "./components/FeaturesSection";
import { SecurityProtectionSection } from "./components/SecurityProtectionSection";
import { DownloadSection } from "./components/DownloadSection";
import { FaqSection } from "./components/FaqSection";
import { PolicyModal, PolicyTab } from "./components/PolicyModal";
import { ConsentBanner } from "./components/ConsentBanner";
import { Footer } from "./components/Footer";

const THEME_STORAGE_KEY = "@presco:landing_theme";
const GITHUB_REPO_URL = "https://github.com/aventureiromax/INI3A-EQ3";
const GITHUB_RELEASES_URL = "https://github.com/aventureiromax/INI3A-EQ3/releases/latest";

export const LandingPage: React.FC = () => {
    const [themeType, setThemeType] = useState<ThemeType>("dark");
    const [policyModalVisible, setPolicyModalVisible] = useState(false);
    const [activePolicyTab, setActivePolicyTab] = useState<PolicyTab>("privacy");

    const scrollRef = useRef<ScrollView>(null);

    // Section coordinates for smooth scrolling
    const sectionPositions = useRef<{ [key: string]: number }>({});

    // Load saved theme preference
    useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
                if (saved && (saved === "dark" || saved === "amoled" || saved === "light")) {
                    setThemeType(saved);
                }
            }
        } catch {}
    }, []);

    const handleToggleTheme = () => {
        setThemeType((prev) => {
            const next: ThemeType = prev === "dark" ? "amoled" : prev === "amoled" ? "light" : "dark";
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.setItem(THEME_STORAGE_KEY, next);
                }
            } catch {}
            return next;
        });
    };

    const theme: SemanticTheme = createSemanticColors(themeType);

    const handleOpenPolicies = (tab: PolicyTab = "privacy") => {
        setActivePolicyTab(tab);
        setPolicyModalVisible(true);
    };

    const handleClosePolicies = () => {
        setPolicyModalVisible(false);
    };

    const handleDownload = () => {
        Linking.openURL(GITHUB_RELEASES_URL);
    };

    const handleOpenRepo = () => {
        Linking.openURL(GITHUB_REPO_URL);
    };

    const handleScrollToSection = (sectionId: string) => {
        if (sectionId === "hero") {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }

        const yPos = sectionPositions.current[sectionId];
        if (typeof yPos === "number") {
            scrollRef.current?.scrollTo({ y: yPos - 60, animated: true });
        } else {
            if (typeof document !== "undefined") {
                const elem = document.getElementById(sectionId);
                if (elem) {
                    elem.scrollIntoView({ behavior: "smooth" });
                }
            }
        }
    };

    return (
        <View
            style={[
                styles.root,
                {
                    backgroundColor: theme.surface.background,
                },
            ]}
        >
            {/* ClickUp-style Sticky Navigation Header */}
            <Header
                theme={theme}
                themeType={themeType}
                onToggleTheme={handleToggleTheme}
                onOpenPolicies={handleOpenPolicies}
                onScrollToSection={handleScrollToSection}
                onDownload={handleDownload}
            />

            {/* Main Content Scroll View */}
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Hero Section com Showcase Interativo */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["hero"] = e.nativeEvent.layout.y;
                    }}
                >
                    <HeroSection
                        theme={theme}
                        onDownload={handleDownload}
                        onOpenPolicies={handleOpenPolicies}
                        onExploreFeatures={() => handleScrollToSection("features")}
                        onScrollToHowItWorks={() => handleScrollToSection("how-it-works")}
                    />
                </View>

                {/* 2. Faixa de Impacto Comunitário (Too Good To Go / ClickUp Metrics) */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["impact"] = e.nativeEvent.layout.y;
                    }}
                >
                    <ImpactStatsSection theme={theme} />
                </View>

                {/* 3. Como Funciona em 3 Passos (Too Good To Go Journey) */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["how-it-works"] = e.nativeEvent.layout.y;
                    }}
                >
                    <HowItWorksSection theme={theme} />
                </View>

                {/* 4. Galeria de Telas & Prints Reais do App (ClickUp Showcase) */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["gallery"] = e.nativeEvent.layout.y;
                    }}
                >
                    <ScreenshotsGallerySection theme={theme} />
                </View>

                {/* 5. Pilares de Inteligência & Recursos do Presco */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["features"] = e.nativeEvent.layout.y;
                        sectionPositions.current["optimizer"] = e.nativeEvent.layout.y;
                    }}
                >
                    <FeaturesSection theme={theme} />
                </View>

                {/* 6. Segurança, Governança & Proteção LGPD */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["protection"] = e.nativeEvent.layout.y;
                    }}
                >
                    <SecurityProtectionSection
                        theme={theme}
                        onOpenPolicies={handleOpenPolicies}
                    />
                </View>

                {/* 7. Hub Oficial de Download de APK & QR Code (Big Pre-Footer CTA) */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["download"] = e.nativeEvent.layout.y;
                    }}
                >
                    <DownloadSection
                        theme={theme}
                        onDownload={handleDownload}
                        onOpenRepo={handleOpenRepo}
                    />
                </View>

                {/* 8. Perguntas & Respostas Frequentes */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["faq"] = e.nativeEvent.layout.y;
                    }}
                >
                    <FaqSection theme={theme} />
                </View>

                {/* 9. Rodapé Institucional Completo */}
                <Footer
                    theme={theme}
                    onOpenPolicies={handleOpenPolicies}
                    onScrollToSection={handleScrollToSection}
                    onOpenRepo={handleOpenRepo}
                />
            </ScrollView>

            {/* Central Oficial de Políticas (Modal) */}
            <PolicyModal
                visible={policyModalVisible}
                initialTab={activePolicyTab}
                theme={theme}
                onClose={handleClosePolicies}
            />

            {/* Banner de Consentimento LGPD */}
            <ConsentBanner
                theme={theme}
                onOpenPolicies={handleOpenPolicies}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        width: "100%",
        minHeight: "100%",
        position: "relative",
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
});

export default LandingPage;