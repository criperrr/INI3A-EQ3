import React, { useState } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    background: "#F4F6F9",
    grayText: "#8E8E93",
    lightGray: "#E2E8F0",
};

export default function SearchScreen() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    // Mock dos produtos baseados na imagem de referência
    const searchProducts = [
        { id: 1, name: "Maçã Gala 1kg", price: "R$ 8,99" },
        { id: 2, name: "Arroz Agulhinha", price: "R$ 25,90" },
        { id: 3, name: "Arroz Agulhinha", price: "R$ 25,90" }, // Item repetido na imagem
        { id: 4, name: "Sabão Líquido 1L", price: "R$ 14,90" },
        { id: 5, name: "Detergente Neutro", price: "R$ 2,99" },
        { id: 6, name: "Água Sanitária 2L", price: "R$ 5,49" },
    ];

    return (
        <View style={styles.container}>
            {/* Header e Sidebar integrados */}
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Barra de Busca */}
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search-outline" size={20} color={COLORS.grayText} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar produto..."
                        placeholderTextColor={COLORS.grayText}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* Grid de Resultados */}
                <View style={styles.gridContainer}>
                    {searchProducts.map((product) => (
                        <TouchableOpacity key={product.id} style={styles.productCard} activeOpacity={0.8}>
                            {/* Placeholder para a imagem do produto */}
                            <View style={styles.productImagePlaceholder}>
                                <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                            </View>

                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={2}>
                                    {product.name}
                                </Text>
                                <Text style={styles.productPrice}>
                                    {product.price}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            {/* Footer com a aba de busca (search) ativa */}
            <Footer activeTab="search" />
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
        paddingTop: 110, // Espaço do Header
        paddingBottom: 110, // Espaço do Footer
        paddingHorizontal: 16,
    },

    // Barra de Busca
    searchBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.darkBlue,
        height: "100%",
    },

    // Grid de Produtos
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12, // Espaçamento entre as linhas
    },
    productCard: {
        width: "48%", // Garante 2 colunas
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    productImagePlaceholder: {
        width: "100%",
        aspectRatio: 1, // Mantém um quadrado perfeito
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    productInfo: {
        alignItems: "center", // Centraliza o texto como no mockup
    },
    productName: {
        fontSize: 13,
        color: COLORS.darkBlue,
        textAlign: "center",
        marginBottom: 4,
        minHeight: 36, // Garante alinhamento mesmo se o nome tiver 1 ou 2 linhas
    },
    productPrice: {
        fontSize: 15,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
});