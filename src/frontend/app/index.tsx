import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useTabNavigation } from "../content/tabNavigationContext";
import { fetchProducts } from "../services/productService";
import { fetchMarkets } from "../services/marketService";
import { getUserLocation } from "../utils/userLocation";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

// --- Tipagens (TypeScript) ---
type TabType = {
  id: string;
  label: string;
  icon: string;
  actionType: string;
  actionValue: string;
};

type GridItemType = {
  id: number;
  name: string;
  image: string;
  price?: string;
  category?: string;
  isPromotion?: boolean;
  discountPercentage?: number | null;
  formattedDistance?: string | null;
  nearestMarketName?: string | null;
};

// --- Mocks ---
const MOCK_PRODUCTS: GridItemType[] = [
  {
    id: 1,
    name: "Café Especial Torrado 500g",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
    price: "R$ 14,90",
    isPromotion: true,
    discountPercentage: 40,
  },
  {
    id: 2,
    name: "Azeite de Oliva Extra Virgem",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
    price: "R$ 26,90",
    isPromotion: true,
    discountPercentage: 32,
  },
  {
    id: 3,
    name: "Leite Integral Orgânico",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
    price: "R$ 4,29",
    isPromotion: true,
    discountPercentage: 34,
  },
  {
    id: 4,
    name: "Arroz Nobre Tipo 1 5kg",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
    price: "R$ 22,90",
  },
  {
    id: 5,
    name: "Pão Artesanal 500g",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    price: "R$ 7,90",
  },
  {
    id: 6,
    name: "Chocolate Meio Amargo 70%",
    image:
      "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&h=400&fit=crop",
    price: "R$ 5,99",
    isPromotion: true,
    discountPercentage: 33,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();
  const { resetHomeTrigger } = useTabNavigation();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [activeView, setActiveView] = useState<string>("products");
  const [realProducts, setRealProducts] = useState<GridItemType[]>(MOCK_PRODUCTS);
  const [realMarkets, setRealMarkets] = useState<GridItemType[]>([]);
  const [hasLocation, setHasLocation] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const actionTabs: TabType[] = [
    {
      id: "1",
      label: t("navigation.map"),
      icon: "location-outline",
      actionType: "route",
      actionValue: "/map",
    },
    {
      id: "2",
      label: t("navigation.products"),
      icon: "cube-outline",
      actionType: "route",
      actionValue: "/search",
    },
    {
      id: "3",
      label: t("navigation.help"),
      icon: "help-circle-outline",
      actionType: "route",
      actionValue: "/help",
    },
    {
      id: "4",
      label: t("navigation.about"),
      icon: "information-circle-outline",
      actionType: "route",
      actionValue: "/about",
    },
  ];

  const loadProductsAndMarkets = useCallback(async () => {
    let loc = null;
    try {
      loc = await getUserLocation();
      if (loc) setHasLocation(true);

      const res = await fetchProducts({
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        radius: 15000,
        limit: 6,
      });

      if (res.items && res.items.length > 0) {
        const mapped: GridItemType[] = res.items.map((p) => ({
          id: p.id || Math.random(),
          name: p.name,
          category: p.category,
          price: p.bestPrice || p.lastPrice,
          image:
            p.imageUri ||
            p.icon ||
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
          isPromotion: p.isPromotion,
          discountPercentage: p.discountPercentage,
          formattedDistance: p.formattedDistance,
          nearestMarketName: p.nearestMarketName,
        }));
        setRealProducts(mapped);
      }
    } catch {
      // Graceful fallback
    }

    try {
      const markets = await fetchMarkets(
        loc
          ? {
              latitude: loc.latitude,
              longitude: loc.longitude,
              radius: 15000,
            }
          : undefined
      );
      if (markets && markets.length > 0) {
        const marketImages = [
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop",
        ];
        const mapped: GridItemType[] = markets.map((m, idx) => ({
          id: m.id,
          name: m.name,
          image: marketImages[idx % marketImages.length]!,
        }));
        setRealMarkets(mapped);
      } else {
        setRealMarkets([]);
      }
    } catch {
      setRealMarkets([]);
    }
  }, []);

  useEffect(() => {
    loadProductsAndMarkets();
  }, [loadProductsAndMarkets]);

  useEffect(() => {
    if (view === "markets" || view === "products") {
      setActiveView(view);
    }
  }, [view]);

  useEffect(() => {
    if (resetHomeTrigger > 0) {
      setActiveView("products");
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [resetHomeTrigger]);

  const handleItemPress = useCallback((item: GridItemType) => {
    if (activeView === "products") {
      router.push({
        pathname: "/productDetails",
        params: {
          id: String(item.id),
          name: item.name,
          imageUri: item.image,
          lastPrice: item.price,
        },
      });
    } else {
      router.push("/map");
    }
  }, [activeView, router]);

  const handleTabAction = useCallback((tab: TabType) => {
    if (tab.actionType === "view") {
      setActiveView(tab.actionValue);
    } else if (tab.actionType === "route") {
      router.push(tab.actionValue as any);
    }
  }, [router]);

  const gridData = activeView === "products" ? realProducts : realMarkets;
  const gridTitle =
    activeView === "products"
      ? (hasLocation ? t("home.nearbyOffers") : t("products.title"))
      : t("map.nearbyMarketsTitle");
  const gridSubtitle = activeView === "products" ? t("home.radiusFilter15km") : undefined;

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={[
        styles.content,
        { backgroundColor: semantic.colors.surface.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Banner />
      <ActionMenu
        onTabPress={handleTabAction}
        tabs={actionTabs}
        activeView={activeView}
      />
      <ItemsGrid
        title={gridTitle}
        subtitle={gridSubtitle}
        data={gridData}
        isProductView={activeView === "products"}
        onItemPress={handleItemPress}
      />
    </ScrollView>
  );
}

const Banner = memo(function Banner() {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const banners = useMemo(
    () => [
      {
        id: "1",
        title: t("home.banner1Title"),
        subtitle: t("home.banner1Subtitle"),
        linkText: t("home.banner1Action"),
        image:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop",
      },
      {
        id: "2",
        title: t("home.banner2Title"),
        subtitle: t("home.banner2Subtitle"),
        linkText: t("home.banner2Action"),
        image:
          "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=400&fit=crop",
      },
      {
        id: "3",
        title: t("home.banner3Title"),
        subtitle: t("home.banner3Subtitle"),
        linkText: t("home.banner3Action"),
        image:
          "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=400&fit=crop",
      },
    ],
    [t]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = activeIndex + 1;
      let shouldAnimate = true;
      if (nextIndex >= banners.length) {
        nextIndex = 0;
        shouldAnimate = false;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: shouldAnimate,
      });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, banners.length]);

  const handleScroll = useCallback((event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [activeIndex]);

  return (
    <View style={styles.bannerSection}>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <View
              style={[
                styles.bannerCardFull,
                {
                  backgroundColor: semantic.colors.surface.card,
                  borderColor: semantic.colors.border.default,
                  borderRadius: semantic.radius.button,
                  padding: semantic.spacing.elementGap,
                },
              ]}
            >
              <Image
                source={{ uri: item.image }}
                style={[styles.bannerImage, { borderRadius: semantic.radius.chip }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
              <Text
                style={[
                  styles.bannerTitle,
                  {
                    color: semantic.colors.text.primary,
                    ...semantic.typography.bodyBold,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.bannerSubtitle,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.caption,
                  },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.subtitle}
              </Text>
              <Text
                style={[
                  styles.bannerLink,
                  {
                    color: accent,
                    ...semantic.typography.caption,
                    fontWeight: "600",
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.linkText}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.paginationContainer}>
        {banners.map((_: any, index: number) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: semantic.colors.border.subtle },
              activeIndex === index && [
                styles.activeDot,
                { backgroundColor: accent },
              ],
            ]}
          />
        ))}
      </View>
    </View>
  );
});

const ActionMenu = memo(function ActionMenu({
  onTabPress,
  tabs,
  activeView,
}: {
  onTabPress: (tab: TabType) => void;
  tabs: TabType[];
  activeView: string;
}) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;

  return (
    <View
      style={[
        styles.centralMenuBar,
        {
          backgroundColor: semantic.colors.surface.card,
          borderColor: semantic.colors.border.default,
          borderRadius: semantic.radius.card,
          paddingVertical: semantic.spacing.elementGap,
          paddingHorizontal: semantic.spacing.microGap,
          marginBottom: semantic.spacing.sectionGap,
          ...semantic.elevation.card,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isSelected =
          tab.actionType === "view" && tab.actionValue === activeView;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              { borderRadius: semantic.radius.chip },
              isSelected && styles.tabButtonActive,
            ]}
            activeOpacity={0.7}
            onPress={() => onTabPress(tab)}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: semantic.colors.surface.input,
                  borderRadius: semantic.radius.chip,
                },
                isSelected && {
                  backgroundColor: accent + "25",
                  borderColor: accent,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isSelected ? accent : semantic.colors.icon.primary}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isSelected ? accent : semantic.colors.text.primary,
                  fontWeight: isSelected ? "700" : "600",
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const ItemsGrid = memo(function ItemsGrid({
  title,
  subtitle,
  data,
  isProductView = false,
  onItemPress,
}: {
  title: string;
  subtitle?: string;
  data: GridItemType[];
  isProductView?: boolean;
  onItemPress: (item: GridItemType) => void;
}) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  return (
    <View style={[styles.productsSection, { paddingHorizontal: semantic.spacing.itemGap }]}>
      <View style={styles.sectionHeaderRow}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: semantic.colors.text.primary,
              ...semantic.typography.sectionTitle,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <View style={[styles.radiusTag, { backgroundColor: accent + "18", borderColor: accent + "40" }]}>
            <Ionicons name="navigate-circle-outline" size={13} color={accent} />
            <Text style={[styles.radiusTagText, { color: accent }]}>{subtitle}</Text>
          </View>
        )}
      </View>
      <View style={styles.productGrid}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.productItem,
              {
                backgroundColor: semantic.colors.surface.card,
                borderColor: item.isPromotion ? accent + "60" : semantic.colors.border.default,
                borderRadius: semantic.radius.chip,
                padding: semantic.spacing.elementGap,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => onItemPress(item)}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.image }}
                style={[
                  styles.productImage,
                  { borderRadius: semantic.radius.badge },
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
              {isProductView && item.isPromotion && (
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>
                    🔥 {item.discountPercentage ? `-${item.discountPercentage}%` : t("products.promoBadge")}
                  </Text>
                </View>
              )}
            </View>
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
              {item.name}
            </Text>

            {isProductView && item.price && item.price !== "Preço não informado" && (
              <View style={styles.priceRow}>
                <Text style={[styles.productPrice, { color: accent }]}>
                  {item.price}
                </Text>
              </View>
            )}

            {isProductView && item.formattedDistance && (
              <View style={[styles.distancePill, { backgroundColor: semantic.colors.surface.input }]}>
                <Ionicons name="location" size={11} color={accent} />
                <Text
                  style={[styles.distanceText, { color: semantic.colors.text.secondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.formattedDistance}{item.nearestMarketName ? ` • ${item.nearestMarketName}` : ""}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// --- Estilos Estruturais ---
const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingVertical: 16 },
  bannerSection: { paddingHorizontal: 16, marginBottom: 20 },
  bannerCardFull: {
    width: "100%",
    borderWidth: 1,
  },
  bannerImage: {
    width: "100%",
    height: 120,
    marginBottom: 8,
  },
  bannerTitle: {},
  bannerSubtitle: { marginTop: 2 },
  bannerLink: { marginTop: 6 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: { width: 18, height: 8, borderRadius: 4 },
  centralMenuBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tabButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  productsSection: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitle: {},
  radiusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  radiusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  productItem: {
    width: "48%",
    alignItems: "flex-start",
    borderWidth: 1,
    marginBottom: 4,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1.15,
    marginBottom: 8,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#E53935",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  productName: {
    minHeight: 34,
    marginBottom: 4,
  },
  priceRow: {
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    width: "100%",
    marginTop: 2,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
});
