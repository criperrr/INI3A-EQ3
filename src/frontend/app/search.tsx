import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { DesignSystemTokens } from "../theme/types";
import { useI18n } from "../content/i18nContext";
import { fetchProducts, fetchCategories, ProductData } from "../services/productService";
import {
  findCategoryDefinition,
  getCategoryEmoji,
  getCategoryIcon,
  getLocalizedCategoryName,
} from "../constants/productCategories";
import { getUserLocation } from "../utils/userLocation";

export default function SearchScreen() {
  const { tokens, accent, isDark } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [categories, setCategories] = useState<string[]>([t("search.filterAll")]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allCategoryLabel = t("search.filterAll");

  const loadCategories = useCallback(async () => {
    try {
      const remoteCategories = await fetchCategories();
      if (remoteCategories && Array.isArray(remoteCategories) && remoteCategories.length > 0) {
        const normalized = Array.from(
          new Set(
            remoteCategories
              .filter(Boolean)
              .map((c) => {
                const def = findCategoryDefinition(c);
                return def ? def.name : c;
              })
          )
        );
        const merged = [allCategoryLabel, ...normalized];
        setCategories(merged);
      } else {
        setCategories([allCategoryLabel]);
      }
    } catch {
      setCategories([allCategoryLabel]);
    }
  }, [allCategoryLabel]);

  const loadProducts = useCallback(
    async (searchTerm: string, category: string, isRefresh = false, pageNum = 1) => {
      if (pageNum === 1) {
        if (!isRefresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const isAll = category === allCategoryLabel || category === "Todos" || category === "All";
        const loc = await getUserLocation();

        const response = await fetchProducts({
          search: searchTerm.trim() || undefined,
          category: !isAll ? category : undefined,
          latitude: loc?.latitude,
          longitude: loc?.longitude,
          radius: 15000,
          page: pageNum,
          limit: 20,
        });

        const newItems = response.items || [];
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.total || 0);
        setPage(pageNum);

        if (pageNum === 1) {
          setProducts(newItems);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const filtered = newItems.filter((p) => !existingIds.has(p.id));
            return [...prev, ...filtered];
          });
        }
      } catch (err) {
        console.error("[SearchScreen] Failed to load products:", err);
        if (pageNum === 1) setProducts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
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
      loadProducts(searchText, selectedCategory, false, 1);
    }, 280);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText, selectedCategory, loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(searchText, selectedCategory, true, 1);
  }, [searchText, selectedCategory, loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loadingMore && !loading && !refreshing) {
      loadProducts(searchText, selectedCategory, false, page + 1);
    }
  }, [page, totalPages, loadingMore, loading, refreshing, searchText, selectedCategory, loadProducts]);

  const handleProductPress = useCallback(
    (product: ProductData) => {
      if (Platform.OS !== "web") {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }

      const navParams: Record<string, string> = {
        name: product.name || "",
      };
      if (product.id) navParams.id = String(product.id);
      if (product.barcode || product.ean) navParams.barcode = product.barcode || product.ean || "";
      if (product.category) navParams.category = product.category;
      if (product.imageUri || product.icon) navParams.imageUri = product.imageUri || product.icon || "";
      if (product.bestPrice || product.lastPrice) navParams.lastPrice = product.bestPrice || product.lastPrice || "";

      router.push({
        pathname: "/productDetails",
        params: navParams,
      });
    },
    [router]
  );

  const handleCreateCustom = useCallback(() => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    router.push("/customRegisterProduct");
  }, [router]);

  const handleScanBarcode = useCallback(() => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.push("/scannerProduct");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: ProductData }) => (
      <ProductCardItem
        product={item}
        onPress={handleProductPress}
        tokens={tokens}
        accent={accent}
        isDark={isDark}
        t={t}
      />
    ),
    [handleProductPress, tokens, accent, isDark, t]
  );

  const keyExtractor = useCallback(
    (item: ProductData, index: number) =>
      item.id ? String(item.id) : item.barcode ? `${item.barcode}_${index}` : `${item.name}_${index}`,
    []
  );

  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text
            style={[
              styles.screenTitle,
              { color: semantic.colors.text.primary, ...semantic.typography.sectionTitle },
            ]}
            numberOfLines={1}
          >
            {t("search.title")}
          </Text>
          <Text
            style={[
              styles.screenSubtitle,
              { color: semantic.colors.text.secondary, ...semantic.typography.caption },
            ]}
            numberOfLines={1}
          >
            {loading && !refreshing
              ? t("common.loading")
              : t("search.resultsCount", { count: totalCount || products.length })}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addCustomBtn,
            {
              backgroundColor: accent,
              borderRadius: semantic.radius.button,
            },
          ]}
          activeOpacity={0.8}
          onPress={handleCreateCustom}
          accessibilityRole="button"
          accessibilityLabel={t("products.customProductTitle")}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addCustomText} numberOfLines={1}>
            {t("products.customProductTitle")}
          </Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onClear={() => setSearchText("")}
        onScanBarcode={handleScanBarcode}
        accent={accent}
        tokens={tokens}
        isDark={isDark}
        t={t}
      />

      <CategoryFilterChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        accent={accent}
        tokens={tokens}
        isDark={isDark}
        t={t}
        allCategoryLabel={allCategoryLabel}
      />

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={accent} />
          <Text
            style={[
              styles.loadingLabel,
              { color: semantic.colors.text.secondary, ...semantic.typography.bodyMedium },
            ]}
          >
            {t("common.loading")}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const ListEmpty = !loading && !refreshing ? (
    <EmptyResults
      searchTerm={searchText}
      selectedCategory={selectedCategory}
      onCreateCustom={handleCreateCustom}
      onScanBarcode={handleScanBarcode}
      tokens={tokens}
      accent={accent}
      t={t}
    />
  ) : null;

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={accent} />
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: semantic.colors.surface.background }]}>
      <FlatList
        data={loading && !refreshing ? [] : products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
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
  );
}

