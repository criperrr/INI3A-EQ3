import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";
import {
  fetchProductById,
  fetchProductByEan,
  deleteProduct,
  ProductItem,
} from "../services/productService";

const MOCK_PRICE_HISTORY = [45, 30, 55, 40, 35, 42, 48, 65, 50, 32, 40, 52];

export default function ProductDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    ean?: string;
    name?: string;
    category?: string;
    description?: string;
    imageUri?: string;
    icon?: string;
    lastPrice?: string;
  }>();

  const { themeStyles, accent, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Partial<ProductItem> | null>(null);

  const productId = params.id ? Number(params.id) : undefined;
  const barcode = params.barcode || params.ean;

  useEffect(() => {
    if (productId) {
      setLoading(true);
      fetchProductById(productId)
        .then((data) => {
          if (data) setProduct(data);
        })
        .finally(() => setLoading(false));
    } else if (barcode) {
      setLoading(true);
      fetchProductByEan(barcode)
        .then((data) => {
          if (data) {
            setProduct({
              name: data.name,
              description: data.category,
              icon: data.imageUri,
              ean: data.barcode,
              lastPrice: data.lastPrice,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [productId, barcode]);

  const displayName = product?.name || params.name || "Produto";
  const displayCategory =
    product?.description || params.category || params.description || "Geral";
  const displayImage =
    product?.icon || params.imageUri || params.icon || undefined;
  const displayEan = product?.ean || barcode || "";
  const displayPrice = product?.lastPrice || params.lastPrice || "Preço não informado";

  const handleEdit = () => {
    router.push({
      pathname: "/customRegisterProduct" as any,
      params: {
        id: productId ? String(productId) : undefined,
        name: displayName,
        category: displayCategory,
        icon: displayImage || "",
        ean: displayEan,
        mode: "edit",
      },
    });
  };

  const handleDelete = () => {
    if (!productId) {
      Alert.alert("Aviso", "Este produto não pode ser excluído diretamente pois não possui ID interno registrado.");
      return;
    }

    Alert.alert(
      "Excluir Produto",
      `Tem certeza que deseja excluir "${displayName}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteProduct(productId);
              setLoading(false);
              Alert.alert("Sucesso", "Produto excluído com sucesso!", [
                {
                  text: "OK",
                  onPress: () => router.replace("/"),
                },
              ]);
            } catch (error: any) {
              setLoading(false);
              Alert.alert("Erro", error.message || "Não foi possível excluir o produto.");
            }
          },
        },
      ]
    );
  };

  const handleRegisterPrice = () => {
    router.push({
      pathname: "/registerProduct",
      params: {
        id: productId ? String(productId) : undefined,
        barcode: displayEan,
        name: displayName,
        category: displayCategory,
        imageUri: displayImage,
        lastPrice: displayPrice,
      },
    });
  };

  if (loading && !displayName) {
    return (
      <View style={[styles.container, styles.center, themeStyles.bg]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, themeStyles.text]}>Carregando produto...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category={displayCategory}
            name={displayName}
            imageUri={displayImage}
          >
            {displayEan ? (
              <View style={[styles.eanContainer, themeStyles.inputBg]}>
                <Ionicons name="barcode-outline" size={16} color={accent} />
                <Text style={[styles.eanText, themeStyles.subText]}>
                  EAN: {displayEan}
                </Text>
              </View>
            ) : null}

            <PriceDetails lastPrice={displayPrice} themeStyles={themeStyles} />
            <PriceChart themeStyles={themeStyles} accent={accent} />

            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: accent }]}
                activeOpacity={0.8}
                onPress={handleRegisterPrice}
              >
                <Ionicons name="pricetag-outline" size={18} color="#FFF" style={styles.btnIcon} />
                <Text style={styles.actionBtnText}>Registrar Preço</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, themeStyles.card, themeStyles.border]}
                  activeOpacity={0.8}
                  onPress={handleEdit}
                >
                  <Ionicons name="create-outline" size={18} color={accent} style={styles.btnIcon} />
                  <Text style={[styles.secondaryBtnText, themeStyles.text]}>Editar</Text>
                </TouchableOpacity>

                {productId ? (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, styles.deleteBtn, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash-outline" size={18} color="#D32F2F" style={styles.btnIcon} />
                    <Text style={[styles.secondaryBtnText, { color: "#D32F2F" }]}>Excluir</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({
  lastPrice,
  themeStyles,
}: {
  lastPrice: string;
  themeStyles: any;
}) => (
  <View style={styles.detailsContainer}>
    <Text style={[styles.priceLabel, themeStyles.subText]}>Último preço registrado:</Text>
    <Text style={[styles.priceValue, themeStyles.text]}>{lastPrice}</Text>
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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
  },
  eanContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 14,
    gap: 6,
  },
  eanText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  priceLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
  },
  chartSection: {
    width: "100%",
    marginTop: 4,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 14,
    height: 120,
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
    maxWidth: 10,
    borderRadius: 5,
    opacity: 0.9,
  },
  actionsGrid: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteBtn: {
    borderColor: "rgba(211, 47, 47, 0.3)",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnIcon: {
    marginRight: 6,
  },
});

