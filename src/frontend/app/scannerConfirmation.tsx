import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/productCard";

const COLORS = {
    darkBlue: "#273462",
    background: "#B3B3B3",
    white: "#FFFFFF",
    greenConfirm: "#388E3C",
    redCancel: "#D32F2F",
    grayText: "#64748B",
};

const MOCK_PRODUCT = {
    category: "Produto Encontrado",
    name: "Filé de Salmão fresco com pele Bandeja 300g",
    imageUri: "https://img.freepik.com/fotos-premium/file-de-salmao-cru-fresco-no-fundo-branco-isolado_89814-118.jpg",
    lastPrice: "R$ 29,90 / R$ 99,67 Kg",
};

interface ActionButtonsProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ScannerConfirmation() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const handleConfirm = () => router.push("/registerProduct");
    const handleCancel = () => router.back();

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
                        <PriceDetails lastPrice={MOCK_PRODUCT.lastPrice} />

                        <ActionButtons
                            onConfirm={handleConfirm}
                            onCancel={handleCancel}
                        />
                    </ProductCard>
                </View>
            </ScrollView>

            <Footer />
        </View>
    );
}

// --- Componentes Internos ---

const PriceDetails = ({ lastPrice }: { lastPrice: string }) => (
    <View style={styles.detailsContainer}>
        <Text style={styles.priceLabel}>Último Preço:</Text>
        <Text style={styles.priceValue}>{lastPrice}</Text>
    </View>
);

const ActionButtons = ({ onConfirm, onCancel }: ActionButtonsProps) => (
    <View style={styles.buttonRow}>
        <TouchableOpacity
            style={[styles.button, styles.buttonYes]}
            activeOpacity={0.8}
            onPress={onConfirm}
        >
            <Text style={styles.buttonText}>Sim</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, styles.buttonNo]}
            activeOpacity={0.8}
            onPress={onCancel}
        >
            <Text style={styles.buttonText}>Não</Text>
        </TouchableOpacity>
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
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.grayText,
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    buttonYes: {
        backgroundColor: COLORS.greenConfirm,
    },
    buttonNo: {
        backgroundColor: COLORS.redCancel,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
});