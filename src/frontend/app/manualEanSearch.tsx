import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";
import { fetchProductByEan } from "../services/productService";

export default function ManualEanSearch() {
  const [ean, setEan] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();
  const { t } = useI18n();

  const handleSearch = async () => {
    const trimmedEan = ean.trim();
    if (!trimmedEan) {
      Alert.alert(t("common.warning"), t("scanner.alignBarcode"));
      return;
    }

    setLoading(true);
    try {
      const product = await fetchProductByEan(trimmedEan);
      setLoading(false);

      if (!product) {
        Alert.alert(
          t("scanner.productNotFound"),
          t("products.customProductSubtitle"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("navigation.register"),
              onPress: () => {
                router.push({
                  pathname: "/customRegisterProduct",
                  params: { ean: trimmedEan },
                });
              },
            },
          ]
        );
        return;
      }

      router.push({
        pathname: "/scannerConfirmation",
        params: {
          id: product.id ? String(product.id) : undefined,
          category: product?.category || t("common.uncategorized"),
          name: product?.name || t("scanner.productNotFound"),
          imageUri: product?.imageUri || product?.icon || undefined,
          lastPrice: product?.lastPrice || t("productDetails.noOccurrences"),
          barcode: product?.barcode || trimmedEan,
          ean: product?.ean || trimmedEan,
        },
      });
    } catch (error: any) {
      setLoading(false);
      Alert.alert(t("common.error"), error.message || t("errors.networkError"));
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <View style={styles.content}>
        <Ionicons name="barcode-outline" size={80} color={accent} style={styles.icon} />
        <Text style={[styles.title, themeStyles.text]}>{t("scanner.manualSearchTitle")}</Text>
        <Text style={[styles.subtitle, themeStyles.subText]}>
          {t("scanner.manualSearchSubtitle")}
        </Text>

        <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
          <TextInput
            style={[styles.input, themeStyles.text]}
            placeholder={t("scanner.manualSearchPlaceholder")}
            placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
            keyboardType="numeric"
            value={ean}
            onChangeText={setEan}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{t("scanner.searchProductBtn")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 32,
  },
  inputContainer: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  input: {
    height: 56,
    fontSize: 18,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
