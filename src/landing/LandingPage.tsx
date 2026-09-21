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
import { themeColors as baseColors, themeTypography as typography } from "./theme";

const { width } = Dimensions.get("window");
const isDesktop = width > 768;

// Ajuste das cores para refletir o moodboard tropical e a interface do app
const ACCENT_YELLOW = "#FFB703"; // Amarelo tropical do botão/logo
const TROPICAL_BLUE = "#0B2545"; // Azul profundo vibrante para o Hero
const APP_DARK_BG = "#15171E"; // Fundo escuro do app
const APP_CARD_BG = "#1E2029"; // Fundo dos cards do app

export const LandingPage: React.FC = () => {
    const handleDownloadRepo = () => {
        Linking.openURL("https://github.com/seu-usuario/seu-repositorio/releases/latest");
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

            {/* HEADER + HERO (Bloco integrado estilo Enxada Host) */}
            <View style={styles.heroWrapper}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.brandText}>
                            P<Text style={{ color: ACCENT_YELLOW }}>Resco</Text>
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.btnHeader, { backgroundColor: ACCENT_YELLOW }]}
                        onPress={handleDownloadRepo}
                    >
                        <Text style={styles.btnTextHeader}>Baixar APK (v1.0.0)</Text>
                    </TouchableOpacity>
                </View>

                {/* HERO SECTION */}
                <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>
                            Economia Inteligente & Comparação Colaborativa.
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            O PResco nasceu para democratizar o acesso à informação de preços no comércio local.
                            Transparência feita por e para pessoas.
                        </Text>

                        <View style={styles.actionGroup}>
                            <TouchableOpacity
                                style={[styles.btnPrimary, { backgroundColor: ACCENT_YELLOW }]}
                                onPress={handleDownloadRepo}
                            >
                                <Text style={styles.btnPrimaryText}>Download via Repositório</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.buildInfoText}>⚡ Build 2026.09 • Apenas para Android (APK)</Text>
                    </View>
                </View>
            </View>

            {/* RECURSOS / INTERFACE ESTILO APP */}
            <View style={styles.featuresSection}>
                <Text style={styles.sectionTitle}>Tudo na palma da sua mão</Text>

                <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>

                    {/* CARD 1 */}
                    <View style={styles.appCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTag}>Comunidade</Text>
                        </View>
                        <Text style={styles.cardTitle}>Comunidade Colaborativa</Text>
                        <Text style={styles.cardDescription}>
                            Cadastre preços de alimentos, hortifrúti e carnes e ajude outros consumidores da sua região.
                        </Text>
                        <TouchableOpacity style={styles.cardButton}>
                            <Text style={styles.cardButtonText}>Participar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* CARD 2 */}
                    <View style={styles.appCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTag}>Mapa</Text>
                        </View>
                        <Text style={styles.cardTitle}>Menores Preços Próximos</Text>
                        <Text style={styles.cardDescription}>
                            Visualize ofertas em um raio de até 15km. Busque mercados, atacadões e compare antes de sair de casa.
                        </Text>
                        <TouchableOpacity style={styles.cardButton}>
                            <Text style={styles.cardButtonText}>Explorar Mapa</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    © {new Date().getFullYear()} PResco. Economia inteligente feita de forma colaborativa.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: APP_DARK_BG
    },
    contentContainer: {
        flexGrow: 1
    },

    /* Bloco Integrado Hero (Fundo Azul Vibrante) */
    heroWrapper: {
        backgroundColor: TROPICAL_BLUE,
        paddingBottom: 64,
    },

    header: {
        height: 80,
        paddingHorizontal: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    logoContainer: {
        flexDirection: "row",
    },
    brandText: {
        fontSize: 24,
        fontWeight: "900",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    btnHeader: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    btnTextHeader: {
        fontSize: typography.button.fontSize,
        fontWeight: typography.button.fontWeight,
        color: "#000000",
    },

    /* Hero Estilo "Enxada Host" (Tipografia Gigante) */
    hero: {
        paddingHorizontal: 32,
        paddingTop: 48,
        alignItems: "flex-start", // Alinhamento à esquerda para um visual mais forte
    },
    heroDesktop: {
        paddingHorizontal: "15%",
        paddingTop: 80,
    },
    heroTextContent: {
        maxWidth: 780,
    },
    heroTitle: {
        fontSize: isDesktop ? 64 : 42,
        fontWeight: "900", // Ultra Bold
        lineHeight: isDesktop ? 72 : 48,
        color: "#FFFFFF",
        letterSpacing: -1.5,
        marginBottom: 24,
    },
    heroSubtitle: {
        fontSize: isDesktop ? 22 : 18,
        fontWeight: "500",
        lineHeight: isDesktop ? 32 : 28,
        color: "rgba(255,255,255,0.8)",
        marginBottom: 40,
        maxWidth: 600,
    },
    actionGroup: {
        flexDirection: "row",
        marginBottom: 16,
    },
    btnPrimary: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        shadowColor: ACCENT_YELLOW,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    btnPrimaryText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000000", // Contraste forte com o botão amarelo
    },
    buildInfoText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.6)",
        fontWeight: "600",
    },

    /* Seção de Recursos Estilo App */
    featuresSection: {
        padding: 32,
        paddingVertical: 80,
        backgroundColor: APP_DARK_BG,
        alignItems: "center",
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 48,
        textAlign: "center",
    },
    cardsGrid: {
        flexDirection: "column",
        gap: 24,
        width: "100%",
        maxWidth: 1000,
    },
    cardsGridDesktop: {
        flexDirection: "row",
        justifyContent: "center",
    },

    /* Cards Idênticos ao App */
    appCard: {
        flex: 1,
        backgroundColor: APP_CARD_BG,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTag: {
        color: ACCENT_YELLOW,
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 12,
    },
    cardDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: "#A1A1A6",
        marginBottom: 24,
    },
    cardButton: {
        alignSelf: "flex-start",
    },
    cardButtonText: {
        color: ACCENT_YELLOW,
        fontSize: 16,
        fontWeight: "700",
    },

    /* Footer */
    footer: {
        padding: 32,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.05)",
        alignItems: "center",
        backgroundColor: APP_DARK_BG,
    },
    footerText: {
        color: "#A1A1A6",
        fontSize: 14,
    },
});