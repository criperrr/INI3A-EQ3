import React, { useState } from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, usePathname } from "expo-router";
import Header from "../components/Header";
import Footer, { TabKey } from "../components/Footer";
import Sidebar from "../components/Sidebar";

const COLORS = {
    background: "#F4F6F9",
};

export default function Layout() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    // Adicionamos a tipagem ": TabKey" para o TypeScript validar os retornos
    const getActiveTab = (): TabKey => {
        // Segurança: se o pathname for undefined, evita o quebra do .includes()
        if (!pathname) return "home";

        if (pathname === "/") return "home";
        if (pathname.includes("/map")) return "map";

        // CORREÇÃO AQUI: Mudado de "scanner" para "registerProduct"
        if (pathname.includes("/scannerProduct")) return "registerProduct";

        if (pathname.includes("/search")) return "search";
        if (pathname.includes("/profile")) return "profile";

        return "home";
    };

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                <Header onPressMenu={() => setIsMenuOpen(true)} />
                <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

                <View style={styles.contentWrapper}>
                    <Slot />
                </View>

                <Footer activeTab={getActiveTab()}/>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentWrapper: {
        flex: 1,
    },
});