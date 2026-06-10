import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

const COLORS = {
    white: "#FFFFFF",
    vibrantBlue: "#0062CC",
    darkBlue: "#273462",
};

export default function ScannerProduct() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const router = useRouter();

    // Reseta o estado do scanner sempre que a tela ganha foco
    useFocusEffect(
        useCallback(() => {
            setScanned(false);
        }, [])
    );

    if (!permission) {
        return <View style={styles.container} />;
    }

    // 1. O expo-camera detecta o código usando ML Kit/Apple Vision e dispara esta função
    const handleBarcodeScanned = ({ data }: { data: string }) => {
        // Trava para não ler o mesmo código 50 vezes por segundo
        if (scanned) return;
        setScanned(true);

        // 2. Exibe o resultado direto na tela para você validar o teste
        Alert.alert(
            "Leitura Bem-Sucedida! 🚀",
            `O ML Kit leu o seguinte código:\n\n${data}`,
            [
                {
                    text: "Escanear Novamente",
                    onPress: () => setScanned(false)
                },
                {
                    text: "Testar Redirecionamento",
                    onPress: () => {
                        // Se quiser testar o fluxo de telas com dados falsos:
                        router.push({
                            pathname: "/scannerConfirmation",
                            params: {
                                category: "Categoria Teste",
                                name: "Produto Teste Mockado",
                                imageUri: "https://via.placeholder.com/150",
                                lastPrice: "R$ 99,90",
                                barcode: data
                            }
                        });
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
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
                    <ScannerInstructions />
                    <ScannerViewFinder />
                </CameraView>
            )}
        </View>
    );
}

// --- Componentes Internos ---

const PermissionNotice = ({ onRequestPermission }: { onRequestPermission: () => Promise<any> }) => (
    <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Precisamos da sua permissão para usar a câmera.</Text>
        <TouchableOpacity style={styles.tempButtonStatic} activeOpacity={0.8} onPress={onRequestPermission}>
            <Text style={styles.tempButtonTextStatic}>Conceder Permissão</Text>
        </TouchableOpacity>
    </View>
);

const ScannerInstructions = () => (
    <View style={styles.overlayTextContainer}>
        <Text style={styles.placeholderText}>Câmera Ativada</Text>
        <Text style={styles.instructionText}>Alinhe o código de barras no centro</Text>
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
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    cameraBackground: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    permissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    permissionText: {
        fontSize: 16,
        color: COLORS.darkBlue,
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
    instructionText: {
        fontSize: 14,
        color: COLORS.white,
        opacity: 0.9,
    },
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
    laserLine: {
        width: "85%",
        height: 2,
        backgroundColor: "red",
        opacity: 0.6,
    },
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
    }
});