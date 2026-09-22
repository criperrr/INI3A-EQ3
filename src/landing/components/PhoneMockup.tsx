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

type ScreenTab = "cart" | "scanner" | "product" | "map";

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ theme }) => {
    const [activeTab, setActiveTab] = useState<ScreenTab>("cart");
    const { width } = Dimensions.get("window");
    const isMobile = width < 480;

    const prints = {
        cart: require("../assets/prints/print-cart.jpg"),
        scanner: require("../assets/prints/print-scanner.jpg"),
        product: require("../assets/prints/print-product.jpg"),
    };

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
                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "cart" && [
                            styles.tabBtnActive,
                            { backgroundColor: theme.accent },
                        ],
                    ]}
                    onPress={() => setActiveTab("cart")}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color:
                                    activeTab === "cart"
                                        ? "#000000"
                                        : theme.text.secondary,
                            },
                        ]}
                    >
                        🛒 Carrinho & Rotas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "scanner" && [
                            styles.tabBtnActive,
                            { backgroundColor: theme.accent },
                        ],
                    ]}
                    onPress={() => setActiveTab("scanner")}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color:
                                    activeTab === "scanner"
                                        ? "#000000"
                                        : theme.text.secondary,
                            },
                        ]}
                    >
                        📸 Scanner de Gôndola
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "product" && [
                            styles.tabBtnActive,
                            { backgroundColor: theme.accent },
                        ],
                    ]}
                    onPress={() => setActiveTab("product")}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color:
                                    activeTab === "product"
                                        ? "#000000"
                                        : theme.text.secondary,
                            },
                        ]}
                    >
                        🔍 Menor Preço Local
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "map" && [
                            styles.tabBtnActive,
                            { backgroundColor: theme.accent },
                        ],
                    ]}
                    onPress={() => setActiveTab("map")}
                >
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color:
                                    activeTab === "map" ? "#000000" : theme.text.secondary,
                            },
                        ]}
                    >
                        🗺️ Radar 15km
                    </Text>
                </TouchableOpacity>
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
                    {activeTab !== "map" ? (
                        <Image
                            source={prints[activeTab as "cart" | "scanner" | "product"]}
                            style={styles.printImage}
                            resizeMode="cover"
                        />
                    ) : (
                        /* Radar 15km Map Screen Simulation with Yellow/Gold Theme */
                        <View style={styles.mapContainer}>
                            <View style={styles.mapCanvas}>
                                <View
                                    style={[styles.userGpsPin, { borderColor: theme.accent }]}
                                >
                                    <View
                                        style={[
                                            styles.userGpsCenter,
                                            { backgroundColor: theme.accent },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.radarWave,
                                            { borderColor: theme.accent + "40" },
                                        ]}
                                    />
                                </View>

                                {/* Market Pin 1 */}
                                <View style={[styles.marketPin, { top: 70, left: 40, backgroundColor: theme.accent }]}>
                                    <Text style={styles.marketPinText}>Atacadão • 1.2km</Text>
                                </View>

                                {/* Market Pin 2 */}
                                <View style={[styles.marketPin, { top: 140, right: 35, backgroundColor: theme.accent }]}>
                                    <Text style={styles.marketPinText}>Assaí • 2.8km</Text>
                                </View>

                                {/* Market Pin 3 */}
                                <View style={[styles.marketPin, { bottom: 80, left: 70, backgroundColor: theme.accent }]}>
                                    <Text style={styles.marketPinText}>Sonda • 3.5km</Text>
                                </View>
                            </View>

                            <View
                                style={[
                                    styles.mapBottomCard,
                                    {
                                        backgroundColor: theme.isDark ? "#161B22" : "#FFFFFF",
                                        borderColor: theme.accent + "50",
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.mapCardTitle,
                                        { color: theme.isDark ? "#FFFFFF" : "#111827" },
                                    ]}
                                >
                                    📍 8 Mercados no Raio de 15km
                                </Text>
                                <Text
                                    style={[
                                        styles.mapCardDesc,
                                        { color: theme.text.secondary },
                                    ]}
                                >
                                    Cálculo geodésico Haversine e rotas inteligentes com integração direta ao Waze e Google Maps.
                                </Text>
                            </View>
                        </View>
                    )}
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
    mapContainer: {
        flex: 1,
        justifyContent: "space-between",
        padding: 12,
        backgroundColor: "#0D1117",
    },
    mapCanvas: {
        flex: 1,
        position: "relative",
        borderRadius: 20,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1F2937",
        overflow: "hidden",
    },
    userGpsPin: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -12,
        marginTop: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    userGpsCenter: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    radarWave: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
    },
    marketPin: {
        position: "absolute",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    marketPinText: {
        color: "#030712",
        fontSize: 10,
        fontWeight: "800",
    },
    mapBottomCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 10,
    },
    mapCardTitle: {
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 4,
    },
    mapCardDesc: {
        fontSize: 11,
        lineHeight: 16,
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
