import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgMapPinIcon,
    SvgCarIcon,
    SvgTagIcon,
    SvgSearchIcon,
    SvgTrophyIcon,
    SvgShieldIcon,
} from "./SvgIcons";

interface ScreenshotsGallerySectionProps {
    theme: SemanticTheme;
}

export const ScreenshotsGallerySection: React.FC<ScreenshotsGallerySectionProps> = ({ theme }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 640 && width < 1024;

    const screens = [
        {
            title: "Início & Radar de 15km",
            subtitle: "Ofertas e menores preços no raio de até 15km com economia de até 35%",
            tag: "RAIO GEODÉSICO",
            Icon: SvgMapPinIcon,
            image: require("../assets/prints/print-home.jpg"),
        },
        {
            title: "Otimizador de Rotas & Carrinho",
            subtitle: "Divide os produtos por supermercado e desconta o combustível",
            tag: "ECONOMIA LÍQUIDA",
            Icon: SvgCarIcon,
            image: require("../assets/prints/print-cart.png"),
        },
        {
            title: "Menor Preço & Quórum 2FA",
            subtitle: "Comparativo entre redes, histórico de variação e votos comunitários",
            tag: "AUDITORIA TRANSPARENTE",
            Icon: SvgTagIcon,
            image: require("../assets/prints/print-product.jpg"),
        },
        {
            title: "Catálogo & Busca por Categoria",
            subtitle: "Filtros rápidos por tipo de alimento com destaques de menor preço",
            tag: "BUSCA DINÂMICA",
            Icon: SvgSearchIcon,
            image: require("../assets/prints/print-search.jpg"),
        },
        {
            title: "Perfil Gamificado & Conquistas",
            subtitle: "Detetive de Ofertas Nível 3, 460 XP e heatmap de contribuição semanal",
            tag: "GAMIFICAÇÃO & XP",
            Icon: SvgTrophyIcon,
            image: require("../assets/prints/print-profile.jpg"),
        },
        {
            title: "Configurações, Segurança & 2FA",
            subtitle: "Autenticação em 2 etapas, modo AMOLED, perfil privado e exportação",
            tag: "PRIVACIDADE & LGPD",
            Icon: SvgShieldIcon,
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
                <View style={[styles.grid, isDesktop && styles.gridDesktop, isTablet && styles.gridTablet]}>
                    {screens.map((item, idx) => {
                        const { Icon } = item;
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.card,
                                    isDesktop && styles.cardDesktop,
                                    isTablet && styles.cardTablet,
                                    {
                                        backgroundColor: theme.surface.card,
                                        borderColor: theme.surface.border,
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
                                        <Icon size={12} color={theme.accent} />
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
                        );
                    })}
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
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 700,
        marginHorizontal: "auto",
        marginBottom: 44,
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
        marginBottom: 12,
        letterSpacing: -0.6,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    grid: {
        flexDirection: "column",
        gap: 24,
        alignItems: "center",
    },
    gridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 24,
    },
    gridTablet: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 20,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        width: "100%",
        maxWidth: 380,
    },
    cardDesktop: {
        width: 360,
        maxWidth: 360,
    },
    cardTablet: {
        width: 340,
        maxWidth: 360,
    },
    cardHeader: {
        marginBottom: 14,
    },
    tagPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
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
        letterSpacing: -0.2,
    },
    screenSub: {
        fontSize: 12,
        lineHeight: 17,
    },
    imageContainer: {
        width: "100%",
        height: 520,
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
    },
    screenshotImage: {
        width: "100%",
        height: "100%",
    },
});
