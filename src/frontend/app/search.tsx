import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { searchProducts, type Product } from "../services/productService";

const COLORS = {
  vibrantBlue: "#0062CC",
  error: "#DC2626",
};

export default function SearchScreen() {
  const [searchText, setSearchText] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const { themeStyles } = useTheme();

  /**
   * Função de busca com debounce de 300ms conforme PRD (F3).
   * Cancela o timer anterior a cada nova digitação.
   */
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!text.trim()) {
      setProducts([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchProducts({
          q: text.trim(),
          lat: -23.55052,
          lng: -46.633308,
          radius: 5000,
        });
        setProducts(results);
        setHasSearched(true);
      } catch {
        setError("Erro ao buscar produtos. Tente novamente.");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/productDetails",
      params: { id: product.id, name: product.name },
    });
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBar value={searchText} onChangeText={handleSearchChange} />

        {isLoading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="small" color={COLORS.vibrantBlue} />
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.centerContent}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={COLORS.error}
            />
            <Text style={[styles.emptyText, { color: COLORS.error }]}>
              {error}
            </Text>
          </View>
        )}

        {!isLoading && !error && hasSearched && products.length === 0 && (
          <View style={styles.centerContent}>
            <Ionicons
              name="search-outline"
              size={48}
              color={themeStyles.subText.color}
            />
            <Text style={[styles.emptyText, themeStyles.subText]}>
              Nenhum produto encontrado para "{searchText}"
            </Text>
          </View>
        )}

        {!isLoading && products.length > 0 && (
          <ProductResultsGrid
            products={products}
            onProductPress={handleProductPress}
          />
        )}
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
  const placeholderColor = isDark ? "#9CA3AF" : "#8E8E93";

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
        placeholder="Buscar produto por nome ou EAN..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        autoFocus={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color={placeholderColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const ProductResultsGrid = ({
  products,
  onProductPress,
}: {
  products: Product[];
  onProductPress: (product: Product) => void;
}) => {
  const { themeStyles, isDark } = useTheme();

  const formatPrice = (price?: number | null) => {
    if (price == null) return "Ver preços";
    return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
  };

  return (
    <View style={styles.gridContainer}>
      {products.map((product) => (
        <TouchableOpacity
          key={product.id}
          style={[styles.productCard, themeStyles.card, themeStyles.border]}
          activeOpacity={0.8}
          onPress={() => onProductPress(product)}
        >
          {product.icon ? (
            <Image source={{ uri: product.icon }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImagePlaceholder, themeStyles.inputBg]}>
              <Ionicons
                name="image-outline"
                size={32}
                color={isDark ? "#4B5563" : "#CBD5E1"}
              />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, themeStyles.text]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <Text style={[styles.productPrice, { color: COLORS.vibrantBlue }]}>
              {formatPrice(product.best_price)}
            </Text>
            {product.market_name && (
              <Text
                style={[styles.marketName, themeStyles.subText]}
                numberOfLines={1}
              >
                {product.market_name}
              </Text>
            )}
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
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
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
  productImagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: "cover",
  },
  productInfo: { alignItems: "center" },
  productName: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    minHeight: 36,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
  marketName: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
});
