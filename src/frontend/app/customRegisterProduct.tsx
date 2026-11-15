
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import {
  createCustomProduct,
  validateProductExistence,
  type ProductExistenceValidationData,
} from "../services/productService";
import CategorySelector from "../components/CategorySelector";
import { formatLongDateWithWeekday } from "../utils/dateUtils";
import { validateGs1Barcode } from "../utils/barcodeValidator";
import { getOptimizedImageUrl } from "../utils/imageUtils";
import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { FocusedInputWrapper } from "../components/FocusedInputWrapper";
import TwoFactorModal from "../components/TwoFactorModal";

export default function CustomRegisterProduct() {
  const params = useLocalSearchParams<{ ean?: string }>();
  const [ean, setEan] = useState(params.ean || "");
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [catalogIcon, setCatalogIcon] = useState<string>("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [recordDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [validatingExistence, setValidatingExistence] = useState(false);
  const [existenceData, setExistenceData] = useState<ProductExistenceValidationData | null>(null);
  const router = useRouter();
  const { themeStyles, accent, isDark, tokens } = useTheme();
  const { semantic } = tokens;
  const { t, language } = useI18n();
  const { isAuthenticated, user, isTwoFactorVerified, loginAsTestUser } = useAuth();
  const [isTwoFactorModalVisible, setIsTwoFactorModalVisible] = useState(false);
  const [pending2FASubmit, setPending2FASubmit] = useState<(() => Promise<void>) | null>(null);

  const formattedRecordDate = formatLongDateWithWeekday(recordDate, language);

  const applyMatchedProduct = useCallback(
    (matched: NonNullable<ProductExistenceValidationData["matchedProduct"]>, forceOverwrite = false) => {
      if (matched.name && (forceOverwrite || !name.trim())) {
        setName(matched.name);
      }
      if (matched.brand && (forceOverwrite || !brand.trim())) {
        setBrand(matched.brand);
      }
      if (matched.categories && matched.categories.length > 0 && (forceOverwrite || selectedCategories.length === 0)) {
        setSelectedCategories(matched.categories);
      } else if (matched.category && (forceOverwrite || selectedCategories.length === 0)) {
        setSelectedCategories([matched.category]);
      }
      if (matched.imageUri) {
        setCatalogIcon(matched.imageUri);
      }
    },
    [name, brand, selectedCategories]
  );

  // Live existential validation when user enters a valid GS1 barcode
  useEffect(() => {
    const clean = ean.trim().replace(/\s+/g, "");
    if (!clean) {
      setExistenceData(null);
      setValidatingExistence(false);
      return;
    }

    const gs1Check = validateGs1Barcode(clean);
    if (!gs1Check.isValid) {
      setExistenceData(null);
      setValidatingExistence(false);
      return;
    }

    let cancelled = false;
    setValidatingExistence(true);

    const timer = setTimeout(async () => {
      const result = await validateProductExistence({ ean: clean });
      if (cancelled) return;
      setValidatingExistence(false);
      setExistenceData(result);
      if (result?.exists && result.matchedProduct) {
        applyMatchedProduct(result.matchedProduct, false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ean]);

  const handleManualNameValidation = async () => {
    const cleanName = name.trim();
    if (cleanName.length < 3) {
      Alert.alert(t("common.warning"), "Digite pelo menos 3 caracteres do nome do produto para validar sua existência.");
      return;
    }
    setValidatingExistence(true);
    const result = await validateProductExistence({
      ean: ean.trim() || undefined,
      name: cleanName,
    });
    setValidatingExistence(false);
    setExistenceData(result);
    if (result?.exists && result.matchedProduct) {
      applyMatchedProduct(result.matchedProduct, false);
      if (!ean.trim() && result.ean) {
        setEan(result.ean);
      }
    }
  };

  const promptLogin = (onSuccessAction?: () => Promise<void>) => {
    Alert.alert(
      t("auth.loginRequired"),
      t("auth.loginToRegisterProduct"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("auth.quickConnect"),
          onPress: async () => {
            setLoading(true);
            try {
              await loginAsTestUser("user");
              if (onSuccessAction) {
                await onSuccessAction();
              }
            } catch (err: any) {
              setLoading(false);
              Alert.alert(t("common.error"), err?.message || t("errors.genericError"));
            }
          },
        },
        {
          text: t("navigation.login"),
          onPress: () => router.push("/login"),
        },
      ]
    );
  };

  const executeRegistration = async () => {
    setLoading(true);
    try {
      let finalName = name.trim();
      if (brand.trim() && !finalName.toLowerCase().includes(brand.trim().toLowerCase())) {
        finalName = `${brand.trim()} ${finalName}`;
      }
      if (unitInfo.trim() && !finalName.toLowerCase().includes(unitInfo.trim().toLowerCase())) {
        finalName = `${finalName} ${unitInfo.trim()}`;
      }

      const created = await createCustomProduct({
        name: finalName,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        category: selectedCategories.join(", ") || undefined,
        ean: ean.trim() || undefined,
        icon: catalogIcon || undefined,
        isPromotion,
        brand: brand.trim() || undefined,
        createdAt: recordDate.toISOString(),
        strictExistenceCheck: true,
      });

      setLoading(false);

      if (created.isSuspended || created.pendingApproval || created.verificationStatus === "pending_review") {
        const quorumCount = created.quorumUsersCount ?? 1;
        const quorumTarget = created.quorumTarget ?? 3;
        const message = created.alreadySubmittedByUser
          ? `Você já registrou este produto anteriormente. Para evitar duplicidade de um único usuário, ele permanece em análise até atingir o quórum de ${quorumTarget} usuários distintos (${quorumCount}/${quorumTarget} confirmações) ou ser aprovado pela moderação.`
          : `Este produto não consta nas bases nacionais e entrou em Quarentena de Validação (${quorumCount}/${quorumTarget} usuários distintos). Assim que ${quorumTarget} usuários diferentes registrarem o mesmo item (ou um moderador aprovar), ele ficará público nas buscas e concederá +25 XP!`;

        Alert.alert("Enviado para Análise (Quarentena)", message, [
          {
            text: t("common.done") || "Entendi",
            onPress: () => {
              router.replace("/");
            },
          },
        ]);
        return;
      }

      Alert.alert(t("common.success"), t("products.productRegisteredSuccess"), [
        {
          text: t("common.done"),
          onPress: () => {
            router.replace({
              pathname: "/registerProduct",
              params: {
                id: created.id ? String(created.id) : undefined,
                barcode: created.barcode || ean.trim(),
                name: created.name,
                category: created.category,
                imageUri: created.imageUri || undefined,
                lastPrice: created.lastPrice,
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      setLoading(false);

      if (error?.code === "TWO_FACTOR_REQUIRED" || String(error?.message).includes("duas etapas")) {
        setPending2FASubmit(() => executeRegistration);
        setIsTwoFactorModalVisible(true);
        return;
      }

      const isAuthError =
        error?.status === 401 ||
        error?.code === "UNAUTHORIZED" ||
        String(error?.message).toLowerCase().includes("token") ||
        String(error?.message).toLowerCase().includes("autentica");

      if (isAuthError) {
        promptLogin(executeRegistration);
        return;
      }

      Alert.alert(t("common.error"), error.message || t("errors.genericError"));
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.warning"), t("auth.nameRequired"));
      return;
    }

    if (ean.trim()) {
      const eanCheck = validateGs1Barcode(ean.trim());
      if (!eanCheck.isValid) {
        Alert.alert(
          t("common.warning"),
          eanCheck.reason || "O código de barras informado não possui um dígito verificador GS1 válido."
        );
        return;
      }
    }

    if (!isAuthenticated && !user) {
      promptLogin(executeRegistration);
      return;
    }

    if (!isTwoFactorVerified) {
      setPending2FASubmit(() => executeRegistration);
      setIsTwoFactorModalVisible(true);
      return;
    }

    await executeRegistration();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <KeyboardAwareScrollView 
          contentContainerStyle={styles.content}
          extraScrollHeight={100}
        >
        <Ionicons name="cube-outline" size={70} color={accent} style={styles.icon} />
        <Text style={[styles.title, themeStyles.text]} numberOfLines={2}>{t("products.customProductTitle")}</Text>
        <Text style={[styles.subtitle, themeStyles.subText]} numberOfLines={3}>
          {t("products.customProductSubtitle")}
        </Text>

        {!isAuthenticated && !user && (
          <View style={[styles.authBanner, { backgroundColor: isDark ? "rgba(255, 193, 7, 0.12)" : "rgba(255, 193, 7, 0.18)", borderColor: "#FFC107" }]}>
            <Ionicons name="sparkles" size={22} color="#FFC107" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.authBannerTitle, { color: isDark ? "#FFE082" : "#B78103" }]}>
                {t("auth.loginBannerTitle")} (+25 XP)
              </Text>
              <Text style={[styles.authBannerSubtitle, themeStyles.subText]}>
                {t("auth.loginBannerSubtitle")}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.authBannerBtn, { backgroundColor: accent }]}
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.authBannerBtnText}>{t("navigation.login")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>{t("productDetails.ean")} ({t("common.optional")})</Text>
          <FocusedInputWrapper borderRadius={12}>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                testID="custom-product-ean"
                style={[styles.input, themeStyles.text]}
                placeholder={t("scanner.barcode")}
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                keyboardType="numeric"
                value={ean}
                onChangeText={setEan}
              />
              {Boolean(ean.trim()) && (() => {
                const check = validateGs1Barcode(ean.trim());
                return (
                  <Ionicons
                    name={check.isValid ? "checkmark-circle" : "alert-circle"}
                    size={20}
                    color={check.isValid ? "#10B981" : "#F59E0B"}
                    style={{ marginLeft: 8 }}
                  />
                );
              })()}
            </View>
          </FocusedInputWrapper>
          {Boolean(ean.trim()) && (() => {
            const check = validateGs1Barcode(ean.trim());
            return (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                <Ionicons
                  name={check.isValid ? "shield-checkmark-outline" : "information-circle-outline"}
                  size={14}
                  color={check.isValid ? "#10B981" : "#F59E0B"}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: check.isValid ? "#10B981" : "#F59E0B",
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  {check.isValid
                    ? `Código ${check.format} autenticado pelo algoritmo GS1${check.isBrazilianPrefix ? " (Brasil 789/790)" : ""}`
                    : check.reason}
                </Text>
              </View>
            );
          })()}

          {validatingExistence ? (
            <View
              style={[
                styles.existenceCard,
                {
                  backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)",
                  borderColor: "#3B82F6",
                },
              ]}
            >
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 10 }} />
              <Text style={[styles.existenceText, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}>
                Verificando existência real nas bases nacionais (Varejo BR, OpenFoodFacts e GTIN)...
              </Text>
            </View>
          ) : existenceData ? (
            existenceData.exists && existenceData.matchedProduct ? (
              <View
                testID="custom-product-existence-verified"
                style={[
                  styles.existenceCard,
                  {
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.10)",
                    borderColor: "#10B981",
                  },
                ]}
              >
                {existenceData.matchedProduct.imageUri ? (
                  <Image
                    source={{ uri: getOptimizedImageUrl(existenceData.matchedProduct.imageUri, 160) }}
                    style={styles.existenceImage}
                    contentFit="contain"
                  />
                ) : (
                  <View style={[styles.existenceIconBadge, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                    <Ionicons
                      name={existenceData.isVariableWeightCode ? "scale-outline" : "checkmark-done-circle"}
                      size={24}
                      color="#10B981"
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <Ionicons
                      name={existenceData.isVariableWeightCode ? "scale" : "shield-checkmark"}
                      size={14}
                      color="#10B981"
                    />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#10B981" }}>
                      {existenceData.isVariableWeightCode
                        ? `ETIQUETA DE BALANÇA (PLU ${existenceData.pluCode})`
                        : "PRODUTO REAL CONFIRMADO"}
                    </Text>
                  </View>
                  <Text style={[styles.existenceTitle, themeStyles.text]} numberOfLines={2}>
                    {existenceData.matchedProduct.name}
                  </Text>
                  <Text style={[styles.existenceMeta, themeStyles.subText]} numberOfLines={2}>
                    Fonte: {existenceData.sourceLabel}
                    {existenceData.matchedProduct.category ? ` • ${existenceData.matchedProduct.category}` : ""}
                    {existenceData.matchedProduct.referencePrice
                      ? ` • Ref: R$ ${existenceData.matchedProduct.referencePrice.toFixed(2).replace(".", ",")}`
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.applyCatalogBtn, { backgroundColor: "#10B981" }]}
                  onPress={() => {
                    if (existenceData.matchedProduct) {
                      applyMatchedProduct(existenceData.matchedProduct, true);
                    }
                  }}
                >
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={styles.applyCatalogBtnText}>Usar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                testID="custom-product-existence-pending"
                style={[
                  styles.existenceCard,
                  {
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)",
                    borderColor: "#F59E0B",
                  },
                ]}
              >
                <Ionicons name="time-outline" size={22} color="#F59E0B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#F59E0B", marginBottom: 2 }}>
                    Novo Código GS1 (Cadastro em Análise)
                  </Text>
                  <Text style={[styles.existenceMeta, themeStyles.subText]}>
                    {existenceData.reason ||
                      "EAN matematicamente válido, mas ainda não indexado nas bases nacionais. Será enviado como Pendente de Verificação."}
                  </Text>
                </View>
              </View>
            )
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[styles.label, themeStyles.text, { marginBottom: 0 }]} numberOfLines={1}>
              {t("productDetails.productName")} *
            </Text>
            {name.trim().length >= 3 && !validatingExistence && (
              <TouchableOpacity
                testID="custom-product-verify-name-btn"
                onPress={handleManualNameValidation}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="search-circle-outline" size={16} color={accent} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: accent }}>
                  Confirmar nas Bases Nacionais
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <FocusedInputWrapper borderRadius={12}>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                testID="custom-product-name"
                style={[styles.input, themeStyles.text]}
                placeholder={t("products.productNamePlaceholder")}
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                value={name}
                onChangeText={setName}
              />
            </View>
          </FocusedInputWrapper>
        </View>

        {/* Informações Complementares (Marca & Unidade) */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>Marca</Text>
            <FocusedInputWrapper borderRadius={12}>
              <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
                <TextInput
                  testID="custom-product-brand"
                  style={[styles.input, themeStyles.text]}
                  placeholder={t("products.brandPlaceholder")}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
            </FocusedInputWrapper>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>Peso / Unidade</Text>
            <FocusedInputWrapper borderRadius={12}>
              <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
                <TextInput
                  testID="custom-product-unit"
                  style={[styles.input, themeStyles.text]}
                  placeholder={t("products.unitPlaceholder")}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                  value={unitInfo}
                  onChangeText={setUnitInfo}
                />
              </View>
            </FocusedInputWrapper>
          </View>
        </View>

        {/* Seleção de Múltiplas Categorias */}
        <View style={styles.inputGroup}>
          <CategorySelector
            selectedCategories={selectedCategories}
            onSelectCategories={setSelectedCategories}
            isMultiSelect={true}
            label={t("products.selectMultipleCategories")}
            showCustomOption={true}
          />
        </View>

        {/* Data do Cadastro */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>
            {t("products.productRegisteredDate") || "Data do Cadastro"}
          </Text>
          <View style={[styles.dateCard, themeStyles.inputBg, themeStyles.border]}>
            <View style={[styles.dateIconWrapper, { backgroundColor: `${accent}20` }]}>
              <Ionicons name="calendar" size={18} color={accent} />
            </View>
            <View style={styles.dateTextCol}>
              <Text style={[styles.dateText, themeStyles.text]} numberOfLines={1}>
                {formattedRecordDate}
              </Text>
              <Text style={[styles.dateSubText, themeStyles.subText]} numberOfLines={1}>
                {t("products.automaticDateNotice") || "Data vinculada automaticamente ao registro"}
              </Text>
            </View>
          </View>
        </View>

        {/* Card de Opção: É Promoção? */}
        <View
          style={[
            styles.promoToggleCard,
            {
              backgroundColor: isPromotion
                ? accent + "18"
                : isDark
                ? "#1A2234"
                : "#F8FAFC",
              borderColor: isPromotion ? accent : isDark ? "#2D3748" : "#E2E8F0",
            },
          ]}
        >
          <View style={styles.promoToggleContent}>
            <View style={[styles.promoIconWrapper, { backgroundColor: isPromotion ? accent : (isDark ? "#2D3748" : "#CBD5E1") }]}>
              <Ionicons name="pricetag" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.promoTextCol}>
              <Text style={[styles.promoToggleTitle, themeStyles.text]}>
                {t("products.isPromotion")}
              </Text>
              <Text style={[styles.promoToggleSubtitle, themeStyles.subText]}>
                {t("products.isPromotionSubtitle")}
              </Text>
            </View>
          </View>
          <Switch
            testID="custom-product-promo-switch"
            value={isPromotion}
            onValueChange={setIsPromotion}
            trackColor={{ false: isDark ? "#4B5563" : "#D1D5DB", true: accent + "80" }}
            thumbColor={isPromotion ? accent : "#F3F4F6"}
          />
        </View>

        <TouchableOpacity
          testID="custom-product-submit"
          style={[styles.button, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText} numberOfLines={1} ellipsizeMode="tail">
              {t("products.registerCustomButton")} (+25 XP)
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <TwoFactorModal
        visible={isTwoFactorModalVisible}
        onClose={() => {
          setIsTwoFactorModalVisible(false);
          setPending2FASubmit(null);
        }}
        onSuccess={() => {
          setIsTwoFactorModalVisible(false);
          const action = pending2FASubmit;
          setPending2FASubmit(null);
          if (action) action();
        }}
        actionDescription="Para cadastrar novos produtos na comunidade, confirme o código enviado para seu e-mail."
      />
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  authBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  authBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  authBannerSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  authBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  authBannerBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  inputContainer: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    height: 56,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  rowInputs: {
    flexDirection: "row",
    width: "100%",
  },
  promoToggleCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  promoToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  promoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  promoTextCol: {
    flex: 1,
  },
  promoToggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  promoToggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateTextCol: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  dateSubText: {
    fontSize: 11,
    lineHeight: 15,
  },
  existenceCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  existenceImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  existenceIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  existenceText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  existenceTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  existenceMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  applyCatalogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  applyCatalogBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
