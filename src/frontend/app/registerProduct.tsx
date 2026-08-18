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
    const rawPrice = price.trim().replace("R$", "").replace(",", ".").trim();
    const numPrice = parseFloat(rawPrice);

    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      Alert.alert("Preço Inválido", "Por favor, insira um valor numérico válido maior que zero.");
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
      Alert.alert("Aviso", "Identificador do produto não localizado para envio.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPriceOccurrence(
        effectiveProductId,
        selectedMarketId,
        numPrice,
      );

      await refreshProfile();

      Alert.alert(
        "🎉 Preço Cadastrado!",
        `Preço registrado com sucesso! Você ganhou +${result.pointsEarned} XP por contribuir.`,
        [
          {
            text: "Ver Detalhes",
            onPress: () => {
              router.replace({
                pathname: "/productDetails",
                params: {
                  id: String(effectiveProductId),
                  barcode: targetEan || product?.barcode,
                  name: displayProduct.name,
                  category: displayProduct.category,
                  imageUri: displayProduct.imageUri || undefined,
                  lastPrice: `R$ ${numPrice.toFixed(2)}`,
                },
              });
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("Erro ao enviar", err.message || "Não foi possível registrar o preço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scannedProduct = params.name
    ? {
        name: params.name,
        category: params.category || "Sem Categoria",
        imageUri: params.imageUri || null,
        lastPrice: params.lastPrice || "Preço não informado",
      }
    : null;

  const displayProduct = product || scannedProduct || FALLBACK_PRODUCT;

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
                Buscando informações do produto...
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
                    Último preço:{" "}
                  </Text>
                  <Text style={[styles.lastPriceValue, themeStyles.text]}>
                    {displayProduct.lastPrice || "Não informado"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Register Form Section */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Sugerir / Atualizar Preço
            </Text>

            {/* Price Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, themeStyles.subText]}>
                Preço Encontrado (R$) *
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
                  placeholder="Ex: 14.90"
                  placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Market Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, themeStyles.subText]}>
                Supermercado / Estabelecimento *
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
                Ao enviar este preço, você ganha <Text style={{ fontWeight: "bold", color: accent }}>+15 XP</Text> e ajuda milhares de pessoas a economizar!
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
                    Confirmar e Ganhar +15 XP
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
