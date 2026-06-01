import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout } from "react-native-maps";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    background: "#F4F6F9",
    grayText: "#64748B",
};

export default function MapScreen() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Região inicial do mapa (mock)
    const initialRegion = {
        latitude: -23.55052,
        longitude: -46.633308,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0124,
    };

    // Marcadores baseados no protótipo
    const markers = [
        {
            id: 1,
            title: "Union Market",
            coordinate: { latitude: -23.55052, longitude: -46.633308 },
        },
        {
            id: 2,
            title: "Mercado Central",
            coordinate: { latitude: -23.55500, longitude: -46.635000 },
        },
        {
            id: 3,
            title: "Hortifruti",
            coordinate: { latitude: -23.54800, longitude: -46.630000 },
        }
    ];

    return (
        <View style={styles.container}>
            {/* Header e Sidebar integrados */}
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Container Principal do Mapa */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                >
                    {markers.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                            pinColor={COLORS.darkBlue}
                        >
                            {/* Tooltip do marcador */}
                            <Callout tooltip>
                                <View style={styles.calloutContainer}>
                                    <Text style={styles.calloutText}>{marker.title}</Text>
                                </View>
                            </Callout>
                        </Marker>
                    ))}
                </MapView>

                {/* Botões de Filtro Flutuantes */}
                <View style={styles.filtersWrapper}>
                    <TouchableOpacity style={styles.filterCard} activeOpacity={0.8}>
                        <Ionicons name="storefront-outline" size={24} color={COLORS.darkBlue} />
                        <Text style={styles.filterText}>Tipo de Loja</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterCard} activeOpacity={0.8}>
                        <Ionicons name="navigate-outline" size={24} color={COLORS.darkBlue} />
                        <Text style={styles.filterText}>Distância</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterCard} activeOpacity={0.8}>
                        <Ionicons name="time-outline" size={24} color={COLORS.darkBlue} />
                        <Text style={styles.filterText}>Horário</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Footer com a aba de mapa ativa */}
            <Footer activeTab="map" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    mapContainer: {
        flex: 1,
        paddingTop: 100, // Espaço para o Header não cobrir os filtros
        paddingBottom: 90, // Espaço para o Footer
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },

    // Filtros Flutuantes
    filtersWrapper: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 16, // Afasta um pouco do Header
        zIndex: 10, // Garante que fique sobre o mapa
    },
    filterCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        width: "30%", // Divide o espaço igualmente entre os 3
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // Sombra para Android
    },
    filterText: {
        fontSize: 12,
        color: COLORS.darkBlue,
        marginTop: 6,
        textAlign: "center",
        fontWeight: "500",
    },

    // Estilo do Tooltip (Callout) do Marcador
    calloutContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#EAEAEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    calloutText: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
});