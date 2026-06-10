import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from '../content/themeContent';

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
};

const MOCK_PRODUCTS = [
    { id: 1, name: "Pão Artesanal" },
    { id: 2, name: "Leite Fresco" },
    { id: 3, name: "Frutas Orgânicas" },
    { id: 4, name: "Arroz Integral" },
    { id: 5, name: "Frutas Tropicais" },
    { id: 6, name: "Legumes Selecionados" },
];

const MENU_ICONS = [
    "cart-outline",
    "nutrition-outline",
    "book-outline",
    "logo-foursquare",
] as const;

export default function Index() {
    const router = useRouter();
    const { themeStyles } = useTheme();

    const handleProductPress = () => {
        router.push("/productDetails");
    };

    const handleAboutUsPress = () => {
        router.push("/aboutUs");
    };

    return (
        // CORRIGIDO: Sintaxe de array para mesclar múltiplos estilos
        <ScrollView
            contentContainerStyle={[styles.content, themeStyles.bg]}
            showsVerticalScrollIndicator={false}
        >
            <Banner />
            <ActionMenu onAboutUsPress={handleAboutUsPress} />
            <ProductGrid onProductPress={handleProductPress} />
        </ScrollView>
    );
}

// --- Componentes Internos com Temas Dinâmicos ---
const Banner = () => {
    const { themeStyles } = useTheme();
    return (
        <View style={styles.bannerSection}>
            <View style={[styles.bannerCardFull, themeStyles.card, themeStyles.border]}>
                <View style={[styles.imagePlaceholderLarge, themeStyles.inputBg]} />
                <Text style={[styles.bannerTitle, themeStyles.text]}>Legumes da Horta</Text>
                <Text style={[styles.bannerSubtitle, themeStyles.subText]}>Desconto em itens selecionados</Text>
                <Text style={styles.bannerLink}>Ver Ofertas</Text>
            </View>
            <View style={styles.paginationContainer}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
            </View>
        </View>
    );
};

const ActionMenu = ({ onAboutUsPress }: { onAboutUsPress: () => void }) => {
    const { themeStyles, isDark } = useTheme();
    return (
        <View style={[styles.centralMenuBar, themeStyles.card, themeStyles.border]}>
            {MENU_ICONS.map((icon, index) => (
                <TouchableOpacity
                    key={index}
                    style={[styles.centralButton, themeStyles.inputBg]}
                    activeOpacity={0.7}
                    onPress={() => {
                        if (icon === "logo-foursquare") {
                            onAboutUsPress();
                        }
                    }}
                >
                    <Ionicons
                        name={icon}
                        size={24}
                        color={isDark ? "#FFFFFF" : COLORS.darkBlue}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

const ProductGrid = ({ onProductPress }: { onProductPress: () => void }) => {
    const { themeStyles } = useTheme();
    return (
        <View style={styles.productsSection}>
            <Text style={[styles.sectionTitle, themeStyles.text]}>Produtos</Text>
            <View style={styles.productGrid}>
                {MOCK_PRODUCTS.map((product) => (
                    <TouchableOpacity
                        key={product.id}
                        style={[styles.productItem, themeStyles.card, themeStyles.border]}
                        activeOpacity={0.8}
                        onPress={onProductPress}
                    >
                        <View style={[styles.imagePlaceholderSquare, themeStyles.inputBg]} />
                        <Text style={[styles.productName, themeStyles.text]} numberOfLines={2}>
                            {product.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- Estilos Ajustados (Cores estáticas removidas onde entra o tema) ---
const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingVertical: 16,
    },
    bannerSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    bannerCardFull: {
        width: "100%",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
    },
    imagePlaceholderLarge: {
        width: "100%",
        height: 100,
        borderRadius: 12,
        marginBottom: 8,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: "bold",
    },
    bannerSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    bannerLink: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.vibrantBlue,
        marginTop: 6,
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 12,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#D9D9D9",
    },
    activeDot: {
        backgroundColor: COLORS.vibrantBlue,
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    centralMenuBar: {
        flexDirection: "row",
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 12,
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
    },
    centralButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    productsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 14,
    },
    productGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    productItem: {
        width: "48%",
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        marginBottom: 4,
    },
    imagePlaceholderSquare: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 10,
        marginBottom: 8,
    },
    productName: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
});