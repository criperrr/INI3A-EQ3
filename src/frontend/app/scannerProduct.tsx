import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { fetchProductByEan } from "../services/productService";

export default function ScannerProduct() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const isProcessing = useRef(false);
  const router = useRouter();
  const { themeStyles, accent } = useTheme();
  const { t } = useI18n();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      isProcessing.current = false;
    }, []),
  );

  if (!permission) {
    return <View style={[styles.container, themeStyles.bg]} />;
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const product = await fetchProductByEan(data);

      setLoading(false);

      if (!product) {
        Alert.alert(
          t("scanner.productNotFound"),
          t("products.customProductSubtitle"),
          [
            {
              text: t("scanner.rescan"),
              onPress: () => {
                setTimeout(() => {
                  setScanned(false);
                  isProcessing.current = false;
                }, 1500);
              },
              style: "cancel",
            },
            {
              text: t("scanner.manualEntry"),
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
          ],
        );
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

      const isTimeout = error?.code === "TIMEOUT" || error?.message?.includes("demorou muito");
      const isTunnelError = error?.status === 503 || error?.status === 504 || error?.status === 502;

      let errorMsg = error?.message || t("errors.serverError");
      if (isTunnelError) {
        errorMsg = t("errors.networkError");
      } else if (isTimeout) {
        errorMsg = t("errors.timeoutError");
      }

      Alert.alert(
        t("common.error"),
        errorMsg,
        [
          {
            text: t("common.retry"),
            onPress: () => {
              setTimeout(() => {
                setScanned(false);
                isProcessing.current = false;
              }, 1500);
            },
          },
        ],
      );
    }
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      {!permission.granted ? (
        <PermissionNotice onRequestPermission={requestPermission} t={t} />
      ) : (
        <CameraView
          style={styles.cameraBackground}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "code128", "qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          {loading ? (
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color={accent} />
               <Text style={styles.loadingText}>{t("scanner.searchingProduct")}</Text>
             </View>
          ) : (
             <>
               <ScannerInstructions t={t} />
               <ScannerViewFinder />
               <View style={styles.manualEntryContainer}>
                 <TouchableOpacity
                   style={styles.manualEntryButton}
                   activeOpacity={0.8}
                   onPress={() => {
                     isProcessing.current = false;
                     router.push("/manualEanSearch");
                   }}
                 >
                   <Text style={styles.manualEntryText}>{t("scanner.manualEntry")}</Text>
                 </TouchableOpacity>
               </View>
             </>
          )}
        </CameraView>
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

const ScannerInstructions = ({ t }: { t: (key: any) => string }) => (
  <View style={styles.overlayTextContainer}>
    <Text style={styles.placeholderText} numberOfLines={1}>{t("scanner.title")}</Text>
    <Text style={styles.instructionText} numberOfLines={2}>
      {t("scanner.alignBarcode")}
    </Text>
  </View>
);

const ScannerViewFinder = () => (
  <View style={styles.scannerFrame}>
    <View style={[styles.corner, styles.topLeft]} />
    <View style={[styles.corner, styles.topRight]} />
    <View style={[styles.corner, styles.bottomLeft]} />
    <View style={[styles.corner, styles.bottomRight]} />
    <View style={styles.laserLine} />
  </View>
);

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraBackground: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", width: "100%" },
  loadingText: { color: "#FFFFFF", marginTop: 16, fontSize: 16, fontWeight: "bold" },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  overlayTextContainer: {
    position: "absolute",
    top: 60,
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 10,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  instructionText: { fontSize: 14, color: "#FFFFFF", opacity: 0.9 },
  scannerFrame: {
    width: 280,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 80,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#C8D92D",
    borderWidth: 6,
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
  laserLine: { width: "85%", height: 2, backgroundColor: "red", opacity: 0.6 },
  tempButtonStatic: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  tempButtonTextStatic: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  manualEntryContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    paddingHorizontal: 30,
    alignItems: "center",
  },
  manualEntryButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  manualEntryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
