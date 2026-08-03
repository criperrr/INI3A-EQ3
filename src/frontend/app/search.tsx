import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";

const MOCK_SEARCH_PRODUCTS = [
  {
    id: 1,
    name: "Maçã Gala 1kg",
    price: "R$ 8,99",
    image:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop",
  },
  {
    id: 2,
    name: "Arroz Agulhinha",
    price: "R$ 25,90",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "Feijão Carioca",
    price: "R$ 9,90",
    image:
      "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    name: "Sabão Líquido 1L",
    price: "R$ 14,90",
    image:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
  },
  {
    id: 5,
    name: "Detergente Neutro",
    price: "R$ 2,99",
    image:
      "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&h=400&fit=crop",
  },
  {
    id: 6,
    name: "Água Sanitária 2L",
    price: "R$ 5,49",
    image:
      "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=400&fit=crop",
  },
];

export default function SearchScreen() {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const { themeStyles } = useTheme();

  const handleProductPress = () => {
    router.push("/productDetails");
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar value={searchText} onChangeText={setSearchText} />
        <ProductResultsGrid
          products={MOCK_SEARCH_PRODUCTS}
          onProductPress={handleProductPress}
        />
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const SearchBar = ({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) => {
  const { themeStyles, isDark } = useTheme();
  const placeholderColor = isDark ? "#8B949E" : "#5A6B52";

  return (
    <View
      style={[styles.searchBarContainer, themeStyles.card, themeStyles.border]}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={placeholderColor}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.searchInput, themeStyles.text]}
        placeholder="Buscar produto..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const ProductResultsGrid = ({
  products,
  onProductPress,
}: {
  products: typeof MOCK_SEARCH_PRODUCTS;
  onProductPress: () => void;
}) => {
  const { themeStyles } = useTheme();

  return (
    <View style={styles.gridContainer}>
      {products.map((product) => (
        <TouchableOpacity
          key={product.id}
          style={[styles.productCard, themeStyles.card, themeStyles.border]}
          activeOpacity={0.8}
          onPress={onProductPress}
        >
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />

          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, themeStyles.text]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <Text style={[styles.productPrice, themeStyles.text]}>
              {product.price}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 10, paddingHorizontal: 16 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, height: "100%" },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  productCard: {
    width: "48%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  productInfo: { alignItems: "center" },
  productName: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    minHeight: 36,
  },
  productPrice: { fontSize: 15, fontWeight: "bold" },
});
