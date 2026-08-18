import React from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";

const COLORS = {
  white: "#FFFFFF",
  redCancel: "#D32F2F",
};

interface ActionButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
  themeStyles: any;
  accent: string;
  t: (key: any) => string;
}

export default function ScannerConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    ean?: string;
    name?: string;
    category?: string;
    imageUri?: string;
    lastPrice?: string;
  }>();
  const { themeStyles, accent } = useTheme();
  const { t } = useI18n();

  const product = {
    id: params.id,
    category: params.category || t("scanner.confirmProduct"),
    name: params.name || t("scanner.productFound"),
    imageUri: params.imageUri || undefined,
    lastPrice: params.lastPrice || t("productDetails.noOccurrences"),
    barcode: params.barcode || params.ean || "",
    ean: params.ean || params.barcode || "",
  };

  const handleConfirm = () => {
    router.push({
      pathname: "/registerProduct",
      params: { 
        id: product.id,
        barcode: product.barcode,
        ean: product.ean,
        name: product.name,
        category: product.category,
        imageUri: product.imageUri,
        lastPrice: product.lastPrice,
      },
    });
  };

  const handleCancel = () => router.back();

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category={product.category}
            name={product.name}
            imageUri={product.imageUri}
          >
            <PriceDetails lastPrice={product.lastPrice} themeStyles={themeStyles} t={t} />
            <ActionButtons onConfirm={handleConfirm} onCancel={handleCancel} themeStyles={themeStyles} accent={accent} t={t} />
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({ lastPrice, themeStyles, t }: { lastPrice: string, themeStyles: any, t: (key: any) => string }) => (
  <View style={styles.detailsContainer}>
    <Text style={[styles.priceLabel, themeStyles.subText]}>
      {t("productDetails.lastPrice")}:
    </Text>
    <Text style={[styles.priceValue, themeStyles.text]}>{lastPrice}</Text>
  </View>
);

const ActionButtons = ({ onConfirm, onCancel, themeStyles, accent, t }: ActionButtonsProps) => (
  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.button, { backgroundColor: accent }]}
      activeOpacity={0.8}
      onPress={onConfirm}
    >
      <Text style={styles.buttonText}>{t("common.yes")}</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.button, styles.buttonNo, themeStyles.border, { borderWidth: 1 }]}
      activeOpacity={0.8}
      onPress={onCancel}
    >
      <Text style={[styles.buttonText, { color: COLORS.redCancel }]}>{t("common.no")}</Text>
    </TouchableOpacity>
  </View>
);

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  cardWrapper: { width: "100%", alignItems: "center" },
  detailsContainer: { alignItems: "center", marginBottom: 20 },
  priceLabel: { fontSize: 14, marginBottom: 4, fontWeight: "bold" },
  priceValue: { fontSize: 18, fontWeight: "bold" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 0,
  },
  buttonNo: { backgroundColor: "transparent" },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
