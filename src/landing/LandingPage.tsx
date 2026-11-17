import React, { useState, useEffect, useRef } from "react";
import {
    ScrollView,
    View,
    StyleSheet,
    Linking,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import {
    createSemanticColors,
    ThemeType,
    SemanticTheme,
} from "./theme";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { ImpactStatsSection } from "./components/ImpactStatsSection";
import { ProblemSolutionSection } from "./components/ProblemSolutionSection";
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
const GITHUB_REPO_URL = "https://github.com/criperrr/INI3A-EQ3";
const GITHUB_RELEASES_URL = "https://github.com/criperrr/INI3A-EQ3/releases/latest";

export const LandingPage: React.FC = () => {
    const [themeType, setThemeType] = useState<ThemeType>("dark");
    const [policyModalVisible, setPolicyModalVisible] = useState(false);
    const [activePolicyTab, setActivePolicyTab] = useState<PolicyTab>("privacy");
    const [headerVisible, setHeaderVisible] = useState(true);

    const scrollRef = useRef<ScrollView>(null);
    const lastScrollY = useRef(0);
    const isProgrammaticScroll = useRef(false);
    const programmaticTimeout = useRef<any>(null);

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

    const processScrollY = (currentY: number) => {
        if (isProgrammaticScroll.current) return;

        const delta = currentY - lastScrollY.current;

        // Near top: always keep header visible
        if (currentY <= 20) {
            setHeaderVisible(true);
        } else if (delta > 5 && currentY > 40) {
            // Scrolling down -> hide header with smooth slide-up
            setHeaderVisible(false);
        } else if (delta < -3) {
            // Scrolling up even slightly -> reveal header immediately
            setHeaderVisible(true);
        }

        lastScrollY.current = currentY;
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        processScrollY(event.nativeEvent.contentOffset.y);
    };

    // Google-style smooth auto-hide on window scroll (sync for desktop & mobile browsers)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleWindowScroll = () => {
            const currentY = window.scrollY || document.documentElement.scrollTop || 0;
            processScrollY(currentY);
        };

        window.addEventListener("scroll", handleWindowScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleWindowScroll);
    }, []);

    const handleScrollToSection = (sectionId: string) => {
        setHeaderVisible(true);
        isProgrammaticScroll.current = true;
        if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
        programmaticTimeout.current = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 700);

        if (sectionId === "hero") {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }

        const yPos = sectionPositions.current[sectionId];
        if (typeof yPos === "number") {
            scrollRef.current?.scrollTo({ y: Math.max(0, yPos - 80), animated: true });
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
            {/* Google-style Auto-Hiding Sticky Navigation Header */}
            <Header
                theme={theme}
                themeType={themeType}
                visible={headerVisible}
                onToggleTheme={handleToggleTheme}
                onOpenPolicies={handleOpenPolicies}
                onScrollToSection={handleScrollToSection}
                onDownload={handleDownload}
            />

            {/* Main Content Scroll View */}
            <ScrollView
                nativeID="landing-scroll-view"
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingTop: 72 },
                ]}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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

                {/* 3. O Problema vs A Solução Presco (Landing Page High-Conversion Contrast) */}
                <View
                    onLayout={(e) => {
                        sectionPositions.current["problem-solution"] = e.nativeEvent.layout.y;
                    }}
                >
                    <ProblemSolutionSection theme={theme} />
                </View>

                {/* 4. Como Funciona em 3 Passos (Too Good To Go Journey) */}
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