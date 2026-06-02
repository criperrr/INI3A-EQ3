import React from "react";
import { View, Text, StyleSheet } from "react-native";
// Se você já tiver o Header, pode importar aqui. Caso contrário, comente a linha abaixo.
// import Header from "../components/Header";
import Footer from "../components/Footer";

export default function RegisterProduct() {
    return (
        <View style={styles.container}>
            {/* <Header title="Escanear Produto" /> */}

            {/* Fundo simulando a câmera */}
            <View style={styles.cameraBackground}>
                <Text style={styles.placeholderText}>Câmera Ativada</Text>
                <Text style={styles.instructionText}>Alinhe o código de barras no centro</Text>

                {/* Container da "Mira" do Scanner */}
                <View style={styles.scannerFrame}>
                    {/* Cantos da Mira */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Simulação da linha do laser (Opcional, dá um charme) */}
                    <View style={styles.laserLine} />
                </View>
            </View>

            <Footer activeTab="registerProduct" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    cameraBackground: {
        flex: 1,
        backgroundColor: "#8E8E93", // Cinza simulando a câmera sem imagem
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        position: "absolute",
        top: 60,
        fontSize: 20,
        fontWeight: "bold",
        color: "#FFF",
    },
    instructionText: {
        position: "absolute",
        top: 90,
        fontSize: 14,
        color: "#FFF",
        opacity: 0.8,
    },
    scannerFrame: {
        width: 280,
        height: 180,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 40,
        height: 40,
        borderColor: "#C8D92D", // Cor verde/amarelada do mockup
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
        opacity: 0.4,
    }
});