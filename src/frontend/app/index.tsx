import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    lightBlue: "#48C4F9",
    white: "#FFFFFF",
    background: "#F4F6F9",
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const handleProductPress = () => {
        router.push("/productDetails");
    };

    return (
        <View style={styles.container}>
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Banner />
                <ActionMenu />
                <ProductGrid onProductPress={handleProductPress} />
            </ScrollView>

            <Footer activeTab="home" />
        </View>
    );
}

// --- Componentes Internos para organizar a UI ---

const Banner = () => (
    <View style={styles.bannerSection}>
        <View style={styles.bannerCardFull}>
            <View style={styles.imagePlaceholderLarge} />
            <Text style={styles.bannerTitle}>Legumes da Horta</Text>
            <Text style={styles.bannerSubtitle}>Desconto em itens selecionados</Text>
            <Text style={styles.bannerLink}>Ver Ofertas</Text>
        </View>

        <View style={styles.paginationContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
        </View>
    </View>
);

const ActionMenu = () => (
    <View style={styles.centralMenuBar}>
        {MENU_ICONS.map((icon, index) => (
            <TouchableOpacity key={index} style={styles.centralButton}>
                <Ionicons name={icon} size={24} color={COLORS.darkBlue} />
            </TouchableOpacity>
        ))}
    </View>
);

const ProductGrid = ({ onProductPress }: { onProductPress: () => void }) => (
    <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Produtos</Text>

        <View style={styles.productGrid}>
            {MOCK_PRODUCTS.map((product) => (
                <TouchableOpacity
                    key={product.id}
                    style={styles.productItem}
                    activeOpacity={0.8}
                    onPress={onProductPress}
                >
                    <View style={styles.imagePlaceholderSquare} />
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

// --- Estilos ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flexGrow: 1,
        paddingTop: 110,
        paddingBottom: 100,
    },

    bannerSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    bannerCardFull: {
        width: "100%",
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#EAEAEA",
    },
    imagePlaceholderLarge: {
        width: "100%",
        height: 100,
        backgroundColor: "#E2E8F0",
        borderRadius: 12,
        marginBottom: 8,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
    bannerSubtitle: {
        fontSize: 11,
        color: "#64748B",
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
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 12,
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#EAEAEA",
    },
    centralButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },

    productsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.darkBlue,
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
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EAEAEA",
        marginBottom: 4,
    },
    imagePlaceholderSquare: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: "#F1F5F9",
        borderRadius: 10,
        marginBottom: 8,
    },
    productName: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.darkBlue,
        textAlign: "center",
    },
});