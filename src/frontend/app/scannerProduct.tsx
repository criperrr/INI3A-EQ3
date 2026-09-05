import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { fetchProductByEan } from "../services/productService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 300);
const VIEWFINDER_HEIGHT = 160;

function AnimatedLaser({ accent }: { accent: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(VIEWFINDER_HEIGHT - 16, {
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.laserLine,
        { backgroundColor: accent, shadowColor: accent },
        animatedStyle,
      ]}
    />
  );
}

export default function ScannerProduct() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const isProcessing = useRef(false);
  const router = useRouter();
  const { themeStyles, accent } = useTheme();
  const { t } = useI18n();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      setTorch(false);
      isProcessing.current = false;
    }, [])
  );

  const toggleTorch = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setTorch((prev) => !prev);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current || scanned) return;
    isProcessing.current = true;
    setScanned(true);
    setLoading(true);

    if (Platform.OS !== "web") {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const showNotFoundAlert = () => {
      Alert.alert(
        t("scanner.productNotFoundTitle"),
        t("scanner.productNotFoundMessage"),
        [
          {
            text: t("scanner.actionRescan"),
            onPress: () => {
              setTimeout(() => {
                setScanned(false);
                isProcessing.current = false;
              }, 800);
            },
            style: "cancel",
          },
          {
            text: t("scanner.actionTypeBarcode"),
            onPress: () => {
              isProcessing.current = false;
              router.push("/manualEanSearch");
            },
          },
          {
            text: t("scanner.actionRegisterProduct"),
            onPress: () => {
              isProcessing.current = false;
              router.push({
                pathname: "/customRegisterProduct",
                params: {
                  ean: data,
                },
              });
            },
          },
        ]
      );
    };

    try {
      const product = await fetchProductByEan(data);

      setLoading(false);

      if (!product) {
        showNotFoundAlert();
        return;
      }

      router.push({
        pathname: "/scannerConfirmation",
        params: {
          id: product.id ? String(product.id) : undefined,
          category: product.category || t("scanner.category"),
          name: product.name || t("scanner.productName"),
          imageUri: product.imageUri || product.icon || undefined,
          lastPrice: product.lastPrice || t("products.pricePlaceholder"),
          barcode: product.barcode || data,
          ean: product.ean || data,
        },
      });
    } catch (error: any) {
      setLoading(false);

      const isNotFound =
        error?.status === 404 ||
        error?.code === "PRODUCT_NOT_FOUND" ||
        error?.code === "NOT_FOUND" ||
        String(error?.message).toLowerCase().includes("não encontrado");

      if (isNotFound) {
        showNotFoundAlert();
        return;
      }

      const isTimeout = error?.code === "TIMEOUT" || error?.message?.includes("demorou muito");
      const isTunnelError = error?.status === 503 || error?.status === 504 || error?.status === 502;

      let errorMsg = error?.message || t("errors.serverError");
      if (isTunnelError) {
        errorMsg = t("errors.networkError");
      } else if (isTimeout) {
        errorMsg = t("errors.timeoutError");
      }

      Alert.alert(t("common.error"), errorMsg, [
        {
          text: t("common.retry"),
          onPress: () => {
            setTimeout(() => {
              setScanned(false);
              isProcessing.current = false;
            }, 1000);
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {!permission.granted ? (
        <PermissionNotice onRequestPermission={requestPermission} t={t} />
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "code128"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          {/* Mask Overlay: Top, Center Row (Left, Cutout, Right), Bottom */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Top Mask */}
            <View style={styles.maskTop}>
              <View style={styles.topInfoCard}>
                <Text style={styles.topTitle}>{t("scanner.title")}</Text>
                <Text style={styles.topSubtitle}>{t("scanner.alignBarcode")}</Text>
              </View>
            </View>

            {/* Center Row */}
            <View style={styles.maskCenterRow}>
              <View style={styles.maskSide} />

              <View
                style={[
                  styles.viewfinder,
                  { width: VIEWFINDER_WIDTH, height: VIEWFINDER_HEIGHT },
                ]}
              >
                {/* 4 Corners */}
                <View style={[styles.corner, styles.topLeft, { borderColor: accent }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: accent }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: accent }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: accent }]} />

                {/* Animated Scanning Laser Line */}
                {!loading && !scanned && <AnimatedLaser accent={accent} />}

                {/* Loading state indicator in center */}
                {loading && (
                  <View style={styles.centerLoadingContainer}>
                    <ActivityIndicator size="large" color={accent} />
                    <Text style={styles.centerLoadingText}>
                      {t("scanner.searchingProduct")}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.maskSide} />
            </View>

            {/* Bottom Mask */}
            <View style={styles.maskBottom}>
              <View style={styles.controlsRow}>
                {/* Torch / Flashlight Button */}
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    torch && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={toggleTorch}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={torch ? "flash" : "flash-outline"}
                    size={22}
                    color={torch ? "#000" : "#FFF"}
                  />
                  <Text
                    style={[
                      styles.controlButtonText,
                      torch && { color: "#000", fontWeight: "700" },
                    ]}
                  >
                    {t("scanner.flashlight")}
                  </Text>
                </TouchableOpacity>

                {/* Manual EAN Entry Button */}
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    isProcessing.current = false;
                    router.push("/manualEanSearch");
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="keypad-outline" size={22} color="#FFF" />
                  <Text style={styles.controlButtonText}>
                    {t("scanner.manualEntry")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// --- Componentes Internos ---

const PermissionNotice = ({
  onRequestPermission,
  t,
}: {
  onRequestPermission: () => Promise<any>;
  t: (key: any) => string;
}) => {
  const { themeStyles, accent } = useTheme();
  return (
    <View style={styles.permissionContainer}>
      <Ionicons name="camera-outline" size={64} color={accent} style={{ marginBottom: 16 }} />
      <Text style={[styles.permissionText, themeStyles.text]}>
        {t("scanner.permissionRequired")}
      </Text>
      <TouchableOpacity
        style={[styles.tempButtonStatic, { backgroundColor: accent }]}
        activeOpacity={0.8}
        onPress={onRequestPermission}
      >
        <Text style={styles.tempButtonTextStatic}>{t("scanner.grantPermission")}</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Estilos ---
const MASK_BG = "rgba(0, 0, 0, 0.58)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#000",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
    color: "#FFF",
  },
  tempButtonStatic: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  tempButtonTextStatic: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Mask Sections
  maskTop: {
    flex: 1,
    backgroundColor: MASK_BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  topInfoCard: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  topSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },

  maskCenterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  maskSide: {
    flex: 1,
    height: VIEWFINDER_HEIGHT,
    backgroundColor: MASK_BG,
  },
  viewfinder: {
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },

  // Viewfinder Corners
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },

  // Laser Scan Line
  laserLine: {
    position: "absolute",
    top: 8,
    width: "90%",
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  // Center Loading
  centerLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  centerLoadingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },

  // Bottom Mask
  maskBottom: {
    flex: 1.25,
    backgroundColor: MASK_BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 8,
  },
  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
