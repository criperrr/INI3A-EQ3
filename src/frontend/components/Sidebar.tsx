import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    if (!isOpen) return null;

    return (
        <View style={styles.overlay}>
            {/* Área de fechar ao tocar fora do menu */}
            <TouchableOpacity style={styles.blurTouch} activeOpacity={1} onPress={onClose} />

            {/* Painel do Menu Lateral */}
            <View style={styles.menuPanel}>

                {/* Topo do Menu - Placeholder do Ipê Amarelo */}
                <View style={styles.treeSection}>
                    <View style={styles.ipePlaceholder} />
                    <Text style={styles.treeText}>PResco</Text>
                </View>

                {/* Links de Opções */}
                <View style={styles.linksContainer}>
                    <TouchableOpacity style={styles.linkItem}>
                        <Text style={styles.linkText}>Minha Conta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkItem}>
                        <Text style={styles.linkText}>Configurações</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkItem}>
                        <Text style={styles.linkText}>Ajuda</Text>
                    </TouchableOpacity>
                </View>

                {/* Canto Inferior Esquerdo - Onde ficará a Ararinha Curiosa */}
                <View style={styles.ararinhaContainer}>
                    <View style={styles.ararinhaPlaceholder}>
                        {/* Texto representativo até a inserção da imagem final */}
                        <Text style={styles.ararinhaText}>🦜</Text>
                    </View>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        flexDirection: "row",
        zIndex: 100,
    },
    blurTouch: {
        position: "absolute",
        width: width,
        height: height,
    },
    menuPanel: {
        width: width * 0.72, // Ocupa em torno de 72% da largura da tela
        height: "100%",
        backgroundColor: "#F4F6F9", // Tom claro de fundo do menu
        paddingTop: 60,
        paddingHorizontal: 24,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        position: "relative",
    },
    treeSection: {
        marginBottom: 40,
        alignItems: "flex-start",
    },
    ipePlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#FFD700", // Cor base amarela representando o ipê
        opacity: 0.8,
        marginBottom: 12,
    },
    treeText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#273462",
    },
    linksContainer: {
        gap: 20,
    },
    linkItem: {
        paddingVertical: 8,
    },
    linkText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#273462",
    },
    ararinhaContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 110,
        height: 110,
        justifyContent: "flex-end",
        alignItems: "flex-start",
    },
    ararinhaPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -10, // Efeito de saindo de fora da tela lateral
        marginBottom: 10,
    },
    ararinhaText: {
        fontSize: 42,
    },
});