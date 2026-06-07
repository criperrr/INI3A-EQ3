import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/productCard";

const COLORS = {
    darkBlue: "#273462",
    background: "#B3B3B3",
    white: "#FFFFFF",
    grayText: "#64748B",
    inputBg: "#B0B0B0",
};

const MOCK_PRODUCT = {
    category: "Produto Encontrado",
    name: "Filé de Salmão fresco com pele Bandeja 300g",
    imageUri: "https://img.freepik.com/fotos-premium/file-de-salmao-cru-fresco-no-fundo-branco-isolado_89814-118.jpg",
    lastPrice: "R$ 29,90 / R$ 99,67 Kg",
};

interface RegisterFormProps {
    price: string;
    onChangePrice: (text: string) => void;
    onRegister: () => void;
}

export default function RegisterProduct() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [price, setPrice] = useState("");
    const router = useRouter();

    const handleRegister = () => {
        router.push("/productDetails");
    };

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

                        <RegisterForm
                            price={price}
                            onChangePrice={setPrice}
                            onRegister={handleRegister}
                        />
                    </ProductCard>
                </View>
            </ScrollView>

            <Footer activeTab="registerProduct" />
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

const RegisterForm = ({ price, onChangePrice, onRegister }: RegisterFormProps) => (
    <>
        <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Preço Encontrado:</Text>
            <TextInput
                style={styles.input}
                placeholder="R$ 00,00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={price}
                onChangeText={onChangePrice}
            />

            <Text style={styles.inputLabel}>Local Encontrado:</Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.pickerContainer}>
                <Text style={styles.pickerText}>Confiança Max</Text>
                <Ionicons name="caret-down" size={16} color="#333" />
            </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.registerButton} activeOpacity={0.8} onPress={onRegister}>
                <Text style={styles.registerButtonText}>Cadastrar</Text>
            </TouchableOpacity>
        </View>
    </>
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
        alignItems: "flex-start",
        marginBottom: 16,
        width: "100%",
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.grayText,
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.grayText,
    },
    formContainer: {
        width: "100%",
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.grayText,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 20,
        height: 45,
        paddingHorizontal: 16,
        fontSize: 16,
        color: "#333",
        marginBottom: 16,
    },
    pickerContainer: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 20,
        height: 45,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    pickerText: {
        fontSize: 16,
        color: "#666",
    },
    buttonContainer: {
        alignItems: "center",
        width: "100%",
        marginTop: 8,
    },
    registerButton: {
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    registerButtonText: {
        color: "#333",
        fontSize: 16,
        fontWeight: "600",
    },
});