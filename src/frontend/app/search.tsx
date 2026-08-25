import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { fetchProducts, fetchCategories, ProductData } from "../services/productService";
import { getCategoryEmoji, getLocalizedCategoryName } from "../constants/productCategories";

export default function SearchScreen() {
  const { themeStyles, accent, isDark } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [categories, setCategories] = useState<string[]>([t("search.filterAll")]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allCategoryLabel = t("search.filterAll");

  const loadCategories = useCallback(async () => {
    try {
      const remoteCategories = await fetchCategories();
      if (remoteCategories && remoteCategories.length > 0) {
        const merged = [allCategoryLabel, ...Array.from(new Set(remoteCategories))];
        setCategories(merged);
      } else {
        setCategories([allCategoryLabel]);
      }
    } catch {
      setCategories([allCategoryLabel]);
    }
  }, [allCategoryLabel]);

  const loadProducts = useCallback(
    async (searchTerm: string, category: string, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const isAll = category === allCategoryLabel || category === "Todos" || category === "All";
        const response = await fetchProducts({
          search: searchTerm.trim() || undefined,
          category: !isAll ? category : undefined,
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
    [allCategoryLabel]
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
    }, 280);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText, selectedCategory, loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(searchText, selectedCategory, true);
  }, [searchText, selectedCategory, loadProducts]);

  const handleProductPress = useCallback((product: ProductData) => {
    router.push({
      pathname: "/productDetails",
      params: {
        id: product.id ? String(product.id) : undefined,
        barcode: product.barcode || product.ean || undefined,
        name: product.name,
        category: product.category,
        imageUri: product.imageUri || product.icon || undefined,
        lastPrice: product.lastPrice || t("productDetails.noOccurrences"),
      },
    });
  }, [router, t]);

  const handleCreateCustom = useCallback(() => {
    router.push("/customRegisterProduct");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: ProductData }) => (
      <ProductCardItem
        product={item}
        onPress={handleProductPress}
        themeStyles={themeStyles}
        accent={accent}
        t={t}
      />
    ),
    [handleProductPress, themeStyles, accent, t]
  );

  const keyExtractor = useCallback(
    (item: ProductData, index: number) =>
      item.id ? String(item.id) : item.barcode ? `${item.barcode}_${index}` : `${item.name}_${index}`,
    []
  );

  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.screenTitle, themeStyles.text]} numberOfLines={1}>{t("search.title")}</Text>
          <Text style={[styles.screenSubtitle, themeStyles.subText]} numberOfLines={1}>
            {t("home.welcomeSubtitle")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addCustomBtn, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={handleCreateCustom}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addCustomText} numberOfLines={1}>{t("products.customProductTitle").split(" ")[0]}</Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onClear={() => setSearchText("")}
        accent={accent}
        themeStyles={themeStyles}
        isDark={isDark}
        t={t}
      />

      <CategoryFilterChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        accent={accent}
        themeStyles={themeStyles}
        isDark={isDark}
        t={t}
        allCategoryLabel={allCategoryLabel}
      />

      {loading && !refreshing && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingLabel, themeStyles.subText]}>{t("common.loading")}</Text>
        </View>
      )}
    </View>
  );

  const ListEmpty = !loading && !refreshing ? (
    <EmptyResults
      searchTerm={searchText}
      selectedCategory={selectedCategory}
      onCreateCustom={handleCreateCustom}
      onScanBarcode={() => router.push("/scannerProduct")}
      themeStyles={themeStyles}
      accent={accent}
      t={t}
    />
  ) : null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <FlatList
          data={loading && !refreshing ? [] : products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accent}
              colors={[accent]}
            />
          }
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

// --- Componentes Internos Memoizados ---

const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  onClear,
  accent,
  themeStyles,
  isDark,
  t,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  accent: string;
  themeStyles: any;
  isDark: boolean;
  t: (key: any) => string;
}) {
  const placeholderColor = isDark ? "#8B949E" : "#5A6B52";

  return (
    <View style={[styles.searchBarContainer, themeStyles.card, themeStyles.border]}>
      <Ionicons name="search-outline" size={20} color={accent} style={styles.searchIcon} />
      <TextInput
        style={[styles.searchInput, themeStyles.text]}
        placeholder={t("search.placeholder")}
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
});

