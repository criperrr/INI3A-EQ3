import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "../content/themeContent";
import { getProductByBarcode } from "../services/productService";

const COLORS = {
  white: "#FFFFFF",
  vibrantBlue: "#0062CC",
};

export default function ScannerProduct() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter();
  const { themeStyles } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setIsFetching(false);
    }, []),
  );

  if (!permission) {
    return <View style={[styles.container, themeStyles.bg]} />;
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isFetching) return;
    setScanned(true);
    setIsFetching(true);

    try {
      const product = await getProductByBarcode(data);
      // Product found (or created from Open Food Facts) -> go to confirmation
      router.push({
        pathname: "/scannerConfirmation",
        params: {
          id: product.id,
          name: product.name,
          imageUri: product.icon || "https://via.placeholder.com/150",
          barcode: data,
          description: product.description || "",
        },
      });
    } catch (err: any) {
      // Product not found in local DB and Open Food Facts -> go to manual registration
      if (err.status === 404) {
        Alert.alert(
          "Produto Não Encontrado",
          "Este produto não existe no catálogo do Presco nem na base do Open Food Facts. Deseja cadastrá-lo manualmente?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => setScanned(false) },
            {
              text: "Cadastrar",
              onPress: () => {
                router.push({
                  pathname: "/registerProduct",
                  params: { barcode: data },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert("Erro na Leitura", "Não foi possível verificar o produto. Tente novamente.", [
          { text: "OK", onPress: () => setScanned(false) }
        ]);
      }
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      {!permission.granted ? (
        <PermissionNotice onRequestPermission={requestPermission} />
      ) : (
        <CameraView
          style={styles.cameraBackground}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "code128", "qr"],
          }}
          onBarcodeScanned={scanned || isFetching ? undefined : handleBarcodeScanned}
        >
          {isFetching && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.white} />
              <Text style={styles.loadingText}>Buscando informações...</Text>
            </View>
          )}
          <ScannerInstructions />
          <ScannerViewFinder />
        </CameraView>
      )}
    </View>
  );
}

// --- Componentes Internos ---

const PermissionNotice = ({
  onRequestPermission,
}: {
  onRequestPermission: () => Promise<any>;
}) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.permissionContainer}>
      <Text style={[styles.permissionText, themeStyles.text]}>
        Precisamos da sua permissão para usar a câmera.
      </Text>
      <TouchableOpacity
        style={styles.tempButtonStatic}
        activeOpacity={0.8}
        onPress={onRequestPermission}
      >
        <Text style={styles.tempButtonTextStatic}>Conceder Permissão</Text>
      </TouchableOpacity>
    </View>
  );
};

const ScannerInstructions = () => (
  <View style={styles.overlayTextContainer}>
    <Text style={styles.placeholderText}>Câmera Ativada</Text>
    <Text style={styles.instructionText}>
      Alinhe o código de barras no centro
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "bold",
  },
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
    color: COLORS.white,
    marginBottom: 5,
  },
  instructionText: { fontSize: 14, color: COLORS.white, opacity: 0.9 },
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
    backgroundColor: COLORS.vibrantBlue,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  tempButtonTextStatic: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
