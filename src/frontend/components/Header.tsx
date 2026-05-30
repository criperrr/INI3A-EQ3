import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    darkBlue: "#273462",
    white: "#FFFFFF",
};

interface HeaderProps {
    onPressMenu?: () => void;
}

export default function Header({ onPressMenu }: HeaderProps) {
    return (
        <View style={styles.container}>
            {/* Menu Sanduíche */}
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.iconButton}
                onPress={onPressMenu}
            >
                <Ionicons name="menu-outline" size={26} color={COLORS.darkBlue} />
            </TouchableOpacity>

            {/* Identidade Centralizada */}
            <View style={styles.logoContainer}>
                <Text style={styles.logoText}>PResco</Text>
            </View>

            {/* Ícone de Configurações */}
            <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
                <Ionicons name="settings-outline" size={24} color={COLORS.darkBlue} />
            </TouchableOpacity>
        </View>
    );
}

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
    logoText: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        letterSpacing: 0.5,
    },
});