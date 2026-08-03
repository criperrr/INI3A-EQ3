import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

// --- Mocks ---
const MOCK_PRODUCTS = [
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

const MOCK_BANNERS = [
  {
    id: "1",
    title: "Legumes da Horta",
    subtitle: "Desconto em itens selecionados",
    linkText: "Ver Ofertas",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Frutas Frescas",
    subtitle: "Chegaram hoje do produtor",
    linkText: "Aproveitar",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Padaria Artesanal",
    subtitle: "Pães quentinhos saindo agora",
    linkText: "Comprar",
    image:
      "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop",
  },
];

const ACTION_TABS = [
  { id: "markets", label: "Mercados", icon: "storefront-outline", route: "/map" },
  { id: "products", label: "Produtos", icon: "cart-outline", route: "/search" },
  { id: "help", label: "Ajuda", icon: "help-buoy-outline", route: "/aboutUs" },
  { id: "about", label: "Sobre Nós", icon: "leaf-outline", route: "/aboutUs" },
];

export default function Index() {
  const router = useRouter();
  const { themeStyles } = useTheme();

  const handleProductPress = () => {
    router.push("/productDetails");
  };



  return (
    <ScrollView
      contentContainerStyle={[styles.content, themeStyles.bg]}
      showsVerticalScrollIndicator={false}
    >
      <Banner />
      <ActionMenu />
      <ProductGrid onProductPress={handleProductPress} />
    </ScrollView>
  );
}

// --- Componentes Internos com Temas Dinâmicos ---
const Banner = () => {
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

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

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
                resizeMode="cover"
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
};

const ActionMenu = () => {
  const router = useRouter();
  const { themeStyles, isDark } = useTheme();
  return (
    <View style={[styles.centralMenuBar, themeStyles.card, themeStyles.border]}>
      {ACTION_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabButton}
          activeOpacity={0.7}
          onPress={() => router.push(tab.route as any)}
        >
          <View style={[styles.iconContainer, themeStyles.inputBg]}>
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={isDark ? "#F0E6D3" : "#1A2E1A"}
            />
          </View>
          <Text style={[styles.tabLabel, themeStyles.text]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ProductGrid = ({ onProductPress }: { onProductPress: () => void }) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.productsSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>Produtos</Text>
      <View style={styles.productGrid}>
        {MOCK_PRODUCTS.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={[styles.productItem, themeStyles.card, themeStyles.border]}
            activeOpacity={0.8}
            onPress={onProductPress}
          >
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <Text
              style={[styles.productName, themeStyles.text]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  bannerSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
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
  bannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  bannerLink: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9D9D9",
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centralMenuBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  productsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },
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
  productName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
