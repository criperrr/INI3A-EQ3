import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout } from "react-native-maps";



const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    background: "#F4F6F9",
    grayText: "#64748B",
};

const INITIAL_REGION = {
    latitude: -23.55052,
    longitude: -46.633308,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0124,
};

const MOCK_MARKERS = [
    { id: 1, title: "Union Market", coordinate: { latitude: -23.55052, longitude: -46.633308 } },
    { id: 2, title: "Mercado Central", coordinate: { latitude: -23.55500, longitude: -46.635000 } },
    { id: 3, title: "Hortifruti", coordinate: { latitude: -23.54800, longitude: -46.630000 } }
];

const FILTER_OPTIONS = [
    { id: "type", label: "Tipo de Loja", icon: "storefront-outline" },
    { id: "distance", label: "Distância", icon: "navigate-outline" },
    { id: "hours", label: "Horário", icon: "time-outline" }
] as const;

export default function MapScreen() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <View style={styles.container}>


            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={INITIAL_REGION}
                    showsUserLocation
                >
                    {MOCK_MARKERS.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                            pinColor={COLORS.darkBlue}
                        >
                            <Callout tooltip>
                                <View style={styles.calloutContainer}>
                                    <Text style={styles.calloutText}>{marker.title}</Text>
                                </View>
                            </Callout>
                        </Marker>
                    ))}
                </MapView>

                <View style={styles.filtersWrapper}>
                    {FILTER_OPTIONS.map((filter) => (
                        <TouchableOpacity key={filter.id} style={styles.filterCard} activeOpacity={0.8}>
                            <Ionicons name={filter.icon} size={24} color={COLORS.darkBlue} />
                            <Text style={styles.filterText}>{filter.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

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
        paddingTop: 100,
        paddingBottom: 90,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    filtersWrapper: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 16,
        zIndex: 10,
    },
    filterCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        width: "30%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterText: {
        fontSize: 12,
        color: COLORS.darkBlue,
        marginTop: 6,
        textAlign: "center",
        fontWeight: "500",
    },
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