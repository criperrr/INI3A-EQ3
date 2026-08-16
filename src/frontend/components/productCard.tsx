import React, { ReactNode, memo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../content/themeContent"; // Importação do tema

interface ProductCardProps {
  name: string;
  category?: string;
  imageUri?: string;
  children?: ReactNode;
}

const ProductCard = memo(function ProductCard({
  name,
  category,
  imageUri,
  children,
}: ProductCardProps) {
  const { themeStyles } = useTheme(); // Consumo do tema

  return (
    <View style={[styles.cardContainer, themeStyles.card, themeStyles.border]}>
      <ProductImage imageUri={imageUri} themeStyles={themeStyles} />

      <ProductInfo name={name} category={category} themeStyles={themeStyles} />

      {/* O divisor usa a cor da borda do tema como backgroundColor */}
      <View
        style={[
          styles.divider,
          { backgroundColor: themeStyles.border.borderColor },
        ]}
      />

      <View style={styles.actionContainer}>{children}</View>
    </View>
  );
});

export default ProductCard;

// --- Componentes Internos Memoizados ---
const ProductImage = memo(function ProductImage({
  imageUri,
  themeStyles,
}: {
  imageUri?: string;
  themeStyles: any;
}) {
  return (
    <View style={[styles.imageContainer, themeStyles.inputBg]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.productImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={[styles.placeholderText, themeStyles.subText]}>
            Sem Imagem
          </Text>
        </View>
      )}
    </View>
  );
});

const ProductInfo = memo(function ProductInfo({
  name,
  category,
  themeStyles,
}: {
  name: string;
  category?: string;
  themeStyles: any;
}) {
  return (
    <View style={styles.infoContainer}>
      {category && (
        <Text style={[styles.productCategory, themeStyles.subText]}>
          {category.toUpperCase()}
        </Text>
      )}
      <Text style={[styles.productName, themeStyles.text]} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.4,
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
  },
  placeholderText: {
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
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 26,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  actionContainer: {
    width: "100%",
  },
});
