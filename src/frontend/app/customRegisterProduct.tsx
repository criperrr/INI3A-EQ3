
import React, { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import { createCustomProduct } from "../services/productService";
import CategorySelector from "../components/CategorySelector";
import { formatLongDateWithWeekday } from "../utils/dateUtils";

export default function CustomRegisterProduct() {
  const params = useLocalSearchParams<{ ean?: string }>();
  const [ean, setEan] = useState(params.ean || "");
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [recordDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { themeStyles, accent, isDark, tokens } = useTheme();
  const { semantic } = tokens;
  const { t, language } = useI18n();
  const { isAuthenticated, user, loginAsTestUser } = useAuth();

  const formattedRecordDate = formatLongDateWithWeekday(recordDate, language);

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
        isPromotion,
        brand: brand.trim() || undefined,
        createdAt: recordDate.toISOString(),
      });

      setLoading(false);

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

    if (!isAuthenticated && !user) {
      promptLogin(executeRegistration);
      return;
    }

    await executeRegistration();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder={t("scanner.barcode")}
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              keyboardType="numeric"
              value={ean}
              onChangeText={setEan}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>{t("productDetails.productName")} *</Text>
          <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder={t("products.productNamePlaceholder")}
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Informações Complementares (Marca & Unidade) */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>Marca</Text>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder={t("products.brandPlaceholder")}
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                value={brand}
                onChangeText={setBrand}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>Peso / Unidade</Text>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder={t("products.unitPlaceholder")}
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                value={unitInfo}
                onChangeText={setUnitInfo}
              />
            </View>
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
            value={isPromotion}
            onValueChange={setIsPromotion}
            trackColor={{ false: isDark ? "#4B5563" : "#D1D5DB", true: accent + "80" }}
            thumbColor={isPromotion ? accent : "#F3F4F6"}
          />
        </View>

        <TouchableOpacity
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
      </ScrollView>
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
});
