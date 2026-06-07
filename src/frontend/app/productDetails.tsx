import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/productCard";

const COLORS = {
    darkBlue: "#273462",
    background: "#B3B3B3",
    white: "#FFFFFF",
    grayText: "#64748B",
    chartGreen: "#3E6B42",
    chartBg: "#F1F5F9",
};

const MOCK_PRODUCT = {
    category: "Produto",
    name: "Cebola Granel 1kg",
    imageUri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_6g5TzMhG8B1U0_bA85f_9P1bAnp68wF6-g&s",
    lastPrice: "R$ 7,75",
    pricePerUnit: "R$ 7,75 kg",
};

const MOCK_PRICE_HISTORY = [45, 30, 55, 40, 35, 42, 48, 65, 50, 32, 40, 52];

export default function ProductDetails() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <View style={styles.container}>
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.cardWrapper}>
                    <ProductCard
                        category={MOCK_PRODUCT.category}
                        name={MOCK_PRODUCT.name}
                        imageUri={MOCK_PRODUCT.imageUri}
                    >
                        <PriceDetails />
                        <PriceChart />
                    </ProductCard>
                </View>
            </ScrollView>

            <Footer />
        </View>
    );
}

// --- Componentes Internos ---

const PriceDetails = () => (
    <View style={styles.detailsContainer}>
        <Text style={styles.priceLabel}>Último preço:</Text>
        <Text style={styles.priceValue}>{MOCK_PRODUCT.lastPrice}</Text>
        <Text style={styles.priceSubValue}>{MOCK_PRODUCT.pricePerUnit}</Text>
    </View>
);

const PriceChart = () => (
    <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Histórico de preço:</Text>
        <View style={styles.chartContainer}>
            <View style={styles.chartWrapperInner}>
                {MOCK_PRICE_HISTORY.map((heightValue, index) => (
                    <View key={index} style={styles.barWrapper}>
                        <View style={[styles.chartBar, { height: `${heightValue}%` }]} />
                    </View>
                ))}
            </View>
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
        paddingTop: 120,
        paddingBottom: 100,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    cardWrapper: {
        width: "100%",
        alignItems: "center",
    },

    detailsContainer: {
        alignItems: "center",
        marginBottom: 20,
        width: "100%",
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.grayText,
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
    priceSubValue: {
        fontSize: 14,
        color: COLORS.grayText,
        fontWeight: "500",
    },

    chartSection: {
        width: "100%",
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.darkBlue,
        marginBottom: 10,
    },
    chartContainer: {
        backgroundColor: COLORS.chartBg,
        borderRadius: 16,
        padding: 16,
        height: 130,
        justifyContent: "flex-end",
        borderWidth: 1,
        borderColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chartWrapperInner: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
    },
    barWrapper: {
        flex: 1,
        height: "100%",
        justifyContent: "flex-end",
        alignItems: "center",
        marginHorizontal: 3,
    },
    chartBar: {
        width: "100%",
        maxWidth: 10,
        backgroundColor: COLORS.chartGreen,
        borderRadius: 4,
    },
});