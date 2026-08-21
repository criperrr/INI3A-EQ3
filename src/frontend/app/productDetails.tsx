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
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";
import {
  fetchProductById,
  fetchProductByEan,
  fetchPriceHistory,
  updateProduct,
  deleteProduct,
  ProductDetailData,
  PriceHistoryItem,
} from "../services/productService";
import {
  fetchProductOccurrences,
  voteOccurrence,
  deleteOccurrence,
  PriceOccurrence,
} from "../services/ocurrencyService";

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
  const { isAdmin, user, refreshProfile } = useAuth();
  const { t, language } = useI18n();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [occurrences, setOccurrences] = useState<PriceOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEan, setEditEan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const targetId = params.id ? Number(params.id) : null;
  const targetBarcode = params.barcode || params.ean;

  const loadOccurrences = useCallback(async (productId: number) => {
    setLoadingOccurrences(true);
    try {
      const list = await fetchProductOccurrences(productId);
      setOccurrences(list);
    } catch {
      // Occurrences error handled gracefully
    } finally {
      setLoadingOccurrences(false);
    }
  }, []);

  const loadProductData = useCallback(async () => {
    // Immediate pre-population from route params for zero-latency initial paint
    if (params.name && !product) {
      setProduct({
        id: targetId || undefined,
        barcode: targetBarcode || "",
        name: params.name,
        category: params.category || t("common.uncategorized"),
        imageUri: params.imageUri || null,
        lastPrice: params.lastPrice || t("productDetails.noOccurrences"),
        priceHistory: [],
      });
      setEditName(params.name);
      setEditCategory(params.category || "");
      setEditEan(targetBarcode || "");
    }

    setLoading(true);
    try {
      let data: ProductDetailData | null = null;

      if (targetId && !isNaN(targetId) && targetId > 0) {
        // Parallel fetch for product details and occurrences
        setLoadingOccurrences(true);
        const [productData, occurrencesList] = await Promise.all([
          fetchProductById(targetId),
          fetchProductOccurrences(targetId).catch(() => []),
        ]);
        data = productData;
        setOccurrences(occurrencesList);
        setLoadingOccurrences(false);
      } else if (targetBarcode) {
        const byBarcode = await fetchProductByEan(targetBarcode);
        if (byBarcode) {
          data = {
            ...byBarcode,
            priceHistory: [],
          };
          if (byBarcode.id) {
            setLoadingOccurrences(true);
            const [fullDetails, occurrencesList] = await Promise.all([
              fetchProductById(byBarcode.id).catch(() => byBarcode),
              fetchProductOccurrences(byBarcode.id).catch(() => []),
            ]);
            if (fullDetails) data = fullDetails;
            setOccurrences(occurrencesList);
            setLoadingOccurrences(false);
          }
        }
      }

      if (data) {
        setProduct(data);
        setEditName(data.name || "");
        setEditCategory(data.category || "");
        setEditEan(data.barcode || data.ean || "");
      } else if (params.name && !product) {
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
      setLoadingOccurrences(false);
    }
  }, [targetId, targetBarcode, params.name, params.category, params.imageUri, params.lastPrice]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleRegisterPrice = () => {
    router.push({
      pathname: "/registerProduct",
      params: {
        id: product?.id ? String(product.id) : targetId ? String(targetId) : undefined,
        barcode: product?.barcode || targetBarcode,
        ean: product?.ean || product?.barcode || targetBarcode,
        name: product?.name || params.name,
        category: product?.category || params.category,
        imageUri: product?.imageUri || params.imageUri,
        lastPrice: product?.lastPrice || params.lastPrice,
      },
    });
  };

  const handleVote = async (occId: number, verdict: boolean) => {
    try {
      const res = await voteOccurrence(occId, verdict);
      Alert.alert(
        t("common.success"),
        t("productDetails.votedSuccess"),
      );
      if (product?.id) loadOccurrences(product.id);
      refreshProfile();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("errors.genericError"));
    }
  };

  const handleDeleteOccurrence = (occId: number) => {
    Alert.alert(
      t("common.delete"),
      t("productDetails.deleteOccurrenceConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOccurrence(occId);
              Alert.alert(t("common.success"), t("common.success"));
              if (product?.id) {
                loadOccurrences(product.id);
                loadProductData();
              }
            } catch (err: any) {
              Alert.alert(t("common.error"), err.message || t("errors.genericError"));
            }
          },
        },
      ],
    );
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
      Alert.alert(t("common.warning"), t("auth.nameRequired"));
      return;
    }

    if (!product?.id) {
      Alert.alert(t("common.error"), t("errors.notFound"));
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
      Alert.alert(t("common.success"), t("common.success"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("errors.genericError"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = () => {
    if (!product?.id) {
      Alert.alert(t("common.warning"), t("errors.notFound"));
      return;
    }

    Alert.alert(
      t("productDetails.deleteProduct"),
      t("productDetails.deleteProductConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(product.id!);
              Alert.alert(t("common.success"), t("common.success"), [
                {
                  text: t("common.ok"),
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              Alert.alert(t("common.error"), err.message || t("errors.genericError"));
            }
          },
        },
      ],
    );
  };

  if (loading && !product) {
    return (
      <View style={[styles.container, styles.centerContent, themeStyles.bg]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, themeStyles.subText]}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.centerContent, themeStyles.bg]}>
        <Ionicons name="alert-circle-outline" size={64} color={accent} />
        <Text style={[styles.errorTitle, themeStyles.text]}>{t("search.noResults")}</Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>{t("common.back")}</Text>
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
          {isAdmin && (
            <View style={styles.adminTagBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              <Text style={styles.adminTagText}>{t("productDetails.adminActions").toUpperCase()}</Text>
            </View>
          )}

          <View style={[styles.imageWrapper, themeStyles.inputBg]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.productImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
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
            <Text style={[styles.lastPriceLabel, themeStyles.subText]}>{t("productDetails.lastPrice")}</Text>
            <Text style={[styles.lastPriceValue, { color: accent }]}>
              {product.lastPrice || t("productDetails.noOccurrences")}
            </Text>
          </View>

          {/* Price Statistics Grid */}
          {(product.minPrice || product.maxPrice || product.avgPrice) && (
            <View style={styles.statsRow}>
              {product.minPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>{t("productDetails.lowestPrice")}</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.minPrice}</Text>
                </View>
              )}
              {product.avgPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>{t("productDetails.averagePrice")}</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.avgPrice}</Text>
                </View>
              )}
              {product.maxPrice && (
                <View style={[styles.statItem, themeStyles.inputBg, themeStyles.border]}>
                  <Text style={[styles.statLabel, themeStyles.subText]}>{t("productDetails.highestPrice")}</Text>
                  <Text style={[styles.statValue, themeStyles.text]}>{product.maxPrice}</Text>
                </View>
              )}
            </View>
          )}

          {/* Price History Chart */}
          <PriceHistorySection
            productId={product.id || (targetId ? targetId : undefined)}
            history={history}
            accent={accent}
            themeStyles={themeStyles}
            t={t}
            language={language}
          />

          {/* Market Occurrences List */}
          <View style={[styles.occurrencesSection, themeStyles.card, themeStyles.border]}>
            <View style={styles.occurrencesHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="storefront-outline" size={18} color={accent} />
                <Text style={[styles.occurrencesTitle, themeStyles.text]}>{t("productDetails.marketPrices")}</Text>
              </View>
              <Text style={[styles.occurrencesCountText, { color: accent }]}>
                {occurrences.length} {t("common.details").toLowerCase()}
              </Text>
            </View>

            {loadingOccurrences ? (
              <ActivityIndicator size="small" color={accent} style={{ marginVertical: 12 }} />
            ) : occurrences.length === 0 ? (
              <View style={styles.noOccurrencesBox}>
                <Text style={[styles.noOccurrencesText, themeStyles.subText]}>
                  {t("productDetails.noOccurrences")}
                </Text>
                <Text style={[styles.noOccurrencesSub, themeStyles.subText]}>
                  {t("productDetails.noOccurrencesSubtitle")}
                </Text>
              </View>
            ) : (
              occurrences.map((occ) => (
                <View key={occ.id} style={[styles.occurrenceItem, themeStyles.inputBg, themeStyles.border]}>
                  <View style={styles.occurrenceMainCol}>
                    <Text style={[styles.occurrenceMarketName, themeStyles.text]}>
                      {occ.marketName || t("products.selectMarket")}
                    </Text>
                    <Text style={[styles.occurrenceValue, { color: accent }]}>
                      R$ {occ.value}
                    </Text>
                    <Text style={[styles.occurrenceMeta, themeStyles.subText]}>
                      {t("productDetails.reportedBy")} {occ.userName || t("profile.title")} • {new Date(occ.createdAt).toLocaleDateString(language === "pt-BR" ? "pt-BR" : language === "en-US" ? "en-US" : language === "es-ES" ? "es-ES" : language === "de-DE" ? "de-DE" : language === "ru-RU" ? "ru-RU" : language === "zh-CN" ? "zh-CN" : "ja-JP")}
                    </Text>
                  </View>

                  <View style={styles.occurrenceActionsCol}>
                    <View style={styles.voteRow}>
                      <TouchableOpacity
                        style={[styles.voteBtn, themeStyles.card, themeStyles.border]}
                        onPress={() => handleVote(occ.id, true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-up" size={12} color="#4CAF50" />
                        <Text style={[styles.voteCount, { color: "#4CAF50" }]}>{occ.upvoteCount}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.voteBtn, themeStyles.card, themeStyles.border]}
                        onPress={() => handleVote(occ.id, false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-down" size={12} color="#F44336" />
                        <Text style={[styles.voteCount, { color: "#F44336" }]}>{occ.downvoteCount}</Text>
                      </TouchableOpacity>
                    </View>

                    {(isAdmin || user?.id === occ.userId) && (
                      <TouchableOpacity
                        style={styles.deleteOccBtn}
                        onPress={() => handleDeleteOccurrence(occ.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#E53935" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={handleRegisterPrice}
            >
              <Ionicons name="pricetag-outline" size={20} color="#FFF" style={styles.btnIcon} />
              <Text style={styles.primaryActionText}>{t("productDetails.addPrice")}</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <View style={styles.secondaryActionsRow}>
                {product.id && (
                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, themeStyles.inputBg, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={handleOpenEdit}
                  >
                    <Ionicons name="create-outline" size={18} color={themeStyles.text.color} style={styles.btnIcon} />
                    <Text style={[styles.secondaryActionText, themeStyles.text]}>{t("productDetails.editProduct")}</Text>
                  </TouchableOpacity>
                )}

                {product.id && (
                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, styles.deleteActionBtn, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={handleDeleteProduct}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E53935" style={styles.btnIcon} />
                    <Text style={[styles.secondaryActionText, { color: "#E53935" }]}>{t("productDetails.deleteProduct")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.contributorInfoBox, themeStyles.inputBg, themeStyles.border]}>
                <Ionicons name="sparkles" size={16} color={accent} />
                <Text style={[styles.contributorInfoText, themeStyles.subText]}>
                  {t("productDetails.noOccurrencesSubtitle")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Product Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, themeStyles.card, themeStyles.border]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themeStyles.text]}>{t("productDetails.editProductModalTitle")}</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeStyles.text.color} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, themeStyles.subText]}>{t("productDetails.productName")} *</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editName}
              onChangeText={setEditName}
              placeholder={t("products.productNamePlaceholder")}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />

            <Text style={[styles.inputLabel, themeStyles.subText]}>{t("productDetails.category")}</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder={t("products.categoryPlaceholder")}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />

            <Text style={[styles.inputLabel, themeStyles.subText]}>{t("productDetails.ean")}</Text>
            <TextInput
              style={[styles.modalInput, themeStyles.inputBg, themeStyles.border, themeStyles.text]}
              value={editEan}
              onChangeText={setEditEan}
              placeholder={t("scanner.barcode")}
              placeholderTextColor={isDark ? "#888" : "#999"}
              keyboardType="numeric"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, themeStyles.border]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, themeStyles.text]}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: accent }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#FFF" }]}>{t("common.save")}</Text>
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

type PeriodType = "7d" | "1m" | "6m" | "1y" | "all";

interface PriceHistorySectionProps {
  productId?: number;
  history: PriceHistoryItem[];
  accent: string;
  themeStyles: any;
  t: (key: any) => string;
  language?: string;
}

const PriceHistorySection = ({
  productId,
  history,
  accent,
  themeStyles,
  t,
  language = "pt-BR",
}: PriceHistorySectionProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("1m");
  const [periodHistory, setPeriodHistory] = useState<PriceHistoryItem[]>([]);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

  const periods: { id: PeriodType; label: string }[] = [
    { id: "7d", label: t("productDetails.period7D") },
    { id: "1m", label: t("productDetails.period1M") },
    { id: "6m", label: t("productDetails.period6M") },
    { id: "1y", label: t("productDetails.period1Y") },
    { id: "all", label: t("productDetails.periodAll") },
  ];

  const filterByPeriod = useCallback((items: PriceHistoryItem[], period: PeriodType): PriceHistoryItem[] => {
    if (!items || items.length === 0) return [];
    if (period === "all") return items.slice(-15);

    const now = Date.now();
    let days = 30;
    if (period === "7d") days = 7;
    else if (period === "1m") days = 30;
    else if (period === "6m") days = 180;
    else if (period === "1y") days = 365;

    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const filtered = items.filter((item) => {
      const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return itemTime >= cutoff;
    });

    return filtered.slice(-15);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const localFiltered = filterByPeriod(history, selectedPeriod);
    setPeriodHistory(localFiltered);

    if (productId && productId > 0) {
      setLoadingPeriod(true);
      fetchPriceHistory(productId, selectedPeriod, 15)
        .then((data) => {
          if (isMounted && data && data.length > 0) {
            setPeriodHistory(data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingPeriod(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [productId, selectedPeriod, history, filterByPeriod]);

  const displayHistory = periodHistory.length > 0 ? periodHistory : filterByPeriod(history, selectedPeriod);
  const values = displayHistory.map((h) => h.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;
  const range = maxVal - minVal || 1;

  const selectedItem = displayHistory.find((item) => item.id === selectedPointId) || null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language, { day: "2-digit", month: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.historySection}>
      {/* Header Aligned to Left */}
      <View style={styles.historyHeaderRow}>
        <View style={styles.historyHeaderLeft}>
          <Ionicons name="stats-chart" size={18} color={accent} />
          <Text style={[styles.sectionTitle, themeStyles.text]}>{t("productDetails.priceHistory")}</Text>
        </View>
        <View style={[styles.historyCountPill, themeStyles.inputBg, themeStyles.border]}>
          <Text style={[styles.historyCountPillText, themeStyles.subText]}>
            {t("productDetails.maxPricesInfo")}
          </Text>
        </View>
      </View>

      {/* Time Period Filter Chips - Left Aligned */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodChipsContainer}
        style={styles.periodScroll}
      >
        {periods.map((p) => {
          const isActive = selectedPeriod === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.periodChip,
                themeStyles.inputBg,
                themeStyles.border,
                isActive && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => {
                setSelectedPeriod(p.id);
                setSelectedPointId(null);
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.periodChipText,
                  themeStyles.subText,
                  isActive && styles.periodChipTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Point Tooltip */}
      {selectedItem && (
        <View style={[styles.selectedPointCard, themeStyles.inputBg, { borderColor: accent }]}>
          <View style={styles.selectedPointLeft}>
            <Text style={[styles.selectedPointMarket, themeStyles.text]} numberOfLines={1}>
              {selectedItem.marketName}
            </Text>
            <Text style={[styles.selectedPointDate, themeStyles.subText]}>
              {formatFullDate(selectedItem.createdAt)}
            </Text>
          </View>
          <View style={styles.selectedPointRight}>
            <Text style={[styles.selectedPointPrice, { color: accent }]}>
              {selectedItem.formattedValue}
            </Text>
          </View>
        </View>
      )}

      {/* Chart Box or Empty State */}
      {loadingPeriod && displayHistory.length === 0 ? (
        <View style={[styles.chartBox, styles.chartBoxLoading, themeStyles.inputBg, themeStyles.border]}>
          <ActivityIndicator size="small" color={accent} />
        </View>
      ) : displayHistory.length === 0 ? (
        <View style={[styles.emptyHistoryBox, themeStyles.inputBg, themeStyles.border]}>
          <Ionicons name="calendar-outline" size={24} color={accent} />
          <Text style={[styles.emptyHistoryText, themeStyles.subText]}>
            {t("productDetails.noHistoryForPeriod")}
          </Text>
        </View>
      ) : (
        <View style={[styles.chartBox, themeStyles.inputBg, themeStyles.border]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barsScrollContent}
          >
            {displayHistory.slice(-15).map((item, idx) => {
              const pct = Math.max(18, Math.round(((item.value - minVal) / range) * 70) + 20);
              const isSelected = selectedPointId === item.id;
              const dateLabel = formatDate(item.createdAt);

              return (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.barColumn}
                  onPress={() => setSelectedPointId(isSelected ? null : item.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.barValueLabel,
                      themeStyles.subText,
                      isSelected && { color: accent, fontWeight: "bold" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.value.toFixed(1).replace(".", ",")}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${pct}%`,
                          backgroundColor: isSelected ? accent : `${accent}CC`,
                        },
                        isSelected && styles.barFillSelected,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barMarketLabel,
                      themeStyles.subText,
                      isSelected && { color: accent, fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {dateLabel || item.marketName.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* History List - Max 15 Items, Left Aligned */}
      {displayHistory.length > 0 && (
        <View style={styles.historyList}>
          {displayHistory
            .slice(-15)
            .reverse()
            .map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.historyRow,
                  themeStyles.inputBg,
                  themeStyles.border,
                  selectedPointId === item.id && { borderColor: accent, borderWidth: 1.5 },
                ]}
                onPress={() => setSelectedPointId(selectedPointId === item.id ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.historyRowLeft}>
                  <Ionicons name="storefront-outline" size={16} color={accent} />
                  <View style={styles.historyRowDetails}>
                    <Text style={[styles.historyMarketName, themeStyles.text]} numberOfLines={1}>
                      {item.marketName}
                    </Text>
                    <Text style={[styles.historyDateText, themeStyles.subText]}>
                      {formatFullDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.historyPriceText, { color: accent }]}>{item.formattedValue}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
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
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  historyCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyCountPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  periodScroll: {
    marginBottom: 12,
  },
  periodChipsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  selectedPointCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  selectedPointLeft: {
    flex: 1,
    marginRight: 8,
  },
  selectedPointMarket: {
    fontSize: 13,
    fontWeight: "bold",
  },
  selectedPointDate: {
    fontSize: 11,
    marginTop: 2,
  },
  selectedPointRight: {
    alignItems: "flex-end",
  },
  selectedPointPrice: {
    fontSize: 16,
    fontWeight: "bold",
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
    padding: 12,
    borderWidth: 1,
    height: 145,
    marginBottom: 12,
    justifyContent: "flex-end",
  },
  chartBoxLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  barsScrollContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 10,
    minWidth: "100%",
    paddingHorizontal: 4,
  },
  barColumn: {
    width: 44,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValueLabel: {
    fontSize: 9,
    marginBottom: 4,
    textAlign: "center",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 18,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
  },
  barFillSelected: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  barMarketLabel: {
    fontSize: 9,
    marginTop: 4,
    textAlign: "center",
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
    gap: 10,
    flex: 1,
  },
  historyRowDetails: {
    flex: 1,
  },
  historyMarketName: {
    fontSize: 13,
    fontWeight: "600",
  },
  historyDateText: {
    fontSize: 11,
    marginTop: 2,
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
  adminTagBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6A100",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  adminTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  occurrencesSection: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  occurrencesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  occurrencesTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  occurrencesCountText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  noOccurrencesBox: {
    paddingVertical: 12,
    alignItems: "center",
  },
  noOccurrencesText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  noOccurrencesSub: {
    fontSize: 11,
    textAlign: "center",
  },
  occurrenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  occurrenceMainCol: {
    flex: 1,
  },
  occurrenceMarketName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  occurrenceValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 2,
  },
  occurrenceMeta: {
    fontSize: 11,
  },
  occurrenceActionsCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  voteRow: {
    flexDirection: "row",
    gap: 6,
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  voteCount: {
    fontSize: 11,
    fontWeight: "bold",
  },
  deleteOccBtn: {
    padding: 4,
  },
  contributorInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  contributorInfoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});