// --- Componentes Internos Memoizados ---

const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  onClear,
  onScanBarcode,
  accent,
  tokens,
  isDark,
  t,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onScanBarcode: () => void;
  accent: string;
  tokens: DesignSystemTokens;
  isDark: boolean;
  t: (key: any) => string;
}) {
  const { semantic } = tokens;
  const placeholderColor = isDark ? "#8B949E" : "#6B7280";

  return (
    <View
      style={[
        styles.searchBarContainer,
        {
          backgroundColor: semantic.colors.surface.input,
          borderColor: semantic.colors.border.input || semantic.colors.border.default,
          borderRadius: semantic.radius.input,
        },
      ]}
    >
      <Ionicons name="search-outline" size={20} color={accent} style={styles.searchIcon} />
      <TextInput
        style={[
          styles.searchInput,
          {
            color: semantic.colors.text.primary,
            ...semantic.typography.bodyMedium,
          },
        ]}
        placeholder={t("search.placeholder")}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="never"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.searchActionBtn}
          accessibilityLabel="Limpar busca"
        >
          <Ionicons name="close-circle" size={18} color={placeholderColor} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={onScanBarcode}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.scannerBtn, { backgroundColor: accent + "18" }]}
        activeOpacity={0.7}
        accessibilityLabel={t("scanner.title")}
      >
        <Ionicons name="barcode-outline" size={18} color={accent} />
      </TouchableOpacity>
    </View>
  );
});

