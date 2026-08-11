import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";

const MOCK_PRODUCT = {
  category: "Produto",
  name: "Cebola Granel 1kg",
  imageUrl:
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop", // placeholder mais bonito
  lastPrice: "R$ 7,75",
  pricePerUnit: "R$ 7,75 kg",
};

const MOCK_PRICE_HISTORY = [45, 30, 55, 40, 35, 42, 48, 65, 50, 32, 40, 52];

export default function ProductDetails() {
  const { themeStyles, accent } = useTheme();

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category={MOCK_PRODUCT.category}
            name={MOCK_PRODUCT.name}
            imageUri={MOCK_PRODUCT.imageUrl}
          >
            <PriceDetails themeStyles={themeStyles} />
            <PriceChart themeStyles={themeStyles} accent={accent} />
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({ themeStyles }: { themeStyles: any }) => (
  <View style={styles.detailsContainer}>
    <Text style={[styles.priceLabel, themeStyles.subText]}>Último preço:</Text>
    <Text style={[styles.priceValue, themeStyles.text]}>
      {MOCK_PRODUCT.lastPrice}
    </Text>
    <Text style={[styles.priceSubValue, themeStyles.subText]}>
      {MOCK_PRODUCT.pricePerUnit}
    </Text>
  </View>
);

const PriceChart = ({
  themeStyles,
  accent,
}: {
  themeStyles: any;
  accent: string;
}) => (
  <View style={styles.chartSection}>
    <Text style={[styles.chartTitle, themeStyles.text]}>
      Histórico de preço:
    </Text>
    <View
      style={[styles.chartContainer, themeStyles.inputBg, themeStyles.border]}
    >
      <View style={styles.chartWrapperInner}>
        {MOCK_PRICE_HISTORY.map((heightValue, index) => (
          <View key={index} style={styles.barWrapper}>
            <View
              style={[
                styles.chartBar,
                {
                  height: `${heightValue}%`,
                  backgroundColor: accent,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  </View>
);

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingVertical: 16, // alinhado com o index.tsx
    paddingHorizontal: 16,
    justifyContent: "flex-start", // mudado para flex-start para não centralizar estranho
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
  },
  detailsContainer: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
  },
  priceSubValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  chartSection: {
    width: "100%",
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    height: 140,
    justifyContent: "flex-end",
    borderWidth: 1,
    overflow: "hidden",
  },
  chartWrapperInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
    width: "100%",
  },
  barWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    marginHorizontal: 2,
  },
  chartBar: {
    width: "100%",
    maxWidth: 12,
    borderRadius: 6,
    opacity: 0.9,
  },
});
