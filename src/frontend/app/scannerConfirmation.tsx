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

const COLORS = {
  white: "#FFFFFF",
  greenConfirm: "#388E3C",
  redCancel: "#D32F2F",
};

interface ActionButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ScannerConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { themeStyles } = useTheme();

  const product = {
    category: (params.category as string) || "Produto Encontrado",
    name: (params.name as string) || "Nome indisponível",
    imageUri: (params.imageUri as string) || "https://via.placeholder.com/150",
    lastPrice: (params.lastPrice as string) || "Preço não informado",
    barcode: (params.barcode as string) || "",
  };

  const handleConfirm = () => {
    router.push({
      pathname: "/registerProduct",
      params: { barcode: product.barcode },
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
            <PriceDetails lastPrice={product.lastPrice} />
            <ActionButtons onConfirm={handleConfirm} onCancel={handleCancel} />
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({ lastPrice }: { lastPrice: string }) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.detailsContainer}>
      <Text style={[styles.priceLabel, themeStyles.subText]}>
        Último Preço:
      </Text>
      <Text style={[styles.priceValue, themeStyles.text]}>{lastPrice}</Text>
    </View>
  );
};

const ActionButtons = ({ onConfirm, onCancel }: ActionButtonsProps) => (
  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.button, styles.buttonYes]}
      activeOpacity={0.8}
      onPress={onConfirm}
    >
      <Text style={styles.buttonText}>Sim</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.button, styles.buttonNo]}
      activeOpacity={0.8}
      onPress={onCancel}
    >
      <Text style={styles.buttonText}>Não</Text>
    </TouchableOpacity>
  </View>
);

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 100,
    paddingHorizontal: 20,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonYes: { backgroundColor: COLORS.greenConfirm },
  buttonNo: { backgroundColor: COLORS.redCancel },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
