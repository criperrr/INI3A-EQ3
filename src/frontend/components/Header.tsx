import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
// 1. Importa o hook para lidar com a área segura
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
    darkBlue: "#273462",
    white: "#FFFFFF",
};

interface HeaderProps {
    onPressMenu?: () => void;
    onPressSettings?: () => void;
}

export default function Header({ onPressMenu, onPressSettings }: HeaderProps) {
    // 2. Captura os espaçamentos do sistema (iOS / Android)
    const insets = useSafeAreaInsets();

    return (
        // 3. Aplica o insets.top dinamicamente somado a um respiro interno (8px)
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.iconButton}
                onPress={onPressMenu}
            >
                <Ionicons name="menu-outline" size={26} color={COLORS.darkBlue} />
            </TouchableOpacity>

            <LogoBrand />

            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.iconButton}
                onPress={onPressSettings}
            >
                <Ionicons name="settings-outline" size={24} color={COLORS.darkBlue} />
            </TouchableOpacity>
        </View>
    );
}

const LogoBrand = () => (
    <View style={styles.logoContainer}>
        <Image
            source={require("./images/logo-presco.png")}
            style={styles.logoImage}
        />
        <Text style={styles.logoText}>PResco</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        // height: 70, <- Removido para permitir que o Header cresça com o Notch
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 12, // Mantém o espaçamento inferior fixo e limpo
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: "#EAEAEA",
        zIndex: 10,
    },
    iconButton: {
        padding: 6,
    },
    logoContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    logoImage: {
        width: 50,
        height: 50,
        resizeMode: "contain",
        marginRight: 8,
    },
    logoText: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        letterSpacing: 0.5,
    },
});