import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import {
  fetchProductById,
  fetchProductByEan,
  updateProduct,
  deleteProduct,
  ProductDetailData,
  PriceHistoryItem,
} from "../services/productService";

const { width } = Dimensions.get("window");

export default function ProductDetails() {
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    ean?: string;
    name?: string;
    category?: string;
    imageUri?: string;
    lastPrice?: string;
  }>();

  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEan, setEditEan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const targetId = params.id ? Number(params.id) : null;
  const targetBarcode = params.barcode || params.ean;

  const loadProductData = useCallback(async () => {
    setLoading(true);
    try {
      let data: ProductDetailData | null = null;

      if (targetId && !isNaN(targetId) && targetId > 0) {
        data = await fetchProductById(targetId);
      } else if (targetBarcode) {
        const byBarcode = await fetchProductByEan(targetBarcode);
        if (byBarcode) {
          data = {
            ...byBarcode,
            priceHistory: [],
          };
          if (byBarcode.id) {
            const fullDetails = await fetchProductById(byBarcode.id);
            if (fullDetails) data = fullDetails;
          }
        }
      }

      if (data) {
        setProduct(data);
        setEditName(data.name || "");
        setEditCategory(data.category || "");
        setEditEan(data.barcode || data.ean || "");
      } else if (params.name) {
        const fallbackData: ProductDetailData = {
          id: targetId || undefined,
          barcode: targetBarcode || "",
          name: params.name,
          category: params.category || "Sem Categoria",
          imageUri: params.imageUri || null,
          lastPrice: params.lastPrice || "Preço não informado",
          priceHistory: [],
        };
        setProduct(fallbackData);
        setEditName(params.name);
        setEditCategory(params.category || "");
        setEditEan(targetBarcode || "");
      }
    } catch (err) {
      console.error("[ProductDetails] Error loading details:", err);
    } finally {
      setLoading(false);
    }
  }, [targetId, targetBarcode, params.name, params.category, params.imageUri, params.lastPrice]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleRegisterPrice = () => {
    router.push({
      pathname: "/registerProduct",
      params: {
        id: product?.id ? String(product.id) : undefined,
        barcode: product?.barcode || targetBarcode,
        name: product?.name || params.name,
        category: product?.category || params.category,
        imageUri: product?.imageUri || params.imageUri,
        lastPrice: product?.lastPrice || params.lastPrice,
      },
    });
  };

  const handleOpenEdit = () => {
    if (!product) return;
    setEditName(product.name || "");
    setEditCategory(product.category || "");
    setEditEan(product.barcode || product.ean || "");
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert("Atenção", "O nome do produto é obrigatório.");
      return;
    }

    if (!product?.id) {
      Alert.alert("Erro", "Este produto ainda não possui ID no banco para ser editado.");
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateProduct(product.id, {
        name: editName.trim(),
        category: editCategory.trim(),
        ean: editEan.trim() || undefined,
      });

      setProduct((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsEditModalVisible(false);
      Alert.alert("Sucesso", "Produto atualizado com sucesso!");
    } catch (err: any) {
      Alert.alert("Erro ao atualizar", err.message || "Não foi possível atualizar o produto.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = () => {
    if (!product?.id) {
      Alert.alert("Aviso", "Este produto não pode ser excluído diretamente.");
      return;
    }

    Alert.alert(
      "Excluir Produto",
      `Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(product.id!);
              Alert.alert("Sucesso", "Produto excluído com sucesso!", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              Alert.alert("Erro", err.message || "Não foi possível excluir o produto.");
            }
          },
        },
      ]
    );
  };

  if (loading && !product) {
    return (
      <View style={[styles.container, styles.centerContent, themeStyles.bg]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, themeStyles.subText]}>Carregando detalhes do produto...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.centerContent, themeStyles.bg]}>
        <Ionicons name="alert-circle-outline" size={64} color={accent} />
        <Text style={[styles.errorTitle, themeStyles.text]}>Produto não encontrado</Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUri = product.imageUri || product.icon;
  const history = product.priceHistory || [];

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Card Header */}
        <View style={[styles.mainCard, themeStyles.card, themeStyles.border]}>
          <View style={[styles.imageWrapper, themeStyles.inputBg]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <Ionicons name="cube-outline" size={60} color={accent} />
            )}
            {product.category && (
              <View style={[styles.categoryBadge, { backgroundColor: accent }]}>
                <Text style={styles.categoryBadgeText}>{product.category.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.productName, themeStyles.text]}>{product.name}</Text>

          {product.barcode && (
            <View style={[styles.barcodeChip, themeStyles.inputBg, themeStyles.border]}>
              <Ionicons name="barcode-outline" size={16} color={themeStyles.subText.color} />
              <Text style={[styles.barcodeText, themeStyles.subText]}>{product.barcode}</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: themeStyles.border.borderColor }]} />

          {/* Last Price Highlight */}
          <View style={styles.priceHighlightBox}>
            <Text style={[styles.lastPriceLabel, themeStyles.subText]}>Último Preço Registrado</Text>
            <Text style={[styles.lastPriceValue, { color: accent }]}>
              {product.lastPrice || "Preço não informado"}
            </Text>
          </View>

          {/* Price Statistics Grid */}
          {(product.minPrice || product.maxPrice || product.avgPrice) && (
            <View style={styles.statsRow}>
              {product.minPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>Mínimo</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.minPrice}</Text>
                </View>
              )}
              {product.avgPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>Médio</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.avgPrice}</Text>
                </View>
              )}
              {product.maxPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>Máximo</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.maxPrice}</Text>
                </View>
              )}
            </View>
          )}

          {/* Price History Chart */}
          <PriceHistorySection history={history} accent={accent} themeStyles={themeStyles} />

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={handleRegisterPrice}
            >
              <Ionicons name="pricetag-outline" size={20} color="#FFF" style={styles.btnIcon} />
              <Text style={styles.primaryActionText}>Atualizar / Informar Preço</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              {product.id && (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, themeStyles.inputBg, themeStyles.border]}
                  activeOpacity={0.8}
                  onPress={handleOpenEdit}
                >
                  <Ionicons name="create-outline" size={18} color={themeStyles.text.color} style={styles.btnIcon} />
                  <Text style={[styles.secondaryActionText, themeStyles.text]}>Editar Produto</Text>
                </TouchableOpacity>
              )}

              {product.id && (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, styles.deleteActionBtn, themeStyles.border]}
                  activeOpacity={0.8}
                  onPress={handleDeleteProduct}
                >
                  <Ionicons name="trash-outline" size={18} color="#E53935" style={styles.btnIcon} />
                  <Text style={[styles.secondaryActionText, { color: "#E53935" }]}>Excluir</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Product Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, themeStyles.card, themeStyles.border]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themeStyles.text]}>Editar Produto</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeStyles.text.color} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, themeStyles.subText]}>Nome do Produto *</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome do produto"
              placeholderTextColor={isDark ? "#888" : "#999"}
            />

            <Text style={[styles.inputLabel, themeStyles.subText]}>Categoria</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Categoria do produto"
              placeholderTextColor={isDark ? "#888" : "#999"}
            />

            <Text style={[styles.inputLabel, themeStyles.subText]}>Código de Barras (EAN)</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editEan}
              onChangeText={setEditEan}
              placeholder="EAN / Código"
              placeholderTextColor={isDark ? "#888" : "#999"}
              keyboardType="numeric"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, themeStyles.border]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, themeStyles.text]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: accent }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Componente de Histórico de Preços ---

const PriceHistorySection = ({
  history,
  accent,
  themeStyles,
}: {
  history: PriceHistoryItem[];
  accent: string;
  themeStyles: any;
}) => {
  if (history.length === 0) {
    return (
      <View style={styles.historySection}>
        <Text style={[styles.sectionTitle, themeStyles.text]}>Histórico de Preços</Text>
        <View style={[styles.emptyHistoryBox, themeStyles.inputBg, themeStyles.border]}>
          <Ionicons name="stats-chart-outline" size={28} color={accent} />
          <Text style={[styles.emptyHistoryText, themeStyles.subText]}>
            Nenhum histórico de preços registrado para este produto ainda.
          </Text>
        </View>
      </View>
    );
  }

  const values = history.map((h) => h.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  return (
    <View style={styles.historySection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>Histórico de Preços</Text>
      
      {/* Bars Chart */}
      <View style={[styles.chartBox, themeStyles.inputBg, themeStyles.border]}>
        <View style={styles.barsRow}>
          {history.slice(-10).map((item, idx) => {
            const pct = Math.max(20, Math.round(((item.value - minVal) / range) * 75) + 25);
            return (
              <View key={item.id || idx} style={styles.barColumn}>
                <Text style={[styles.barValueLabel, themeStyles.subText]}>
                  {item.value.toFixed(1).replace(".", ",")}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${pct}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.barMarketLabel, themeStyles.subText]} numberOfLines={1}>
                  {item.marketName.split(" ")[0]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* History List */}
      <View style={styles.historyList}>
        {history.slice(-5).reverse().map((item) => (
          <View key={item.id} style={[styles.historyRow, themeStyles.inputBg, themeStyles.border]}>
            <View style={styles.historyRowLeft}>
              <Ionicons name="storefront-outline" size={16} color={accent} />
              <Text style={[styles.historyMarketName, themeStyles.text]}>{item.marketName}</Text>
            </View>
            <Text style={[styles.historyPriceText, { color: accent }]}>{item.formattedValue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorTitle: { fontSize: 18, fontWeight: "bold", marginTop: 12, marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: "#FFF", fontWeight: "bold" },
  content: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  mainCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  productImage: {
    width: "85%",
    height: "85%",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  barcodeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  barcodeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  priceHighlightBox: {
    alignItems: "center",
    marginBottom: 16,
  },
  lastPriceLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  lastPriceValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  historySection: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyHistoryBox: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  emptyHistoryText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  chartBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    height: 140,
    marginBottom: 12,
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValueLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 16,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
  },
  barMarketLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  historyMarketName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  historyPriceText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  actionsContainer: {
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteActionBtn: {
    borderColor: "#E53935",
    backgroundColor: "transparent",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  btnIcon: {
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

