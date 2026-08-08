import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "../content/themeContent";
import { apiRequest } from "../services/api";

const COLORS = {
  white: "#FFFFFF",
  accent: "#2E7D32",
};

export default function ScannerProduct() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const isProcessing = useRef(false);
  const router = useRouter();
  const { themeStyles } = useTheme();

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
      // Pequeno log para debugar o escaneamento
      console.log(`Buscando produto para o código: ${data}`);
      const product = await apiRequest(`/products/barcode/${data}`);
      
      setLoading(false);
      
      router.push({
        pathname: "/scannerConfirmation",
        params: {
          category: product?.category || "Categoria Não Encontrada",
          name: product?.name || "Produto Não Encontrado",
          imageUri: product?.imageUri || "https://via.placeholder.com/150",
          lastPrice: product?.lastPrice || "Preço não informado",
          barcode: data,
        },
      });
    } catch (error: any) {
      setLoading(false);
      
      const isTimeout = error?.code === "TIMEOUT" || error?.message?.includes("demorou muito");
      const isNetworkError = error?.message?.includes("Network request failed") || error?.message?.includes("fetch");
      const isTunnelError = error?.status === 503 || error?.status === 504 || error?.status === 502;

      if (isTimeout || isNetworkError || isTunnelError) {
        const errorMsg = isTunnelError 
          ? "O túnel (localtunnel) está indisponível. O backend pode não estar rodando ou o túnel caiu." 
          : "Não foi possível conectar ao servidor. Verifique se o backend e o túnel estão online.";
          
        Alert.alert(
          "Erro de Conexão",
          errorMsg,
          [
            { 
              text: "Tentar Novamente", 
              onPress: () => {
                setTimeout(() => {
                  setScanned(false);
                  isProcessing.current = false;
                }, 1500);
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          "Produto Não Encontrado",
          "O código de barras não foi encontrado na base de dados. Deseja cadastrá-lo manualmente?",
          [
            { 
              text: "Escanear Novamente", 
              onPress: () => {
                // Delay artificial para que o usuário tire o celular do código de barras
                setTimeout(() => {
                  setScanned(false);
                  isProcessing.current = false;
                }, 1500);
              }, 
              style: "cancel" 
            },
            { 
              text: "Cadastrar Manual", 
              onPress: () => {
                isProcessing.current = false;
                router.push({
                  pathname: "/scannerConfirmation",
                  params: {
                    category: "Sem Categoria",
                    name: "Novo Produto",
                    imageUri: "https://via.placeholder.com/150",
                    lastPrice: "Preço não informado",
                    barcode: data,
                  },
                });
              } 
            }
          ]
        );
      }
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
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          {loading ? (
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color={COLORS.accent} />
               <Text style={styles.loadingText}>Buscando produto...</Text>
             </View>
          ) : (
             <>
               <ScannerInstructions />
               <ScannerViewFinder />
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
  loadingOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", width: "100%" },
  loadingText: { color: COLORS.white, marginTop: 16, fontSize: 16, fontWeight: "bold" },
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
    backgroundColor: COLORS.accent,
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
