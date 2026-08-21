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
import { useTheme } from "../content/themeContent";
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
  const { themeStyles, accent, isDark } = useTheme();
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
      const result = await submitPriceOccurrence(
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
      <View style={[styles.container, themeStyles.bg]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Hero Section */}
          {isLoading ? (
            <View
              style={[
                styles.heroCard,
                themeStyles.card,
                themeStyles.border,
                styles.loadingCard,
              ]}
            >
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.loadingText, themeStyles.text]}>
                {t("scanner.searchingProduct")}
              </Text>
            </View>
          ) : (
            <View style={[styles.heroCard, themeStyles.card, themeStyles.border]}>
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
              <View style={styles.heroContent}>
                <View style={[styles.categoryBadge, { backgroundColor: accent }]}>
                  <Text style={styles.categoryText}>
                    {displayProduct.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.productTitle, themeStyles.text]}>
                  {displayProduct.name}
                </Text>

                <View style={[styles.lastPriceContainer, themeStyles.inputBg]}>
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={isDark ? "#A0A0A0" : "#5A6B52"}
                  />
                  <Text style={[styles.lastPriceText, themeStyles.subText]}>
                    {t("productDetails.lastPrice")}:{" "}
                  </Text>
                  <Text style={[styles.lastPriceValue, themeStyles.text]}>
                    {displayProduct.lastPrice || t("productDetails.noOccurrences")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Register Form Section */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              {t("products.registerPrice")}
            </Text>

            {/* Price Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, themeStyles.subText]}>
                {t("products.enterPrice")} *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  themeStyles.inputBg,
                  themeStyles.border,
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={accent}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, themeStyles.text]}
                  placeholder={t("products.pricePlaceholder")}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Record Date (Data do Dia) */}
            <View style={styles.inputGroup}>
              <View style={styles.dateLabelRow}>
                <Text style={[styles.inputLabel, themeStyles.subText]}>
                  {t("products.recordDate")}
                </Text>
                <View style={[styles.todayBadgePill, { backgroundColor: `${accent}20`, borderColor: accent }]}>
                  <Ionicons name="sparkles-outline" size={12} color={accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.todayBadgeText, { color: accent }]}>
                    {t("products.todayBadge")}
                  </Text>
                </View>
              </View>
              <View style={[styles.dateCard, themeStyles.inputBg, themeStyles.border]}>
                <View style={[styles.dateIconCircle, { backgroundColor: `${accent}15` }]}>
                  <Ionicons name="calendar" size={20} color={accent} />
                </View>
                <View style={styles.dateInfoCol}>
                  <Text style={[styles.dateValueText, themeStyles.text]}>
                    {formattedTodayDate}
                  </Text>
                  <Text style={[styles.dateNoticeText, themeStyles.subText]}>
                    {t("products.automaticDateNotice")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Market Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, themeStyles.subText]}>
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
                        isSelected
                          ? { backgroundColor: accent, borderColor: accent }
                          : [themeStyles.card, themeStyles.border],
                      ]}
                      onPress={() => setSelectedMarketId(m.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={14}
                        color={isSelected ? "#FFF" : themeStyles.text.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.marketChipText,
                          isSelected ? styles.marketChipTextSelected : themeStyles.text,
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
            <View style={[styles.rewardNotice, themeStyles.inputBg, themeStyles.border]}>
              <Ionicons name="sparkles" size={18} color={accent} />
              <Text style={[styles.rewardText, themeStyles.subText]}>
                {t("productDetails.noOccurrencesSubtitle")}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: accent, shadowColor: accent },
                isSubmitting && styles.registerButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#FFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.registerButtonText}>
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
    paddingHorizontal: 16,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 24,
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
    fontSize: 14,
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
    padding: 16,
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -28,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  lastPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
  },
  lastPriceText: {
    fontSize: 12,
    marginLeft: 6,
  },
  lastPriceValue: {
    fontSize: 13,
    fontWeight: "bold",
  },
  formSection: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
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
    borderRadius: 10,
    borderWidth: 1,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  dateIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dateInfoCol: {
    flex: 1,
  },
  dateValueText: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  dateNoticeText: {
    fontSize: 11,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
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
    borderRadius: 14,
    borderWidth: 1,
  },
  marketChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  marketChipTextSelected: {
    color: "#FFF",
    fontWeight: "bold",
  },
  rewardNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  rewardText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
