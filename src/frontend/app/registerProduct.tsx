import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";
import { fetchProductByEan, fetchProductById, ProductData } from "../services/productService";
import { fetchMarkets, MarketData } from "../services/marketService";
import { submitPriceOccurrence } from "../services/ocurrencyService";
import { getUserLocation } from "../utils/userLocation";

const FALLBACK_PRODUCT = {
  category: "Produto",
  name: "Produto Selecionado",
  imageUri: "https://images.openfoodfacts.org/images/placeholder.png",
  lastPrice: "Preço não informado",
};

export default function RegisterProduct() {
  const [price, setPrice] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocatingMarkets, setIsLocatingMarkets] = useState(true);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number>(0);
  const [hasLocation, setHasLocation] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    ean?: string;
    barcode?: string;
    name?: string;
    category?: string;
    imageUri?: string;
    lastPrice?: string;
  }>();
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { refreshProfile } = useAuth();
  const { t, language } = useI18n();
  const [recordDate] = useState<Date>(new Date());

  const targetEan = params.ean || params.barcode;
  const targetId = params.id ? Number(params.id) : null;

  const loadMarketsAndLocation = async () => {
    setIsLocatingMarkets(true);
    try {
      const coords = await getUserLocation();

      if (coords) {
        setHasLocation(true);
        const list = await fetchMarkets({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius: 15000, // 15km
        });

        if (list && list.length > 0) {
          setMarkets(list);
          setSelectedMarketId(list[0]!.id);
        } else {
          setMarkets([]);
          setSelectedMarketId(0);
        }
      } else {
        setHasLocation(false);
        const fallbackList = await fetchMarkets();
        if (fallbackList && fallbackList.length > 0) {
          setMarkets(fallbackList);
          setSelectedMarketId(fallbackList[0]!.id);
        } else {
          setMarkets([]);
          setSelectedMarketId(0);
        }
      }
    } catch (err) {
      console.warn("[registerProduct] Erro ao carregar mercados:", err);
      try {
        const fallbackList = await fetchMarkets();
        if (fallbackList && fallbackList.length > 0) {
          setMarkets(fallbackList);
          setSelectedMarketId(fallbackList[0]!.id);
        } else {
          setMarkets([]);
          setSelectedMarketId(0);
        }
      } catch {
        setMarkets([]);
        setSelectedMarketId(0);
      }
    } finally {
      setIsLocatingMarkets(false);
    }
  };

  useEffect(() => {
    loadMarketsAndLocation();
  }, []);

  useEffect(() => {
    if (targetId && !isNaN(targetId) && targetId > 0) {
      setIsLoading(true);
      fetchProductById(targetId)
        .then((data) => {
          if (data) setProduct(data);
        })
        .finally(() => setIsLoading(false));
    } else if (targetEan) {
      setIsLoading(true);
      fetchProductByEan(targetEan)
        .then((data) => {
          if (data) {
            setProduct(data);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [targetEan, targetId]);

  const handlePriceChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");

    if (!cleanDigits) {
      setPrice("");
      return;
    }

    const truncated = cleanDigits.slice(0, 8);
    const intVal = parseInt(truncated, 10);

    if (isNaN(intVal) || intVal === 0) {
      setPrice("");
      return;
    }

    const padded = intVal.toString().padStart(3, "0");
    const integerPart = padded.slice(0, -2);
    const decimalPart = padded.slice(-2);
    const formattedInteger = parseInt(integerPart, 10).toLocaleString("pt-BR");

    setPrice(`${formattedInteger},${decimalPart}`);
  };

  const handleRegister = async () => {
    const cleanDigits = price.replace(/\D/g, "");
    const numPrice = cleanDigits ? parseInt(cleanDigits, 10) / 100 : 0;

    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      Alert.alert(t("common.error"), t("products.invalidPriceFormat"));
      return;
    }

    let effectiveProductId = product?.id || targetId;

    if (!effectiveProductId && targetEan) {
      setIsSubmitting(true);
      try {
        const resolved = await fetchProductByEan(targetEan);
        if (resolved?.id) {
          effectiveProductId = resolved.id;
          setProduct(resolved);
        }
      } catch {
        // Continue
      }
    }

    if (!selectedMarketId || selectedMarketId <= 0 || markets.length === 0) {
      Alert.alert(
        t("common.warning"),
        markets.length === 0
          ? t("products.noMarketsWithinRadius")
          : t("products.selectMarketRequired")
      );
      return;
    }

    if (!effectiveProductId) {
      Alert.alert(t("common.warning"), t("errors.notFound"));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPriceOccurrence(
        effectiveProductId,
        selectedMarketId,
        numPrice,
        undefined,
        recordDate.toISOString(),
      );

      await refreshProfile();

      Alert.alert(
        t("common.success"),
        t("products.priceSubmittedSuccess"),
        [
          {
            text: t("common.details"),
            onPress: () => {
              router.replace({
                pathname: "/productDetails",
                params: {
                  id: String(effectiveProductId),
                  barcode: targetEan || product?.barcode,
                  name: displayProduct.name,
                  category: displayProduct.category,
                  imageUri: displayProduct.imageUri || undefined,
                  lastPrice: `${numPrice.toFixed(2)}`,
                },
              });
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("errors.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scannedProduct = params.name
    ? {
        name: params.name,
        category: params.category || t("products.title"),
        imageUri: params.imageUri || null,
        lastPrice: params.lastPrice || t("productDetails.noOccurrences"),
      }
    : null;

  const displayProduct = product || scannedProduct || FALLBACK_PRODUCT;

  const formattedTodayDate = recordDate.toLocaleDateString(language, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: semantic.colors.surface.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: semantic.spacing.itemGap },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Hero Section */}
          {isLoading ? (
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: semantic.colors.surface.card,
                  borderColor: semantic.colors.border.default,
                  borderRadius: semantic.radius.modal,
                  marginBottom: semantic.spacing.sectionGap,
                },
                styles.loadingCard,
              ]}
            >
              <ActivityIndicator size="large" color={accent} />
              <Text
                style={[
                  styles.loadingText,
                  {
                    color: semantic.colors.text.primary,
                    ...semantic.typography.body,
                  },
                ]}
              >
                {t("scanner.searchingProduct")}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: semantic.colors.surface.card,
                  borderColor: semantic.colors.border.default,
                  borderRadius: semantic.radius.modal,
                  marginBottom: semantic.spacing.sectionGap,
                },
              ]}
            >
              {displayProduct.imageUri ? (
                <Image
                  source={{ uri: displayProduct.imageUri }}
                  style={styles.heroImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : (
                <View style={[styles.heroImage, styles.placeholderIconBox]}>
                  <Ionicons name="cube-outline" size={60} color={accent} />
                </View>
              )}
              <View style={[styles.heroContent, { padding: semantic.spacing.itemGap }]}>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: accent,
                      borderRadius: semantic.radius.badge,
                      borderColor: semantic.colors.text.inverse,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: semantic.colors.text.inverse,
                        ...semantic.typography.badge,
                      },
                    ]}
                  >
                    {displayProduct.category.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.productTitle,
                    {
                      color: semantic.colors.text.primary,
                      ...semantic.typography.sectionTitle,
                    },
                  ]}
                >
                  {displayProduct.name}
                </Text>

                <View
                  style={[
                    styles.lastPriceContainer,
                    {
                      backgroundColor: semantic.colors.surface.input,
                      borderRadius: semantic.radius.chip,
                    },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={semantic.colors.icon.secondary}
                  />
                  <Text
                    style={[
                      styles.lastPriceText,
                      {
                        color: semantic.colors.text.secondary,
                        ...semantic.typography.caption,
                      },
                    ]}
                  >
                    {`${t("productDetails.lastPrice")}: `}
                  </Text>
                  <Text
                    style={[
                      styles.lastPriceValue,
                      {
                        color: semantic.colors.text.primary,
                        ...semantic.typography.bodyBold,
                      },
                    ]}
                  >
                    {displayProduct.lastPrice || t("productDetails.noOccurrences")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Register Form Section */}
          <View style={styles.formSection}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: semantic.colors.text.primary,
                  ...semantic.typography.sectionTitle,
                  marginBottom: semantic.spacing.itemGap,
                },
              ]}
            >
              {t("products.registerPrice")}
            </Text>

            {/* Price Input */}
            <View style={[styles.inputGroup, { marginBottom: semantic.spacing.itemGap }]}>
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.bodyMedium,
                  },
                ]}
              >
                {`${t("products.enterPrice")} *`}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: semantic.colors.surface.input,
                    borderColor: semantic.colors.border.input,
                    borderRadius: semantic.radius.input,
                    height: semantic.spacing.inputHeight,
                  },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={accent}
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.currencyPrefix,
                    {
                      color: price ? semantic.colors.text.primary : semantic.colors.text.tertiary,
                      ...semantic.typography.bodyBold,
                    },
                  ]}
                >
                  {"R$ "}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: semantic.colors.text.primary,
                      ...semantic.typography.input,
                    },
                  ]}
                  placeholder="0,00"
                  placeholderTextColor={semantic.colors.text.tertiary}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={handlePriceChange}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Record Date (Data do Dia) */}
            <View style={[styles.inputGroup, { marginBottom: semantic.spacing.itemGap }]}>
              <View style={styles.dateLabelRow}>
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color: semantic.colors.text.secondary,
                      ...semantic.typography.bodyMedium,
                      flex: 1,
                      marginRight: 8,
                      marginBottom: 0,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t("products.recordDate")}
                </Text>
                <View
                  style={[
                    styles.todayBadgePill,
                    {
                      backgroundColor: `${accent}20`,
                      borderColor: accent,
                      borderRadius: semantic.radius.badge,
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Ionicons name="sparkles-outline" size={12} color={accent} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.todayBadgeText,
                      {
                        color: accent,
                        ...semantic.typography.micro,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t("products.todayBadge")}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.dateCard,
                  {
                    backgroundColor: semantic.colors.surface.input,
                    borderColor: semantic.colors.border.default,
                    borderRadius: semantic.radius.input,
                    padding: semantic.spacing.elementGap,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dateIconCircle,
                    {
                      backgroundColor: `${accent}15`,
                      borderRadius: semantic.radius.chip,
                    },
                  ]}
                >
                  <Ionicons name="calendar" size={20} color={accent} />
                </View>
                <View style={styles.dateInfoCol}>
                  <Text
                    style={[
                      styles.dateValueText,
                      {
                        color: semantic.colors.text.primary,
                        ...semantic.typography.bodyBold,
                      },
                    ]}
                  >
                    {formattedTodayDate}
                  </Text>
                  <Text
                    style={[
                      styles.dateNoticeText,
                      {
                        color: semantic.colors.text.secondary,
                        ...semantic.typography.caption,
                      },
                    ]}
                  >
                    {t("products.automaticDateNotice")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Market Selection */}
            <View style={[styles.inputGroup, { marginBottom: semantic.spacing.itemGap }]}>
              <View style={styles.marketLabelRow}>
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color: semantic.colors.text.secondary,
                      ...semantic.typography.bodyMedium,
                      flex: 1,
                      marginBottom: 0,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {`${t("products.selectMarket")} *`}
                </Text>
                {Boolean(hasLocation && markets.length > 0) ? (
                  <View
                    style={[
                      styles.locationBadgePill,
                      {
                        backgroundColor: `${accent}15`,
                        borderColor: accent,
                        borderRadius: semantic.radius.badge,
                      },
                    ]}
                  >
                    <Ionicons name="navigate" size={11} color={accent} style={{ marginRight: 3 }} />
                    <Text
                      style={[
                        styles.locationBadgeText,
                        {
                          color: accent,
                          ...semantic.typography.micro,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t("products.maxDistanceNotice")}
                    </Text>
                  </View>
                ) : null}
              </View>

              {isLocatingMarkets ? (
                <View
                  style={[
                    styles.marketLoadingCard,
                    {
                      backgroundColor: semantic.colors.surface.card,
                      borderColor: semantic.colors.border.default,
                      borderRadius: semantic.radius.chip,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={accent} />
                  <Text
                    style={[
                      styles.marketLoadingText,
                      {
                        color: semantic.colors.text.secondary,
                        ...semantic.typography.caption,
                      },
                    ]}
                  >
                    {t("products.searchingNearbyMarkets")}
                  </Text>
                </View>
              ) : markets.length === 0 ? (
                <View
                  style={[
                    styles.marketEmptyCard,
                    {
                      backgroundColor: semantic.colors.surface.card,
                      borderColor: semantic.colors.border.default,
                      borderRadius: semantic.radius.modal,
                    },
                  ]}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={28}
                    color={semantic.colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.marketEmptyText,
                      {
                        color: semantic.colors.text.secondary,
                        ...semantic.typography.caption,
                      },
                    ]}
                  >
                    {t("products.noMarketsWithinRadius")}
                  </Text>
                  <View style={styles.marketEmptyActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.marketRetryButton,
                        {
                          backgroundColor: `${accent}18`,
                          borderColor: accent,
                          borderRadius: semantic.radius.chip,
                        },
                      ]}
                      onPress={loadMarketsAndLocation}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh-outline" size={14} color={accent} />
                      <Text
                        style={[
                          styles.marketRetryText,
                          {
                            color: accent,
                            ...semantic.typography.micro,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {t("common.retry")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.marketRetryButton,
                        {
                          backgroundColor: semantic.colors.surface.input,
                          borderColor: semantic.colors.border.default,
                          borderRadius: semantic.radius.chip,
                        },
                      ]}
                      onPress={async () => {
                        setIsLocatingMarkets(true);
                        try {
                          const all = await fetchMarkets();
                          if (all && all.length > 0) {
                            setMarkets(all);
                            setSelectedMarketId(all[0]!.id);
                          }
                        } finally {
                          setIsLocatingMarkets(false);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="list-outline" size={14} color={semantic.colors.text.primary} />
                      <Text
                        style={[
                          styles.marketRetryText,
                          {
                            color: semantic.colors.text.primary,
                            ...semantic.typography.micro,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {t("common.seeAll")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.marketsScroll}
                >
                  {markets.map((m, index) => {
                    const isSelected = selectedMarketId === m.id;
                    const isNearest = index === 0 && hasLocation;
                    const distanceLabel = m.formattedDistance || (isNearest ? t("products.closestMarket") : null);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.marketChip,
                          { borderRadius: semantic.radius.chip },
                          isSelected
                            ? { backgroundColor: accent, borderColor: accent }
                            : {
                                backgroundColor: semantic.colors.surface.card,
                                borderColor: isNearest ? accent : semantic.colors.border.default,
                              },
                        ]}
                        onPress={() => setSelectedMarketId(m.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isNearest ? "navigate-circle" : "storefront-outline"}
                          size={15}
                          color={
                            isSelected
                              ? semantic.colors.text.inverse
                              : isNearest
                              ? accent
                              : semantic.colors.text.primary
                          }
                          style={{ marginRight: 6 }}
                        />
                        <View style={styles.marketChipContent}>
                          <Text
                            style={[
                              styles.marketChipText,
                              {
                                color: isSelected
                                  ? semantic.colors.text.inverse
                                  : semantic.colors.text.primary,
                                fontWeight: isSelected ? "700" : "600",
                              },
                            ]}
                          >
                            {m.name}
                          </Text>
                          {distanceLabel ? (
                            <Text
                              style={[
                                styles.marketDistanceSubtext,
                                {
                                  color: isSelected
                                    ? `${semantic.colors.text.inverse}D9`
                                    : isNearest
                                    ? accent
                                    : semantic.colors.text.secondary,
                                  ...semantic.typography.micro,
                                },
                              ]}
                            >
                              {distanceLabel}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Gamification Hint */}
            <View
              style={[
                styles.rewardNotice,
                {
                  backgroundColor: semantic.colors.surface.input,
                  borderColor: semantic.colors.border.default,
                  borderRadius: semantic.radius.chip,
                  padding: semantic.spacing.elementGap,
                  marginBottom: semantic.spacing.cardPadding,
                },
              ]}
            >
              <Ionicons name="sparkles" size={18} color={accent} />
              <Text
                style={[
                  styles.rewardText,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.caption,
                  },
                ]}
              >
                {t("productDetails.noOccurrencesSubtitle")}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                {
                  backgroundColor: accent,
                  borderRadius: semantic.radius.button,
                  height: semantic.spacing.buttonHeight,
                  ...semantic.elevation.button,
                },
                isSubmitting && styles.registerButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={semantic.colors.text.inverse} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={semantic.colors.text.inverse}
                    style={styles.buttonIcon}
                  />
                  <Text
                    style={[
                      styles.registerButtonText,
                      {
                        color: semantic.colors.text.inverse,
                        ...semantic.typography.button,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {`${t("products.submitPrice")} (+15 XP)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

// --- Estilos Estruturais ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderWidth: 1,
  },
  loadingText: {},
  productCard: {
    width: "100%",
    borderWidth: 1,
    alignItems: "center",
  },
  heroCard: {
    width: "100%",
    borderWidth: 1,
    alignItems: "center",
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.6,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 1.6,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIconBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  productInfo: {
    width: "100%",
    alignItems: "center",
  },
  heroContent: {
    width: "100%",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryText: {},
  productTitle: {
    textAlign: "center",
    marginBottom: 12,
  },
  lastPriceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: "100%",
    justifyContent: "center",
  },
  lastPriceText: {
    marginLeft: 6,
  },
  lastPriceValue: {},
  formSection: {
    width: "100%",
  },
  sectionTitle: {
    marginLeft: 4,
  },
  inputGroup: {},
  inputLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  dateLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  todayBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  todayBadgeText: {},
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  dateIconCircle: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  dateInfoCol: {
    flex: 1,
  },
  dateValueText: {
    textTransform: "capitalize",
  },
  dateNoticeText: {
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: "100%",
  },
  marketLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  locationBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  locationBadgeText: {},
  marketLoadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    gap: 10,
    marginVertical: 4,
  },
  marketLoadingText: {},
  marketEmptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderWidth: 1,
    gap: 8,
    marginVertical: 4,
  },
  marketEmptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  marketEmptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  marketRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  marketRetryText: {},
  marketsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  marketChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  marketChipContent: {
    flexDirection: "column",
  },
  marketChipText: {
    fontSize: 13,
  },
  marketDistanceSubtext: {
    fontSize: 10,
    marginTop: 1,
    fontWeight: "500",
  },
  rewardNotice: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  rewardText: {
    flex: 1,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {},
});
