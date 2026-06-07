import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image } from "react-native";

const { width, height } = Dimensions.get("window");

const COLORS = {
    darkBlue: "#273462",
    background: "#F4F6F9",
    overlay: "rgba(0, 0, 0, 0.4)",
};

const MENU_LINKS = [
    { id: "account", label: "Minha Conta" },
    { id: "settings", label: "Configurações" },
    { id: "help", label: "Ajuda" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    if (!isOpen) return null;

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.blurTouch} activeOpacity={1} onPress={onClose} />

            <View style={styles.menuPanel}>
                <SidebarHeader />
                <NavigationLinks />
                <SidebarDecor />
            </View>
        </View>
    );
}

// --- Componentes Internos ---

const SidebarHeader = () => (
    <View style={styles.treeSection}>
        {/* Placeholder preparado para a imagem local do Ipê */}
        {/* <Image source={require('../assets/seu-galho-ipe.png')} style={styles.ipeImage} resizeMode="contain" /> */}
        <View style={styles.ipePlaceholder} />

        <Text style={styles.treeText}>PResco</Text>
    </View>
);

const NavigationLinks = () => (
    <View style={styles.linksContainer}>
        {MENU_LINKS.map((link) => (
            <TouchableOpacity key={link.id} style={styles.linkItem} activeOpacity={0.7}>
                <Text style={styles.linkText}>{link.label}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const SidebarDecor = () => (
    <View style={styles.ararinhaContainer}>
        {/* Placeholder preparado para a imagem local da Arara */}
        {/* <Image source={require('../assets/sua-arara.png')} style={styles.ararinhaImage} resizeMode="contain" /> */}
        <View style={styles.ararinhaPlaceholder}>
            <Text style={styles.ararinhaText}>🦜</Text>
        </View>
    </View>
);

// --- Estilos ---

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.overlay,
        flexDirection: "row",
        zIndex: 100,
    },
    blurTouch: {
        position: "absolute",
        width: width,
        height: height,
    },
    menuPanel: {
        width: width * 0.72,
        height: "100%",
        backgroundColor: COLORS.background,
        paddingTop: 40,
        paddingHorizontal: 24,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        position: "relative",
        overflow: "hidden",
    },

    // Header e Ipê
    treeSection: {
        marginBottom: 40,
        alignItems: "flex-start",
    },
    ipePlaceholder: {
        width: 130,
        height: 100,
        marginBottom: 8,
        marginLeft: -10,
        backgroundColor: "transparent",
    },
    ipeImage: {
        width: 130,
        height: 100,
        marginBottom: 8,
        marginLeft: -10,
    },
    treeText: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },

    // Navegação
    linksContainer: {
        gap: 20,
    },
    linkItem: {
        paddingVertical: 8,
    },
    linkText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.darkBlue,
    },

    // Decoração da Arara
    ararinhaContainer: {
        position: "absolute",
        bottom: -15,
        left: -20,
        width: 140,
        height: 140,
        justifyContent: "flex-end",
        alignItems: "flex-start",
    },
    ararinhaPlaceholder: {
        width: 140,
        height: 140,
        justifyContent: "center",
        alignItems: "center",
    },
    ararinhaText: {
        fontSize: 42,
    },
    ararinhaImage: {
        width: 140,
        height: 140,
        opacity: 0.9,
    },
});