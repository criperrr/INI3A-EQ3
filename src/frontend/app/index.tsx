import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import Header from "../components/Header"; // Ajuste o caminho do import se necessário
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    lightBlue: "#48C4F9",
    white: "#FFFFFF",
    background: "#F4F6F9",
};

export default function Index() {
    // Estado para controlar o menu lateral
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Mock estrutural dos produtos para o Grid
    const products = [
        { id: 1, name: "Pão Artesanal" },
        { id: 2, name: "Leite Fresco" },
        { id: 3, name: "Frutas Orgânicas" },
        { id: 4, name: "Arroz Integral" },
        { id: 5, name: "Frutas Tropicais" },
        { id: 6, name: "Legumes Selecionados" },
    ];

    return (
        <View style={styles.container}>
            {/* Header agora recebe a ação de abrir o menu */}
            <Header onPressMenu={() => setIsMenuOpen(true)} />

            {/* Sidebar controlada pelo estado da tela */}
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* 1. Banner Retangular e Paginação (Bolinhas) */}
                <View style={styles.bannerSection}>
                    <View style={styles.bannerCardFull}>
                        <View style={styles.imagePlaceholderLarge} />
                        <Text style={styles.bannerTitle}>Legumes da Horta</Text>
                        <Text style={styles.bannerSubtitle}>Desconto em itens selecionados</Text>
                        <Text style={styles.bannerLink}>Ver Ofertas</Text>
                    </View>

                    {/* Bolinhas de Paginação */}
                    <View style={styles.paginationContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>
                </View>

                {/* 2. Barra Central com os 4 Botões */}
                <View style={styles.centralMenuBar}>
                    <TouchableOpacity style={styles.centralButton}>
                        <Ionicons name="cart-outline" size={24} color={COLORS.darkBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.centralButton}>
                        <Ionicons name="nutrition-outline" size={24} color={COLORS.darkBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.centralButton}>
                        <Ionicons name="book-outline" size={24} color={COLORS.darkBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.centralButton}>
                        <Ionicons name="logo-foursquare" size={24} color={COLORS.darkBlue} />
                    </TouchableOpacity>
                </View>

                {/* 3. Seção e Grid de Produtos (Agora com 2 colunas) */}
                <View style={styles.productsSection}>
                    <Text style={styles.sectionTitle}>Produtos</Text>

                    <View style={styles.productGrid}>
                        {products.map((product) => (
                            <View key={product.id} style={styles.productItem}>
                                <View style={styles.imagePlaceholderSquare} />
                                <Text style={styles.productName} numberOfLines={2}>
                                    {product.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Footer configurado para indicar que estamos na Home */}
            <Footer activeTab="home" />
        </View>
    );
}

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

    // Banner Retangular
    bannerSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    bannerCardFull: {
        width: "100%", // Ocupa toda a largura disponível
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
        backgroundColor: COLORS.vibrantBlue, // Bolinha ativa com a cor principal do app
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // Barra Central Menu
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

    // Grid de Produtos
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
        width: "48%", // Alterado para 2 colunas perfeitas
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 12, // Aumentei um pouco o padding para ficar mais elegante
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
        fontSize: 14, // Aumentei levemente a fonte para combinar com o card maior
        fontWeight: "600",
        color: COLORS.darkBlue,
        textAlign: "center",
    },
});