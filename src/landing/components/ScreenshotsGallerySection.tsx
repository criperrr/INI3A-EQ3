import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface ScreenshotsGallerySectionProps {
    theme: SemanticTheme;
}

export const ScreenshotsGallerySection: React.FC<ScreenshotsGallerySectionProps> = ({ theme }) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 960;

    const screens = [
        {
            title: "Otimizador de Rotas & Carrinho",
            subtitle: "Divide os produtos por supermercado e desconta o combustível",
            tag: "ECONOMIA LÍQUIDA",
            image: require("../assets/prints/print-cart.jpg"),
        },
        {
            title: "Scanner Óptico de Gôndola",
            subtitle: "Reconhecimento instantâneo de EAN-13 e OpenFoodFacts",
            tag: "LEITURA EM TEMPO REAL",
            image: require("../assets/prints/print-scanner.jpg"),
        },
        {
            title: "Menor Preço & Quórum 2FA",
            subtitle: "Comparativo entre redes, histórico de variação e votos",
            tag: "AUDITORIA COMUNITÁRIA",
            image: require("../assets/prints/print-product.jpg"),
        },
    ];

    return (
        <View
            nativeID="gallery"
            style={[
                styles.container,
                {
                    backgroundColor: theme.isDark ? "#080B10" : "#F3F4F6",
                    borderTopColor: theme.surface.borderSubtle,
                    borderBottomColor: theme.surface.borderSubtle,
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
                                backgroundColor: theme.surface.badgeBg,
                                borderColor: theme.accent + "50",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: theme.accent }]}>
                            GALERIA DE TELAS REAIS DO APP
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
                        Design Premiado & Experiência Fluida
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        Prints autênticos capturados no Presco em execução nativa no Android.
                        Projetado do zero para agilidade no corredor do supermercado.
                    </Text>
                </View>

                {/* Screenshots Grid */}
                <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                    {screens.map((item, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.card,
                                isDesktop && styles.cardDesktop,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                    shadowColor: theme.accent,
                                },
                            ]}
                        >
                            {/* Card Header Info */}
                            <View style={styles.cardHeader}>
                                <View
                                    style={[
                                        styles.tagPill,
                                        { backgroundColor: theme.accent + "20" },
                                    ]}
                                >
                                    <Text style={[styles.tagText, { color: theme.accent }]}>
                                        {item.tag}
                                    </Text>
                                </View>
                                <Text style={[styles.screenTitle, { color: theme.text.primary }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.screenSub, { color: theme.text.secondary }]}>
                                    {item.subtitle}
                                </Text>
                            </View>

                            {/* Screenshot Frame Container */}
                            <View
                                style={[
                                    styles.imageContainer,
                                    {
                                        backgroundColor: "#05070A",
                                        borderColor: theme.surface.borderSubtle,
                                    },
                                ]}
                            >
                                <Image
                                    source={item.image}
                                    style={styles.screenshotImage}
                                    resizeMode="cover"
                                />
                            </View>
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
        paddingVertical: 72,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 700,
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
        marginBottom: 14,
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
    },
    grid: {
        flexDirection: "column",
        gap: 32,
    },
    gridDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    card: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 20,
        width: "100%",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    cardDesktop: {
        width: "31.5%",
    },
    cardHeader: {
        marginBottom: 16,
    },
    tagPill: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    screenTitle: {
        fontSize: 17,
        fontWeight: "800",
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    screenSub: {
        fontSize: 12,
        lineHeight: 18,
    },
    imageContainer: {
        width: "100%",
        height: 520,
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
    },
    screenshotImage: {
        width: "100%",
        height: "100%",
    },
});
