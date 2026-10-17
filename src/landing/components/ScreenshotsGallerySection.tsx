import React, { useState, useEffect } from "react";
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

    const isDesktop = windowWidth >= 960;
    const isMobile = windowWidth < 480;

    // Calculate responsive image container height
    // Desktop: ~500px, Tablet: ~440px, Mobile: proportional to card width (aspect ratio ~16:9 or phone height)
    const cardContentWidth = isDesktop
        ? Math.min((1200 - 48 - 64) / 3, 340)
        : Math.min(windowWidth - 48 - 32, 400);
    const imageHeight = isDesktop
        ? 500
        : Math.min(Math.round(cardContentWidth * 1.55), 460);

    const screens = [
        {
            title: "Início & Radar de 15km",
            subtitle: "Ofertas e menores preços no raio de até 15km com economia de até 35%",
            tag: "RAIO GEODÉSICO",
            image: require("../assets/prints/print-home.jpg"),
        },
        {
            title: "Otimizador de Rotas & Carrinho",
            subtitle: "Divide os produtos por supermercado e desconta o combustível",
            tag: "ECONOMIA LÍQUIDA",
            image: require("../assets/prints/print-cart.png"),
        },
        {
            title: "Menor Preço & Quórum 2FA",
            subtitle: "Comparativo entre redes, histórico de variação e votos comunitários",
            tag: "AUDITORIA TRANSPARENTE",
            image: require("../assets/prints/print-product.jpg"),
        },
        {
            title: "Catálogo & Busca por Categoria",
            subtitle: "Filtros rápidos por tipo de alimento com destaques de menor preço",
            tag: "BUSCA DINÂMICA",
            image: require("../assets/prints/print-search.jpg"),
        },
        {
            title: "Perfil Gamificado & Conquistas",
            subtitle: "Detetive de Ofertas Nível 3, 460 XP e heatmap de contribuição semanal",
            tag: "GAMIFICAÇÃO & XP",
            image: require("../assets/prints/print-profile.jpg"),
        },
        {
            title: "Configurações, Segurança & 2FA",
            subtitle: "Autenticação em 2 etapas, modo AMOLED, perfil privado e exportação",
            tag: "PRIVACIDADE & LGPD",
            image: require("../assets/prints/print-settings.jpg"),
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
                                fontSize: isDesktop ? 36 : 26,
                                lineHeight: isDesktop ? 44 : 32,
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
                                isMobile && styles.cardMobile,
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
                                        height: imageHeight,
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
        paddingVertical: 56,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 700,
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
    grid: {
        flexDirection: "column",
        gap: 24,
    },
    gridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 28,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        width: "100%",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    cardDesktop: {
        width: "31.5%",
    },
    cardMobile: {
        padding: 14,
    },
    cardHeader: {
        marginBottom: 14,
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
        fontSize: 16,
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
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
    },
    screenshotImage: {
        width: "100%",
        height: "100%",
    },
});