const CategoryFilterChips = memo(function CategoryFilterChips({
  categories,
  selectedCategory,
  onSelectCategory,
  accent,
  themeStyles,
  isDark,
  t,
  allCategoryLabel,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  accent: string;
  themeStyles: any;
  isDark: boolean;
  t: (key: any) => string;
  allCategoryLabel: string;
}) {
  return (
    <View style={styles.categoriesWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const isAll = cat === allCategoryLabel || cat === "Todos" || cat === "All";
          const emoji = isAll ? "🔍" : getCategoryEmoji(cat);
          const displayName = isAll ? allCategoryLabel : getLocalizedCategoryName(cat, t);

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
              <Text style={styles.categoryChipEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  themeStyles.text,
                  isSelected && { color: "#FFFFFF", fontWeight: "700" },
                ]}
              >
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const ProductCardItem = memo(function ProductCardItem({
  product,
  onPress,
  themeStyles,
  accent,
  t,
}: {
  product: ProductData;
  onPress: (p: ProductData) => void;
  themeStyles: any;
  accent: string;
  t: (key: any) => string;
}) {
  const imageSource = product.imageUri || product.icon;

  return (
    <TouchableOpacity
      style={[styles.productCard, themeStyles.card, themeStyles.border]}
      activeOpacity={0.8}
      onPress={() => onPress(product)}
    >
      <View style={[styles.productImageContainer, themeStyles.inputBg]}>
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.productImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderIconContainer}>
            <Ionicons name="cube-outline" size={32} color={accent} />
          </View>
        )}
        {product.category && product.category !== "Sem Categoria" && (
          <View style={[styles.categoryBadge, { backgroundColor: accent }]}>
            <Text style={styles.categoryBadgeEmoji}>{getCategoryEmoji(product.category)}</Text>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {getLocalizedCategoryName(product.category, t).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={[styles.productName, themeStyles.text]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.productPrice, { color: accent }]}>
          {product.lastPrice || t("productDetails.noOccurrences")}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const EmptyResults = ({
  searchTerm,
  selectedCategory,
  onCreateCustom,
  onScanBarcode,
  themeStyles,
  accent,
  t,
}: {
  searchTerm: string;
  selectedCategory: string;
  onCreateCustom: () => void;
  onScanBarcode: () => void;
  themeStyles: any;
  accent: string;
  t: (key: any) => string;
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, themeStyles.inputBg]}>
        <Ionicons name="search" size={44} color={accent} />
      </View>
      <Text style={[styles.emptyTitle, themeStyles.text]}>{t("search.noResults")}</Text>
      <Text style={[styles.emptySubtitle, themeStyles.subText]}>
        {searchTerm
          ? t("search.noResultsSubtitle")
          : t("home.noProducts")}
      </Text>

      <View style={styles.emptyActionsRow}>
        <TouchableOpacity
          style={[styles.emptyActionBtn, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={onScanBarcode}
        >
          <Ionicons name="barcode-outline" size={18} color="#FFF" style={styles.btnIcon} />
          <Text style={styles.emptyActionText} numberOfLines={1} ellipsizeMode="tail">
            {t("scanner.title")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.emptyActionBtn, styles.emptyOutlineBtn, themeStyles.border]}
          activeOpacity={0.8}
          onPress={onCreateCustom}
        >
          <Ionicons name="add-circle-outline" size={18} color={themeStyles.text.color} style={styles.btnIcon} />
          <Text style={[styles.emptyActionText, themeStyles.text]} numberOfLines={1} ellipsizeMode="tail">
            {t("products.customProductTitle")}
          </Text>
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
    flexShrink: 0,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipEmoji: {
    fontSize: 13,
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
  headerContainer: {
    marginBottom: 4,
  },
  columnWrapper: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  productCard: {
    flex: 1,
    maxWidth: "48.5%",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productImageContainer: {
    width: "100%",
    aspectRatio: 1.2,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  productImage: {
    width: "100%",
    height: "100%",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  categoryBadgeEmoji: {
    fontSize: 10,
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
    marginBottom: 6,
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
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexGrow: 1,
    flexBasis: "45%",
    maxWidth: "100%",
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

