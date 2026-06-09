import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";


const COLORS = {
    white: "#FFFFFF",
    vibrantBlue: "#0062CC",
    darkBlue: "#273462",
};

export default function ScannerProduct() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();

    if (!permission) {
        return <View style={styles.container} />;
    }

    const handleSimulateScan = () => {
        router.push("/scannerConfirmation");
    };

    return (
        <View style={styles.container}>

            {!permission.granted ? (
                <PermissionNotice onRequestPermission={requestPermission} />
            ) : (
                <CameraView style={styles.cameraBackground} facing="back">
                    <ScannerInstructions />
                    <ScannerViewFinder />

                    <TouchableOpacity
                        style={styles.tempButton}
                        activeOpacity={0.8}
                        onPress={handleSimulateScan}
                    >
                        <Text style={styles.tempButtonText}>Simular Scan</Text>
                    </TouchableOpacity>
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
    tempButton: {
        position: "absolute",
        bottom: 120,
        backgroundColor: COLORS.white,
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    tempButtonText: {
        color: COLORS.vibrantBlue,
        fontWeight: "bold",
        fontSize: 16,
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
    },
});