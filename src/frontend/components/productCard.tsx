import React, { ReactNode } from "react";
import { StyleSheet, View, Text, Image } from "react-native";

const COLORS = {
    darkBlue: "#273462",
    white: "#FFFFFF",
    grayText: "#64748B",
};

interface ProductCardProps {
    name: string;
    category?: string;
    imageUri?: string;
    children?: ReactNode;
}

export default function ProductCard({ name, category, imageUri, children }: ProductCardProps) {
    return (
        <View style={styles.cardContainer}>
            <ProductImage imageUri={imageUri} />

            <ProductInfo name={name} category={category} />

            <View style={styles.divider} />

            <View style={styles.actionContainer}>
                {children}
            </View>
        </View>
    );
}

// --- Componentes Internos ---

const ProductImage = ({ imageUri }: { imageUri?: string }) => (
    <View style={styles.imageContainer}>
        {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.productImage} />
        ) : (
            <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>Sem Imagem</Text>
            </View>
        )}
    </View>
);

const ProductInfo = ({ name, category }: { name: string; category?: string }) => (
    <View style={styles.infoContainer}>
        {category && <Text style={styles.productCategory}>{category.toUpperCase()}</Text>}
        <Text style={styles.productName} numberOfLines={2}>
            {name}
        </Text>
    </View>
);

// --- Estilos ---

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        width: "100%",
        borderWidth: 1,
        borderColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    imageContainer: {
        width: "100%",
        aspectRatio: 1.4,
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 16,
    },
    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1F5F9",
    },
    placeholderText: {
        color: COLORS.grayText,
        fontSize: 14,
        fontWeight: "500",
    },
    infoContainer: {
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    productCategory: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.grayText,
        letterSpacing: 1,
        marginBottom: 4,
    },
    productName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        textAlign: "center",
        lineHeight: 26,
    },
    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        width: "100%",
        marginBottom: 16,
    },
    actionContainer: {
        width: "100%",
    },
});