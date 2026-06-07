import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const COLORS = {
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    gray: "#8E8E93",
    centerDarkBg: "#2C2C2E",
};

type TabKey = "home" | "search" | "registerProduct" | "map" | "profile";

interface FooterProps {
    activeTab?: TabKey;
}

interface TabConfig {
    key: TabKey;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    route: string;
    isCenter?: boolean;
}

const NAV_TABS: TabConfig[] = [
    { key: "home", icon: "home-outline", activeIcon: "home", route: "/" },
    { key: "search", icon: "search-outline", activeIcon: "search", route: "/search" },
    { key: "registerProduct", icon: "add", activeIcon: "add", route: "/scannerProduct", isCenter: true },
    { key: "map", icon: "map-outline", activeIcon: "map", route: "/map" },
    { key: "profile", icon: "person-outline", activeIcon: "person", route: "/profile" },
];

export default function Footer({ activeTab }: FooterProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.key;

                if (tab.isCenter) {
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.centerItem}
                            activeOpacity={0.8}
                            onPress={() => router.push(tab.route as any)}
                        >
                            <View style={[styles.centerCircle, isActive && styles.centerCircleActive]}>
                                <Ionicons name={tab.icon} size={32} color={COLORS.white} />
                            </View>
                        </TouchableOpacity>
                    );
                }

                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.navItem}
                        activeOpacity={0.7}
                        onPress={() => router.push(tab.route as any)}
                    >
                        {isActive ? (
                            <View style={styles.activeCircle}>
                                <Ionicons name={tab.activeIcon} size={24} color={COLORS.white} />
                            </View>
                        ) : (
                            <Ionicons name={tab.icon} size={26} color={COLORS.gray} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// --- Estilos ---

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
        backgroundColor: COLORS.centerDarkBg,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    centerCircleActive: {
        backgroundColor: COLORS.vibrantBlue,
    }
});