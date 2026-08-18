import React, { useState, useEffect, useRef, useCallback, memo } from "react";
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
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";
import { fetchProducts } from "../services/productService";

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
    name: "Leite Fresco",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "Frutas Orgânicas",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    name: "Arroz Integral",
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

const MOCK_BANNERS = [
  {
    id: "1",
    title: "Economia Inteligente",
    subtitle: "Compare e economize até 35% na sua feira",
    linkText: "Conferir",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Frutas da Estação",
    subtitle: "Qualidade fresca perto de você",
    linkText: "Ver Mais",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Mercados Locais",
    subtitle: "Encontre os melhores preços do seu bairro",
    linkText: "Explorar",
    image:
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=400&fit=crop",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { themeStyles } = useTheme();
  const { t } = useI18n();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [activeView, setActiveView] = useState<string>("products");
  const [realProducts, setRealProducts] = useState<GridItemType[]>(MOCK_PRODUCTS);

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
  }, []);

  useEffect(() => {
    if (view === "markets" || view === "products") {
      setActiveView(view);
    }
  }, [view]);

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

  const gridData = activeView === "products" ? realProducts : MOCK_MARKETS;
  const gridTitle =
    activeView === "products" ? t("products.title") : t("map.nearbyMarketsTitle");

  return (
    <ScrollView
      contentContainerStyle={[styles.content, themeStyles.bg]}
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
  const { themeStyles, accent } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = activeIndex + 1;
      let shouldAnimate = true;
      if (nextIndex >= MOCK_BANNERS.length) {
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
  }, [activeIndex]);

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
        data={MOCK_BANNERS}
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
                themeStyles.card,
                themeStyles.border,
              ]}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.bannerImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
              <Text style={[styles.bannerTitle, themeStyles.text]}>
                {item.title}
              </Text>
              <Text style={[styles.bannerSubtitle, themeStyles.subText]}>
                {item.subtitle}
              </Text>
              <Text style={[styles.bannerLink, { color: accent }]}>
                {item.linkText}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.paginationContainer}>
        {MOCK_BANNERS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
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
  const { themeStyles, isDark, accent } = useTheme();
  return (
    <View style={[styles.centralMenuBar, themeStyles.card, themeStyles.border]}>
      {tabs.map((tab) => {
        const isSelected =
          tab.actionType === "view" && tab.actionValue === activeView;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, isSelected && styles.tabButtonActive]}
            activeOpacity={0.7}
            onPress={() => onTabPress(tab)}
          >
            <View
              style={[
                styles.iconContainer,
                themeStyles.inputBg,
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
                color={isSelected ? accent : isDark ? "#F0E6D3" : "#1A2E1A"}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                themeStyles.text,
                isSelected && { color: accent, fontWeight: "700" },
              ]}
              numberOfLines={1}
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
  const { themeStyles } = useTheme();
  return (
    <View style={styles.productsSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>{title}</Text>
      <View style={styles.productGrid}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.productItem, themeStyles.card, themeStyles.border]}
            activeOpacity={0.8}
            onPress={() => onItemPress(item)}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            <Text
              style={[styles.productName, themeStyles.text]}
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

// --- Estilos ---
const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingVertical: 16 },
  bannerSection: { paddingHorizontal: 16, marginBottom: 20 },
  bannerCardFull: {
    width: "100%",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  bannerImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  bannerTitle: { fontSize: 14, fontWeight: "bold" },
  bannerSubtitle: { fontSize: 11, marginTop: 2 },
  bannerLink: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D9D9D9" },
  activeDot: { width: 18, height: 8, borderRadius: 4 },
  centralMenuBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 14,
  },
  tabButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  productsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 14 },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  productItem: {
    width: "48%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  productName: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
