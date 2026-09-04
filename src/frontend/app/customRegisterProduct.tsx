
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import { createCustomProduct } from "../services/productService";
import CategorySelector from "../components/CategorySelector";

export default function CustomRegisterProduct() {
  const params = useLocalSearchParams<{ ean?: string }>();
  const [ean, setEan] = useState(params.ean || "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, user, loginAsTestUser } = useAuth();

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
      const created = await createCustomProduct({
        name: name.trim(),
        category: category.trim() || undefined,
        ean: ean.trim() || undefined,
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
        <Ionicons name="cube-outline" size={80} color={accent} style={styles.icon} />
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

        <View style={styles.inputGroup}>
          <CategorySelector
            selectedCategory={category}
            onSelectCategory={setCategory}
            label={t("productDetails.category")}
            showCustomOption={true}
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
});
