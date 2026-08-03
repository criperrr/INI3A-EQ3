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

const COLORS = {
  darkBlue: "#273462",
  vibrantBlue: "#0062CC",
  white: "#FFFFFF",
};

// --- Mocks ---
const MOCK_PRODUCTS = [
  { id: 1, name: "Pão Artesanal" },
  { id: 2, name: "Leite Fresco" },
  { id: 3, name: "Frutas Orgânicas" },
  { id: 4, name: "Arroz Integral" },
  { id: 5, name: "Frutas Tropicais" },
  { id: 6, name: "Legumes Selecionados" },
];

const MOCK_BANNERS = [
  {
    id: "1",
    title: "Legumes da Horta",
    subtitle: "Desconto em itens selecionados",
    linkText: "Ver Ofertas",
  },
  {
    id: "2",
    title: "Frutas Frescas",
    subtitle: "Chegaram hoje do produtor",
    linkText: "Aproveitar",
  },
  {
    id: "3",
    title: "Padaria Artesanal",
    subtitle: "Pães quentinhos saindo agora",
    linkText: "Comprar",
  },
];

const MENU_ICONS = [
  "cart-outline",
  "nutrition-outline",
  "book-outline",
  "custom-logo",
];

export default function Index() {
  const router = useRouter();
  const { themeStyles } = useTheme();

  const handleProductPress = () => {
    router.push("/productDetails");
  };

  const handleAboutUsPress = () => {
    router.push("/aboutUs");
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, themeStyles.bg]}
      showsVerticalScrollIndicator={false}
    >
      <Banner />
      <ActionMenu onAboutUsPress={handleAboutUsPress} />
      <ProductGrid onProductPress={handleProductPress} />
    </ScrollView>
  );
}

// --- Componentes Internos com Temas Dinâmicos ---
const Banner = () => {
  const { themeStyles } = useTheme();
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
              <View
                style={[styles.imagePlaceholderLarge, themeStyles.inputBg]}
              />
              <Text style={[styles.bannerTitle, themeStyles.text]}>
                {item.title}
              </Text>
              <Text style={[styles.bannerSubtitle, themeStyles.subText]}>
                {item.subtitle}
              </Text>
              <Text style={styles.bannerLink}>{item.linkText}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.paginationContainer}>
        {MOCK_BANNERS.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
};

const ActionMenu = ({ onAboutUsPress }: { onAboutUsPress: () => void }) => {
  const { themeStyles, isDark } = useTheme();
  return (
    <View style={[styles.centralMenuBar, themeStyles.card, themeStyles.border]}>
      {MENU_ICONS.map((icon, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.centralButton, themeStyles.inputBg]}
          activeOpacity={0.7}
          onPress={() => {
            if (icon === "custom-logo") {
              onAboutUsPress();
            }
          }}
        >
          {icon === "custom-logo" ? (
            <Image
              source={
                isDark
                  ? require("../components/images/logo-darkmode.png")
                  : require("../components/images/logo-preta.png")
              }
              style={styles.logoIcon}
              resizeMode="contain"
            />
          ) : (
            <Ionicons
              name={icon as any}
              size={24}
              color={isDark ? "#FFFFFF" : COLORS.darkBlue}
            />
          )}
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
            <View
              style={[styles.imagePlaceholderSquare, themeStyles.inputBg]}
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
  imagePlaceholderLarge: {
    width: "100%",
    height: 100,
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
    color: COLORS.vibrantBlue,
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
    backgroundColor: COLORS.vibrantBlue,
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
  centralButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIcon: {
    width: 24,
    height: 24,
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
  imagePlaceholderSquare: {
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
