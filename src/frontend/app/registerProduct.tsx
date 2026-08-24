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
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number>(1);
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

  useEffect(() => {
    // Fetch available markets
    fetchMarkets().then((list) => {
      if (list && list.length > 0) {
        setMarkets(list);
        setSelectedMarketId(list[0]!.id);
      }
    });

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

  const handleRegister = async () => {
    const rawPrice = price.trim().replace("R$", "").replace("$", "").replace("€", "").replace("¥", "").replace("₽", "").replace(",", ".").trim();
    const numPrice = parseFloat(rawPrice);

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
                    {t("productDetails.lastPrice")}:{" "}
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
                {t("products.enterPrice")} *
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
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: semantic.colors.text.primary,
                      ...semantic.typography.input,
                    },
                  ]}
                  placeholder={t("products.pricePlaceholder")}
                  placeholderTextColor={semantic.colors.text.tertiary}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
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
                    },
                  ]}
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
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.bodyMedium,
                  },
                ]}
              >
                {t("products.selectMarket")} *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.marketsScroll}
              >
                {markets.map((m) => {
                  const isSelected = selectedMarketId === m.id;
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
                              borderColor: semantic.colors.border.default,
                            },
                      ]}
                      onPress={() => setSelectedMarketId(m.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={14}
                        color={isSelected ? semantic.colors.text.inverse : semantic.colors.text.primary}
                        style={{ marginRight: 6 }}
                      />
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
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
                  >
                    {t("products.submitPrice")} (+15 XP)
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingCard: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  heroImage: {
    width: "100%",
    height: 160,
  },
  placeholderIconBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  heroContent: {
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
    marginTop: -28,
    borderWidth: 2,
  },
  categoryText: {
    letterSpacing: 1,
  },
  productTitle: {
    textAlign: "center",
    marginBottom: 12,
  },
  lastPriceContainer: {
    flexDirection: "row",
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
  input: {
    flex: 1,
    height: "100%",
  },
  marketsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  marketChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  marketChipText: {
    fontSize: 13,
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
