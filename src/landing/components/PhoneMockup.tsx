import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface PhoneMockupProps {
    theme: SemanticTheme;
}

type ScreenTab = "home" | "cart" | "search" | "product" | "profile" | "scanner" | "settings";

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ theme }) => {
    const [activeTab, setActiveTab] = useState<ScreenTab>("home");
    const { width } = Dimensions.get("window");
    const isMobile = width < 480;

    const prints: Record<ScreenTab, any> = {
        home: require("../assets/prints/print-home.jpg"),
        cart: require("../assets/prints/print-cart.png"),
        search: require("../assets/prints/print-search.jpg"),
        product: require("../assets/prints/print-product.jpg"),
        profile: require("../assets/prints/print-profile.jpg"),
        scanner: require("../assets/prints/print-scanner.jpg"),
        settings: require("../assets/prints/print-settings.jpg"),
    };

    const tabs: { key: ScreenTab; label: string }[] = [
        { key: "home", label: "🏠 Início & Radar" },
        { key: "cart", label: "🛒 Otimizador" },
        { key: "search", label: "🏷️ Catálogo" },
        { key: "product", label: "🔍 Menor Preço" },
        { key: "profile", label: "🏆 Perfil & XP" },
        { key: "scanner", label: "📸 Scanner" },
        { key: "settings", label: "⚙️ 2FA & Ajustes" },
    ];

    return (
        <View style={styles.wrapper}>
            {/* Screen Selector Tabs */}
            <View
                style={[
                    styles.tabSelector,
                    {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.surface.border,
                    },
                ]}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tabBtn,
                                isActive && [
                                    styles.tabBtnActive,
                                    { backgroundColor: theme.accent },
                                ],
                            ]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    {
                                        color: isActive
                                            ? "#000000"
                                            : theme.text.secondary,
                                    },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Smartphone Frame */}
            <View
                style={[
                    styles.phoneShell,
                    {
                        backgroundColor: "#05070A",
                        borderColor: theme.accent + "55",
                        shadowColor: theme.accent,
                    },
                    isMobile && styles.phoneShellMobile,
                ]}
            >
                {/* Dynamic Island / Camera Notch */}
                <View style={styles.phoneNotchRow}>
                    <View style={styles.phoneSpeaker} />
                    <View style={styles.phoneCameraLens} />
                </View>

                {/* Display Area */}
                <View style={styles.phoneScreen}>
                    <Image
                        source={prints[activeTab]}
                        style={styles.printImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Home indicator bar */}
                <View style={styles.phoneHomeBar} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: 440,
    },
    tabSelector: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        padding: 6,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
        justifyContent: "center",
        width: "100%",
    },
    tabBtn: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    tabBtnActive: {
        shadowColor: "#FFB703",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
    phoneShell: {
        width: 340,
        height: 640,
        borderRadius: 48,
        borderWidth: 3,
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 8,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 40,
        elevation: 20,
    },
    phoneShellMobile: {
        width: 300,
        height: 560,
    },
    phoneNotchRow: {
        height: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    phoneSpeaker: {
        width: 48,
        height: 4,
        backgroundColor: "#1F2937",
        borderRadius: 2,
    },
    phoneCameraLens: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#374151",
    },
    phoneScreen: {
        flex: 1,
        borderRadius: 36,
        overflow: "hidden",
        marginTop: 6,
        backgroundColor: "#0D1117",
    },
    printImage: {
        width: "100%",
        height: "100%",
    },
    phoneHomeBar: {
        width: 120,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 6,
    },
});
