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
};

// --- Mocks ---
const MOCK_PRODUCTS: GridItemType[] = [
  {
    id: 1,
    name: "Pão Artesanal",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
  },
  {
    id: 2,
    name: "Café Especial Torrado",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "Leite Integral Orgânico",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    name: "Arroz Parboilizado 5kg",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
  },
  {
    id: 5,
    name: "Frutas Tropicais",
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=400&fit=crop",
  },
  {
    id: 6,
    name: "Legumes Selecionados",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop",
  },
];

const MOCK_MARKETS: GridItemType[] = [
  {
    id: 1,
    name: "Mercado Central",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
  },
  {
    id: 2,
    name: "Quitanda da Esquina",
    image:
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "Supermercado Viva",
    image:
      "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    name: "Armazém Orgânico",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop",
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
  const [realMarkets, setRealMarkets] = useState<GridItemType[]>(MOCK_MARKETS);
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

  useEffect(() => {
    fetchProducts({ limit: 6 })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          const mapped: GridItemType[] = res.items.map((p) => ({
            id: p.id || Math.random(),
            name: p.name,
            image:
              p.imageUri ||
              p.icon ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
          }));
          setRealProducts(mapped);
        }
      })
      .catch(() => {});

    fetchMarkets()
      .then((markets) => {
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
        }
      })
      .catch(() => {});
  }, []);

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
    activeView === "products" ? t("products.title") : t("map.nearbyMarketsTitle");

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
        data={gridData}
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
  data,
  onItemPress,
}: {
  title: string;
  data: GridItemType[];
  onItemPress: (item: GridItemType) => void;
}) {
  const { tokens } = useTheme();
  const { semantic } = tokens;

  return (
    <View style={[styles.productsSection, { paddingHorizontal: semantic.spacing.itemGap }]}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: semantic.colors.text.primary,
            ...semantic.typography.sectionTitle,
            marginBottom: semantic.spacing.elementGap + 2,
          },
        ]}
      >
        {title}
      </Text>
      <View style={styles.productGrid}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.productItem,
              {
                backgroundColor: semantic.colors.surface.card,
                borderColor: semantic.colors.border.default,
                borderRadius: semantic.radius.chip,
                padding: semantic.spacing.elementGap,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => onItemPress(item)}
          >
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
  productsSection: {},
  sectionTitle: {},
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  productItem: {
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 8,
  },
  productName: { textAlign: "center" },
});
