import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    darkBlue: "#273462",
    white: "#FFFFFF",
};

interface HeaderProps {
    onPressMenu?: () => void;
    onPressSettings?: () => void;
}

export default function Header({ onPressMenu, onPressSettings }: HeaderProps) {
    return (
        <View style={styles.container}>
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

// --- Componentes Internos ---

const LogoBrand = () => (
    <View style={styles.logoContainer}>
        <Image
            source={require("./images/logo-presco.png")}
            style={styles.logoImage}
        />
        <Text style={styles.logoText}>PResco</Text>
    </View>
);

// --- Estilos ---

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        paddingTop: 45,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
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