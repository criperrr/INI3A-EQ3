import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { fetchProducts, fetchCategories, ProductData } from "../services/productService";

const FALLBACK_CATEGORIES = [
  "Todos",
  "Alimentos",
  "Bebidas",
  "Hortifruti",
  "Padaria",
  "Limpeza",
  "Higiene",
  "Laticínios",
];

export default function SearchScreen() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();

  const loadCategories = useCallback(async () => {
    try {
      const remoteCategories = await fetchCategories();
      if (remoteCategories && remoteCategories.length > 0) {
        const merged = ["Todos", ...Array.from(new Set([...remoteCategories, ...FALLBACK_CATEGORIES.slice(1)]))];
        setCategories(merged);
      }
    } catch {
      // Use fallback categories
    }
  }, []);

  const loadProducts = useCallback(
    async (searchTerm: string, category: string, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const response = await fetchProducts({
          search: searchTerm.trim() || undefined,
          category: category !== "Todos" ? category : undefined,
          limit: 30,
        });
        setProducts(response.items || []);
      } catch (err) {
        console.error("[SearchScreen] Failed to load products:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      loadProducts(searchText, selectedCategory);
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText, selectedCategory, loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(searchText, selectedCategory, true);
  }, [searchText, selectedCategory, loadProducts]);

  const handleProductPress = (product: ProductData) => {
    router.push({
      pathname: "/productDetails",
      params: {
        id: product.id ? String(product.id) : undefined,
        barcode: product.barcode || product.ean || undefined,
        name: product.name,
        category: product.category,
        imageUri: product.imageUri || product.icon || undefined,
        lastPrice: product.lastPrice || "Preço não informado",
      },
    });
  };

  const handleCreateCustom = () => {
    router.push("/customRegisterProduct");
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
          {/* Header Action / Title */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.screenTitle, themeStyles.text]}>Pesquisar Produtos</Text>
              <Text style={[styles.screenSubtitle, themeStyles.subText]}>
                Encontre itens e compare preços em mercados
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addCustomBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={handleCreateCustom}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addCustomText}>Novo</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            onClear={() => setSearchText("")}
            accent={accent}
            themeStyles={themeStyles}
            isDark={isDark}
          />

          {/* Category Chips Carousel */}
          <CategoryFilterChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            accent={accent}
            themeStyles={themeStyles}
            isDark={isDark}
          />

          {/* Product Results / Loading / Empty */}
          {loading && !refreshing ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.loadingLabel, themeStyles.subText]}>Buscando produtos...</Text>
            </View>
          ) : products.length > 0 ? (
            <ProductResultsGrid
              products={products}
              onProductPress={handleProductPress}
              themeStyles={themeStyles}
              accent={accent}
            />
          ) : (
            <EmptyResults
              searchTerm={searchText}
              selectedCategory={selectedCategory}
              onCreateCustom={handleCreateCustom}
              onScanBarcode={() => router.push("/scannerProduct")}
              themeStyles={themeStyles}
              accent={accent}
            />
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
  onClear,
  accent,
  themeStyles,
  isDark,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  accent: string;
  themeStyles: any;
  isDark: boolean;
}) => {
  const placeholderColor = isDark ? "#8B949E" : "#5A6B52";

  return (
    <View style={[styles.searchBarContainer, themeStyles.card, themeStyles.border]}>
      <Ionicons name="search-outline" size={20} color={accent} style={styles.searchIcon} />
      <TextInput
        style={[styles.searchInput, themeStyles.text]}
        placeholder="Buscar por nome ou código de barras..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={placeholderColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const CategoryFilterChips = ({
  categories,
  selectedCategory,
  onSelectCategory,
  accent,
  themeStyles,
  isDark,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  accent: string;
  themeStyles: any;
  isDark: boolean;
}) => {
  return (
    <View style={styles.categoriesWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                themeStyles.card,
                themeStyles.border,
                isSelected && { backgroundColor: accent, borderColor: accent },
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  themeStyles.text,
                  isSelected && { color: "#FFFFFF", fontWeight: "700" },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const ProductResultsGrid = ({
  products,
  onProductPress,
  themeStyles,
  accent,
}: {
  products: ProductData[];
  onProductPress: (p: ProductData) => void;
  themeStyles: any;
  accent: string;
}) => {
  return (
    <View style={styles.gridContainer}>
      {products.map((product) => {
        const imageSource = product.imageUri || product.icon;
        return (
          <TouchableOpacity
            key={product.id || product.barcode || product.name}
            style={[styles.productCard, themeStyles.card, themeStyles.border]}
            activeOpacity={0.8}
            onPress={() => onProductPress(product)}
          >
            <View style={[styles.productImageContainer, themeStyles.inputBg]}>
              {imageSource ? (
                <Image source={{ uri: imageSource }} style={styles.productImage} resizeMode="contain" />
              ) : (
                <View style={styles.placeholderIconContainer}>
                  <Ionicons name="cube-outline" size={32} color={accent} />
                </View>
              )}
              {product.category && product.category !== "Sem Categoria" && (
                <View style={[styles.categoryBadge, { backgroundColor: accent }]}>
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>
                    {product.category.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.productInfo}>
              <Text style={[styles.productName, themeStyles.text]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.productPrice, { color: accent }]}>
                {product.lastPrice || "Preço não informado"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const EmptyResults = ({
  searchTerm,
  selectedCategory,
  onCreateCustom,
  onScanBarcode,
  themeStyles,
  accent,
}: {
  searchTerm: string;
  selectedCategory: string;
  onCreateCustom: () => void;
  onScanBarcode: () => void;
  themeStyles: any;
  accent: string;
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, themeStyles.inputBg]}>
        <Ionicons name="search" size={44} color={accent} />
      </View>
      <Text style={[styles.emptyTitle, themeStyles.text]}>Nenhum produto encontrado</Text>
      <Text style={[styles.emptySubtitle, themeStyles.subText]}>
        {searchTerm
          ? `Não encontramos resultados para "${searchTerm}"${selectedCategory !== "Todos" ? ` na categoria ${selectedCategory}` : ""}.`
          : "Nenhum produto cadastrado nesta categoria ainda."}
      </Text>

      <View style={styles.emptyActionsRow}>
        <TouchableOpacity
          style={[styles.emptyActionBtn, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={onScanBarcode}
        >
          <Ionicons name="barcode-outline" size={18} color="#FFF" style={styles.btnIcon} />
          <Text style={styles.emptyActionText}>Escanear Código</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.emptyActionBtn, styles.emptyOutlineBtn, themeStyles.border]}
          activeOpacity={0.8}
          onPress={onCreateCustom}
        >
          <Ionicons name="add-circle-outline" size={18} color={themeStyles.text.color} style={styles.btnIcon} />
          <Text style={[styles.emptyActionText, themeStyles.text]}>Cadastrar Manual</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  addCustomText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, height: "100%" },
  categoriesWrapper: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
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
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productImageContainer: {
    width: "100%",
    aspectRatio: 1.1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  productImage: {
    width: "90%",
    height: "90%",
  },
  placeholderIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    maxWidth: "85%",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  productInfo: {
    alignItems: "flex-start",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    minHeight: 34,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  emptyOutlineBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  emptyActionText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  btnIcon: {
    marginRight: 6,
  },
});

