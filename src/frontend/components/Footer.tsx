import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // <-- Importamos o hook de rotas do Expo

const COLORS = {
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    gray: "#8E8E93",
};

interface FooterProps {
    activeTab?: "home" | "search" | "map" | "profile";
}

export default function Footer({ activeTab = "home" }: FooterProps) {
    const router = useRouter(); // <-- Inicializamos o router

    return (
        <View style={styles.container}>
            {/* Ícone 1: Casa (Index / Home) */}
            <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => router.push("/")} // Navega para app/index.tsx
            >
                {activeTab === "home" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="home" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="home-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 2: Busca (Search) */}
            <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => router.push("/search")} // Navega para app/search.tsx
            >
                {activeTab === "search" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="search" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="search-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 3: Mapa (Map) */}
            <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => router.push("/map")} // Navega para app/map.tsx
            >
                {activeTab === "map" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="map" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="map-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 4: Perfil (Profile) */}
            <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => router.push("/profile")} // Navega para app/profile.tsx
            >
                {activeTab === "profile" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="person" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="person-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: COLORS.white,
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: 85,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 10,
    },
    navItem: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    activeCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.vibrantBlue,
        alignItems: "center",
        justifyContent: "center",
    },
});