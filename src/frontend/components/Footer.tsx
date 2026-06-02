import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const COLORS = {
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    gray: "#8E8E93",
};

interface FooterProps {
    activeTab?: "home" | "search" | "registerProduct" | "map" | "profile";
}

export default function Footer({ activeTab = "home" }: FooterProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Ícone 1: Casa */}
            <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => router.push("/")}>
                {activeTab === "home" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="home" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="home-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 2: Busca */}
            <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => router.push("/search")}>
                {activeTab === "search" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="search" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="search-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 3: Central (Adicionar Produto) */}
            <TouchableOpacity style={styles.centerItem} activeOpacity={0.8} onPress={() => router.push("/registerProduct")}>
                <View style={[styles.centerCircle, activeTab === "registerProduct" && styles.centerCircleActive]}>
                    <Ionicons name="add" size={32} color={COLORS.white} />
                </View>
            </TouchableOpacity>

            {/* Ícone 4: Mapa */}
            <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => router.push("/map")}>
                {activeTab === "map" ? (
                    <View style={styles.activeCircle}>
                        <Ionicons name="map" size={24} color={COLORS.white} />
                    </View>
                ) : (
                    <Ionicons name="map-outline" size={26} color={COLORS.gray} />
                )}
            </TouchableOpacity>

            {/* Ícone 5: Perfil */}
            <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => router.push("/profile")}>
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
    centerItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    centerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#2c2c2e", // Cor escura para destacar como no mockup
        alignItems: "center",
        justifyContent: "center",
        marginTop: -30, // Puxa o botão para fora do footer
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    centerCircleActive: {
        backgroundColor: COLORS.vibrantBlue, // Muda de cor se estiver na tela de registro
    }
});