const CategoryFilterChips = memo(function CategoryFilterChips({
  categories,
  selectedCategory,
  onSelectCategory,
  accent,
  tokens,
  isDark,
  t,
  allCategoryLabel,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  accent: string;
  tokens: DesignSystemTokens;
  isDark: boolean;
  t: (key: any) => string;
  allCategoryLabel: string;
}) {
  const { semantic } = tokens;

  return (
    <View style={styles.categoriesWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          if (!cat) return null;
          const isSelected = selectedCategory === cat;
          const isAll = cat === allCategoryLabel || cat === "Todos" || cat === "All";
          const emoji = isAll ? "🔍" : getCategoryEmoji(cat);
          const displayName = isAll ? allCategoryLabel : getLocalizedCategoryName(cat, t);

          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? accent : semantic.colors.surface.card,
                  borderColor: isSelected ? accent : semantic.colors.border.default,
                  borderRadius: semantic.radius.chip,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS !== "web") {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                onSelectCategory(cat);
              }}
            >
              <Text style={styles.categoryChipEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: isSelected ? "#FFFFFF" : semantic.colors.text.primary,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
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
  tokens,
  accent,
  isDark,
  t,
}: {
  product: ProductData;
  onPress: (p: ProductData) => void;
  tokens: DesignSystemTokens;
  accent: string;
  isDark: boolean;
  t: (key: any) => string;
}) {
  const { semantic } = tokens;
  const imageSource = product.imageUri || product.icon;

  const isUnquoted =
    !product.bestPrice ||
    product.bestPrice === "Preço não informado" ||
    product.lastPrice === "Preço não informado" ||
    product.bestPrice === t("productDetails.noOccurrences") ||
    product.lastPrice === t("productDetails.noOccurrences");

  const hasPrice = !isUnquoted && Boolean(product.bestPrice || product.lastPrice);
  const displayPrice = product.bestPrice || product.lastPrice;

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor: semantic.colors.surface.card,
          borderColor: product.isPromotion ? accent + "80" : semantic.colors.border.default,
          borderWidth: product.isPromotion ? 1.5 : 1,
          borderRadius: semantic.radius.card,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => onPress(product)}
    >
      <View
        style={[
          styles.productImageContainer,
          {
            backgroundColor: semantic.colors.surface.input,
            borderRadius: semantic.radius.image,
          },
        ]}
      >
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.productImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.placeholderIconContainer,
              { backgroundColor: isDark ? "#2C2C2E" : "#F3F4F6" },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(product.category) as any}
              size={36}
              color={accent}
            />
          </View>
        )}

        {Boolean(product.isPromotion) ? (
          <View
            style={[
              styles.promoBadge,
              { backgroundColor: semantic.colors.feedback.error, borderRadius: semantic.radius.badge },
            ]}
          >
            <Text style={styles.promoBadgeText}>
              🔥 {product.discountPercentage ? `-${product.discountPercentage}%` : t("products.promoBadge")}
            </Text>
          </View>
        ) : Boolean(product.category && product.category !== "Sem Categoria") ? (
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: accent,
                borderRadius: semantic.radius.badge,
              },
            ]}
          >
            <Text style={styles.categoryBadgeEmoji}>{getCategoryEmoji(product.category)}</Text>
            <Text style={styles.categoryBadgeText} numberOfLines={1} ellipsizeMode="tail">
              {getLocalizedCategoryName(product.category, t).toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <Text
          style={[
            styles.productName,
            {
              color: semantic.colors.text.primary,
              ...semantic.typography.bodyMedium,
            },
          ]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        <View style={styles.priceSlot}>
          {hasPrice ? (
            <Text style={[styles.productPrice, { color: accent }]} numberOfLines={1}>
              {displayPrice}
            </Text>
          ) : (
            <View
              style={[
                styles.noPricePill,
                { backgroundColor: semantic.colors.surface.input, borderRadius: semantic.radius.badge },
              ]}
            >
              <Ionicons name="pricetag-outline" size={11} color={semantic.colors.text.secondary} />
              <Text
                style={[styles.noPriceText, { color: semantic.colors.text.secondary }]}
                numberOfLines={1}
              >
                {t("productDetails.noOccurrences")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.distanceSlot}>
          {Boolean(product.formattedDistance) ? (
            <View
              style={[
                styles.distancePill,
                {
                  backgroundColor: semantic.colors.surface.input,
                  borderColor: semantic.colors.border.subtle || semantic.colors.border.default,
                  borderRadius: semantic.radius.badge,
                },
              ]}
            >
              <Ionicons name="location" size={10} color={accent} />
              <Text
                style={[styles.distanceText, { color: semantic.colors.text.secondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {product.formattedDistance}
                {product.nearestMarketName ? ` • ${product.nearestMarketName}` : ""}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const EmptyResults = ({
  searchTerm,
  selectedCategory,
  onCreateCustom,
  onScanBarcode,
  tokens,
  accent,
  t,
}: {
  searchTerm: string;
  selectedCategory: string;
  onCreateCustom: () => void;
  onScanBarcode: () => void;
  tokens: DesignSystemTokens;
  accent: string;
  t: (key: any) => string;
}) => {
  const { semantic } = tokens;

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: semantic.colors.surface.input }]}>
        <Ionicons name="search" size={40} color={accent} />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { color: semantic.colors.text.primary, ...semantic.typography.sectionTitle },
        ]}
      >
        {t("search.noResults")}
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { color: semantic.colors.text.secondary, ...semantic.typography.body },
        ]}
      >
        {searchTerm ? t("search.noResultsSubtitle") : t("home.noProducts")}
      </Text>

      <View style={styles.emptyActionsRow}>
        <TouchableOpacity
          style={[
            styles.emptyActionBtn,
            { backgroundColor: accent, borderRadius: semantic.radius.button },
          ]}
          activeOpacity={0.8}
          onPress={onScanBarcode}
        >
          <Ionicons name="barcode-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.emptyActionText} numberOfLines={1}>
            {t("scanner.title")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.emptyActionBtn,
            styles.emptyOutlineBtn,
            {
              borderColor: semantic.colors.border.default,
              borderRadius: semantic.radius.button,
            },
          ]}
          activeOpacity={0.8}
          onPress={onCreateCustom}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={semantic.colors.text.primary}
            style={styles.btnIcon}
          />
          <Text
            style={[styles.emptyActionText, { color: semantic.colors.text.primary }]}
            numberOfLines={1}
          >
            {t("products.customProductTitle")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Estilos Estruturais ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  headerContainer: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  titleColumn: {
    flex: 1,
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
    gap: 4,
    flexShrink: 0,
  },
  addCustomText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  searchActionBtn: {
    padding: 4,
    marginRight: 4,
  },
  scannerBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesWrapper: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 13,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingLabel: {
    fontSize: 13,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productCard: {
    width: "48.2%",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productImageContainer: {
    width: "100%",
    aspectRatio: 1.2,
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
    width: "100%",
    height: "100%",
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
    paddingVertical: 2.5,
    gap: 3,
  },
  categoryBadgeEmoji: {
    fontSize: 10,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  productInfo: {
    alignItems: "flex-start",
    width: "100%",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    minHeight: 34,
    lineHeight: 17,
  },
  priceSlot: {
    minHeight: 24,
    justifyContent: "center",
    marginBottom: 2,
    width: "100%",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
  noPricePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    maxWidth: "100%",
  },
  noPriceText: {
    fontSize: 10,
    fontWeight: "500",
  },
  distanceSlot: {
    minHeight: 22,
    justifyContent: "center",
    width: "100%",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderWidth: 1,
    gap: 4,
    width: "100%",
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexGrow: 1,
    flexBasis: "45%",
    maxWidth: "100%",
  },
  emptyOutlineBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  btnIcon: {
    marginRight: 6,
  },
});
