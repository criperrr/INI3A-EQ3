import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { fetchProducts, ProductItem } from "../services/productService";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop";

export default function SearchScreen() {
  const [searchText, setSearchText] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  const { themeStyles, accent } = useTheme();

  const loadProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await fetchProducts(query);
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadProducts(searchText);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchText, loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(searchText);
  };

  const handleProductPress = (item: ProductItem) => {
    router.push({
      pathname: "/productDetails",
      params: {
        id: String(item.id),
        name: item.name,
        category: item.description || "Geral",
        imageUri: item.icon || "",
        barcode: item.ean || "",
        lastPrice: item.lastPrice || "Preço não informado",
      },
    });
  };

  const handleNewProduct = () => {
    router.push({
      pathname: "/customRegisterProduct" as any,
      params: { name: searchText },
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accent}
              colors={[accent]}
            />
          }
        >
          <SearchBar value={searchText} onChangeText={setSearchText} />

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.loadingText, themeStyles.subText]}>
                Buscando produtos...
              </Text>
            </View>
          ) : products.length > 0 ? (
            <ProductResultsGrid
              products={products}
              onProductPress={handleProductPress}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={56}
                color={accent}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, themeStyles.text]}>
                Nenhum produto encontrado
              </Text>
              <Text style={[styles.emptySubtitle, themeStyles.subText]}>
                {searchText
                  ? `Não encontramos resultados para "${searchText}".`
                  : "Nenhum produto cadastrado no momento."}
              </Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: accent }]}
                activeOpacity={0.8}
                onPress={handleNewProduct}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" style={styles.createBtnIcon} />
                <Text style={styles.createBtnText}>Cadastrar Produto</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
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
        placeholder="Buscar produto por nome ou código..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
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
  products: ProductItem[];
  onProductPress: (item: ProductItem) => void;
}) => {
  const { themeStyles, isDark } = useTheme();

  return (
    <View style={styles.gridContainer}>
      {products.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.productCard, themeStyles.card, themeStyles.border]}
          activeOpacity={0.8}
          onPress={() => onProductPress(item)}
        >
          <Image
            source={{ uri: item.icon || FALLBACK_IMAGE }}
            style={styles.productImage}
            resizeMode="cover"
          />

          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, themeStyles.text]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.description ? (
              <Text
                style={[styles.productCategory, themeStyles.subText]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            ) : null}
            {item.ean ? (
              <Text style={[styles.productEan, { color: isDark ? "#8B949E" : "#5A6B52" }]}>
                {item.ean}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 30 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, height: "100%" },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
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
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  productInfo: { alignItems: "center" },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
    minHeight: 34,
  },
  productCategory: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 2,
  },
  productEan: {
    fontSize: 10,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  createBtnIcon: {
    marginRight: 8,
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});

