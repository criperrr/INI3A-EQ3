import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgHomeIcon,
    SvgCartIcon,
    SvgSearchIcon,
    SvgTagIcon,
    SvgTrophyIcon,
    SvgCameraIcon,
    SvgShieldIcon,
} from "./SvgIcons";

interface PhoneMockupProps {
    theme: SemanticTheme;
}

type ScreenTab = "home" | "cart" | "search" | "product" | "profile" | "scanner" | "settings";

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ theme }) => {
    const [activeTab, setActiveTab] = useState<ScreenTab>("home");
    const { width } = useWindowDimensions();
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

    const tabs: { key: ScreenTab; label: string; Icon: React.FC<any> }[] = [
        { key: "home", label: "Início", Icon: SvgHomeIcon },
        { key: "cart", label: "Otimizador", Icon: SvgCartIcon },
        { key: "product", label: "Preços", Icon: SvgTagIcon },
        { key: "scanner", label: "Scanner", Icon: SvgCameraIcon },
        { key: "profile", label: "Perfil & XP", Icon: SvgTrophyIcon },
        { key: "settings", label: "Segurança", Icon: SvgShieldIcon },
    ];

    return (
        <View style={styles.wrapper}>
            {/* Screen Selector Tabs with 100% SVG Icons (Zero Emojis) */}
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
                    const { Icon } = tab;
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
                            activeOpacity={0.8}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Icon
                                size={14}
                                color={isActive ? "#000000" : theme.text.secondary}
                            />
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

                {/* Display Area with App Screenshot */}
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
        maxWidth: 380,
    },
    tabSelector: {
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: 8,
        columnGap: 6,
        padding: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        justifyContent: "space-between",
        width: "100%",
    },
    tabBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 6,
        borderRadius: 10,
        width: "31.5%",
    },
    tabBtnActive: {
        shadowColor: "#FFB703",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
    },
    tabBtnText: {
        fontSize: 11,
        fontWeight: "700",
    },
    phoneShell: {
        width: 320,
        height: 620,
        borderRadius: 44,
        borderWidth: 3,
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 8,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 36,
        elevation: 16,
    },
    phoneShellMobile: {
        width: 290,
        height: 560,
        borderRadius: 40,
    },
    phoneNotchRow: {
        height: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    phoneSpeaker: {
        width: 44,
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
        borderRadius: 32,
        overflow: "hidden",
        marginTop: 6,
        backgroundColor: "#0D1117",
    },
    printImage: {
        width: "100%",
        height: "100%",
    },
    phoneHomeBar: {
        width: 110,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 6,
    },
});
