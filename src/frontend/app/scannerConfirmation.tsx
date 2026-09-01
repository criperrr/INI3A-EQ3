import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";
import { fetchProductOccurrences } from "../services/ocurrencyService";
import {
  getCategoryEmoji,
  getLocalizedCategoryName,
} from "../constants/productCategories";

export default function ScannerConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    ean?: string;
    name?: string;
    category?: string;
    imageUri?: string;
    lastPrice?: string;
  }>();
  const { themeStyles, accent, tokens } = useTheme();
  const { semantic } = tokens;
  const { user } = useAuth();
  const { t } = useI18n();

  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);

  const product = {
    id: params.id,
    category: params.category || t("scanner.confirmProduct"),
    name: params.name || t("scanner.productFound"),
    imageUri: params.imageUri || undefined,
    lastPrice: params.lastPrice || t("productDetails.noOccurrences"),
    barcode: params.barcode || params.ean || "",
    ean: params.ean || params.barcode || "",
  };

  const parseDateSafe = (dateInput: string | Date | number | null | undefined): number => {
    if (!dateInput) return 0;
    if (typeof dateInput === "number") return dateInput;
    if (dateInput instanceof Date) return dateInput.getTime();
    let str = String(dateInput).trim();
    if (str.includes(" ")) {
      str = str.replace(" ", "T");
    }
    str = str.replace(/([+-]\d{2})$/, "$1:00");
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const fallback = new Date(dateInput).getTime();
    return isNaN(fallback) ? 0 : fallback;
  };

  useEffect(() => {
    if (!user?.id || !product.id) {
      setCooldownRemainingSeconds(0);
      return;
    }

    let isMounted = true;
    const fetchAndCheckCooldown = async () => {
      try {
        const occList = await fetchProductOccurrences(Number(product.id));
        if (!isMounted) return;
        const currentUserId = Number(user.id);
        const userOcc = occList.find((occ) => {
          if (Number(occ.userId) !== currentUserId) return false;
          const createdMs = parseDateSafe(occ.createdAt);
          if (!createdMs) return false;
          const diff = Date.now() - createdMs;
          return diff >= 0 && diff < 5 * 60 * 1000;
        });

        if (userOcc) {
          const createdMs = parseDateSafe(userOcc.createdAt);
          const remaining = Math.max(0, Math.ceil((createdMs + 5 * 60 * 1000 - Date.now()) / 1000));
          setCooldownRemainingSeconds(remaining);
        } else {
          setCooldownRemainingSeconds(0);
        }
      } catch {}
    };

    fetchAndCheckCooldown();
    const interval = setInterval(fetchAndCheckCooldown, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id, product.id]);

  const isCooldownActive = cooldownRemainingSeconds > 0;

  const formatCooldownTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleConfirm = () => {
    if (isCooldownActive) {
      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
      Alert.alert(
        t("common.warning"),
        t("products.cooldownError"),
      );
      return;
    }

    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    router.push({
      pathname: "/registerProduct",
      params: {
        id: product.id,
        barcode: product.barcode,
        ean: product.ean,
        name: product.name,
        category: product.category,
        imageUri: product.imageUri,
        lastPrice: product.lastPrice,
      },
    });
  };

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        themeStyles.bg,
        { paddingHorizontal: semantic.spacing.screenPaddingHorizontal },
      ]}
    >
      {/* Header Compacto de Etapa */}
      <View style={styles.headerSection}>
        <View
          style={[
            styles.headerBadge,
            {
              backgroundColor: `${accent}18`,
              borderColor: `${accent}33`,
            },
          ]}
        >
          <Ionicons
            name="scan-outline"
            size={13}
            color={accent}
            style={styles.headerBadgeIcon}
          />
          <Text style={[styles.headerBadgeText, { color: accent }]}>
            {t("scanner.confirmProduct")}
          </Text>
        </View>
        <Text
          style={[
            styles.headerSubtitle,
            {
              color: semantic.colors.text.secondary,
              ...semantic.typography.caption,
            },
          ]}
          numberOfLines={1}
        >
          {t("scanner.confirmProductSubtitle")}
        </Text>
      </View>

      {/* Card Principal Preenchendo a Tela */}
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: semantic.colors.surface.card,
            borderColor: semantic.colors.border.default,
            borderRadius: semantic.radius.card,
            padding: 16,
            ...semantic.elevation.card,
          },
        ]}
      >
        {/* Seção Superior Flexível: Foto Ampliada e Metadados */}
        <View style={styles.topSection}>
          {/* Imagem Ampliada do Produto */}
          <View
            style={[
              styles.imageContainer,
              {
                backgroundColor: semantic.colors.surface.input,
                borderRadius: semantic.radius.image,
              },
            ]}
          >
            {product.imageUri ? (
              <Image
                source={{ uri: product.imageUri }}
                style={styles.productImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="cube-outline"
                  size={36}
                  color={semantic.colors.text.secondary}
                />
                <Text
                  style={[
                    styles.placeholderText,
                    { color: semantic.colors.text.secondary },
                  ]}
                >
                  {t("common.noImage")}
                </Text>
              </View>
            )}
          </View>

          {/* Categoria e Nome */}
          <View style={styles.infoContainer}>
            {Boolean(product.category) && (
              <Text
                style={[
                  styles.productCategory,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.badge,
                  },
                ]}
                numberOfLines={1}
              >
                {getCategoryEmoji(product.category)}{" "}
                {getLocalizedCategoryName(product.category, t).toUpperCase()}
              </Text>
            )}
            <Text
              style={[
                styles.productName,
                {
                  color: semantic.colors.text.primary,
                  ...semantic.typography.productTitle,
                },
              ]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
          </View>

          {/* Linha Horizontal com EAN e Último Preço */}
          <View style={styles.metaRow}>
            {Boolean(product.barcode) && (
              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: semantic.colors.surface.input,
                    borderColor: semantic.colors.border.default,
                    borderRadius: semantic.radius.badge,
                  },
                ]}
              >
                <Ionicons
                  name="barcode-outline"
                  size={14}
                  color={semantic.colors.text.secondary}
                  style={styles.chipIcon}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: semantic.colors.text.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {product.barcode}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: `${accent}14`,
                  borderColor: `${accent}2E`,
                  borderRadius: semantic.radius.badge,
                },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={accent}
                style={styles.chipIcon}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: accent, fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {product.lastPrice}
              </Text>
            </View>
          </View>
        </View>

        {/* Seção Inferior: Pergunta e Botões de Ação */}
        <View style={styles.bottomSection}>
          {/* Divisor Semântico */}
          <View
            style={[
              styles.divider,
              { backgroundColor: semantic.colors.border.divider },
            ]}
          />

          {/* Card Pergunta de Confirmação */}
          <View
            style={[
              styles.questionContainer,
              {
                backgroundColor: semantic.colors.surface.input,
                borderColor: `${accent}28`,
                borderRadius: semantic.radius.input,
              },
            ]}
          >
            <View
              style={[
                styles.questionIconBadge,
                { backgroundColor: `${accent}1A` },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={accent}
              />
            </View>
            <View style={styles.questionTextContainer}>
              <Text
                style={[
                  styles.questionTitle,
                  {
                    color: semantic.colors.text.primary,
                    ...semantic.typography.bodyBold,
                  },
                ]}
                numberOfLines={1}
              >
                {t("scanner.isThisScannedProduct")}
              </Text>
              <Text
                style={[
                  styles.questionSubtitle,
                  {
                    color: semantic.colors.text.secondary,
                    ...semantic.typography.micro,
                  },
                ]}
                numberOfLines={1}
              >
                {t("scanner.confirmPromptSubtitle")}
              </Text>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonConfirm,
                isCooldownActive
                  ? {
                      backgroundColor: semantic.colors.surface.input,
                      borderColor: semantic.colors.border.default,
                      borderWidth: 1,
                      opacity: 0.7,
                    }
                  : { backgroundColor: accent },
                { borderRadius: semantic.radius.pill },
              ]}
              activeOpacity={isCooldownActive ? 1 : 0.8}
              onPress={handleConfirm}
              disabled={isCooldownActive}
            >
              <Ionicons
                name={isCooldownActive ? "time-outline" : "checkmark-sharp"}
                size={17}
                color={isCooldownActive ? semantic.colors.text.tertiary : "#FFFFFF"}
                style={styles.buttonIcon}
              />
              <Text
                style={[
                  styles.buttonConfirmText,
                  isCooldownActive ? { color: semantic.colors.text.tertiary } : { color: "#FFFFFF" },
                ]}
                numberOfLines={1}
              >
                {isCooldownActive
                  ? `${t("common.yes")} (${formatCooldownTime(cooldownRemainingSeconds)})`
                  : t("common.yes")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonCancel,
                {
                  borderColor: semantic.colors.border.default,
                  borderRadius: semantic.radius.pill,
                  borderWidth: 1,
                  backgroundColor: "transparent",
                },
              ]}
              activeOpacity={0.8}
              onPress={handleCancel}
            >
              <Ionicons
                name="close-sharp"
                size={17}
                color={semantic.colors.feedback.error}
                style={styles.buttonIcon}
              />
              <Text
                style={[
                  styles.buttonCancelText,
                  { color: semantic.colors.feedback.error },
                ]}
                numberOfLines={1}
              >
                {t("common.no")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  headerBadgeIcon: {
    marginRight: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    textAlign: "center",
    fontSize: 12,
  },
  cardContainer: {
    flex: 1,
    width: "100%",
    borderWidth: 1,
    justifyContent: "space-between",
  },
  topSection: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    minHeight: 140,
    maxHeight: 250,
    overflow: "hidden",
    marginBottom: 10,
    alignSelf: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: {
    fontSize: 12,
  },
  infoContainer: {
    alignItems: "center",
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  productCategory: {
    marginBottom: 2,
    fontSize: 11,
    fontWeight: "600",
  },
  productName: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomSection: {
    width: "100%",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 10,
  },
  questionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  questionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  questionTextContainer: {
    flex: 1,
  },
  questionTitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  questionSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonConfirm: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonCancel: {},
  buttonIcon: {
    marginRight: 5,
  },
  buttonConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  buttonCancelText: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
});
