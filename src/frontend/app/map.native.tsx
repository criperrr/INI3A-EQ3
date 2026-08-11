import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Image,
    Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useTheme } from "../content/themeContent";

// --- Constantes e Opções dos Filtros ---
const COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
};

const SHOP_TYPES = [
    { label: "Todos os Mercados", value: "all" },
    { label: "Supermercados", value: "supermarket" },
    { label: "Mercados de Bairro / Conveniência", value: "convenience" },
    { label: "Mercearias & Hortifruti", value: "grocery" },
];

const DISTANCE_OPTIONS = [
    { label: "1 km", value: 1000 },
    { label: "3 km", value: 3000 },
    { label: "5 km", value: 5000 },
    { label: "10 km", value: 10000 },
];

const HOURS_OPTIONS = [
    { label: "Todos os Horários", value: "all" },
    { label: "Com Horário Informado", value: "with_hours" },
];

const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
];

interface MarketMarker {
    id: string;
    title: string;
    coordinate: { latitude: number; longitude: number };
    straightDistance: number;
    routeDistance: number;
    openingHours?: string;
}

// --- Funções Utilitárias ---

const formatOpeningHoursBR = (hours: string | null | undefined): string => {
    if (!hours) return "Horário de funcionamento não informado";
    if (hours === "24/7") return "Aberto 24 horas";

    let formatted = hours
        .replace(/\bMo\b/g, "Seg")
        .replace(/\bTu\b/g, "Ter")
        .replace(/\bWe\b/g, "Qua")
        .replace(/\bTh\b/g, "Qui")
        .replace(/\bFr\b/g, "Sex")
        .replace(/\bSa\b/g, "Sáb")
        .replace(/\bSu\b/g, "Dom")
        .replace(/\bPH\b/g, "Feriados")
        .replace(/\boff\b/g, "fechado")
        .replace(/\bclosed\b/g, "fechado");

    formatted = formatted.replace(/([A-Z][a-z]+|Sáb|Dom)-([A-Z][a-z]+|Sáb|Dom)/g, "$1 a $2");

    return formatted;
};

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const fetchRouteDistances = async (userLat: number, userLon: number, markers: MarketMarker[]): Promise<MarketMarker[]> => {
    if (markers.length === 0) return markers;

    const coords = markers.map(m => `${m.coordinate.longitude},${m.coordinate.latitude}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${userLon},${userLat};${coords}?sources=0&annotations=distance`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.distances && data.distances[0]) {
            const distances = data.distances[0];
            return markers.map((marker, index) => {
                const routeDistanceInMeters = distances[index + 1];
                return {
                    ...marker,
                    routeDistance: routeDistanceInMeters !== null ? (routeDistanceInMeters / 1000) : marker.straightDistance
                };
            });
        }
    } catch (error) {
        console.error("Erro ao buscar distâncias OSRM:", error);
    }
    return markers.map(m => ({ ...m, routeDistance: m.straightDistance }));
};

const fetchOverpassMarkets = async (lat: number, lng: number, radius: number, shopType: string) => {
    let shopFilter = '["shop"="supermarket"]';
    if (shopType === "convenience") shopFilter = '["shop"="convenience"]';
    else if (shopType === "grocery") shopFilter = '["shop"="grocery"]';
    else if (shopType === "all") shopFilter = '["shop"~"supermarket|convenience|grocery|deli|general"]';

    const query = `[out:json][timeout:25];nwr(around:${radius},${lat},${lng})${shopFilter};out center;`;
    let lastErrorStatus = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "application/json",
                    "User-Agent": "MarketFinderApp/1.0 (contato@marketfinder.com)"
                },
                body: `data=${encodeURIComponent(query)}`
            });

            if (response.ok) {
                return await response.json();
            }

            lastErrorStatus = response.status;
            console.warn(`Aviso: Erro ${response.status} no endpoint ${endpoint}. Tentando próximo...`);
        } catch (error) {
            console.warn(`Aviso: Falha ao conectar em ${endpoint}. Tentando próximo...`);
        }
    }

    if (lastErrorStatus === 406) throw new Error("Erro 406: Servidor recusou a conexão (Verifique os cabeçalhos).");
    if (lastErrorStatus === 429) throw new Error("Servidores sobrecarregados (Erro 429). Aguarde um instante.");

    throw new Error("Não foi possível conectar à base de dados de mapas.");
};

export default function MapScreen() {
    const { themeStyles, isDark } = useTheme();
    const mapRef = useRef<MapView>(null);

    // Estados Globais e de Loading
    const [initialLoading, setInitialLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Estados de Localização e Dados
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [cachedOverpassData, setCachedOverpassData] = useState<{ radius: number; type: string; elements: any[] }>({ radius: 0, type: "", elements: [] });
    const [evaluatedMarkets, setEvaluatedMarkets] = useState<MarketMarker[]>([]);
    const [visibleMarkers, setVisibleMarkers] = useState<MarketMarker[]>([]);

    // Estados dos Filtros e Modal
    const [selectedShopType, setSelectedShopType] = useState<string>("supermarket");
    const [selectedDistance, setSelectedDistance] = useState<number>(5000);
    const [selectedHoursFilter, setSelectedHoursFilter] = useState<string>("all");
    const [activeFilterModal, setActiveFilterModal] = useState<"type" | "distance" | "hours" | null>(null);

    // Estado para armazenar o mercado selecionado ao clicar no marcador
    const [selectedMarket, setSelectedMarket] = useState<MarketMarker | null>(null);

    // NOVA FUNÇÃO: Centralizar no usuário
    const centerOnUserLocation = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
    };

    // Inicialização da Localização
    const initLocation = useCallback(async () => {
        try {
            setErrorMsg(null);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') throw new Error('Permissão de localização negada.');

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        } catch (error: any) {
            setErrorMsg(error.message || "Não foi possível obter a localização exata.");
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        initLocation();
    }, [initLocation]);

    // PIPELINE 1: Busca na API Overpass
    useEffect(() => {
        if (!userLocation) return;

        const requiredRadius = Math.floor(selectedDistance * 1.3);

        if (cachedOverpassData.type === selectedShopType && cachedOverpassData.radius >= requiredRadius) {
            return;
        }

        const fetchApis = async () => {
            setIsProcessing(true);
            try {
                const data = await fetchOverpassMarkets(userLocation.latitude, userLocation.longitude, requiredRadius, selectedShopType);
                setCachedOverpassData({
                    radius: requiredRadius,
                    type: selectedShopType,
                    elements: data.elements || []
                });
            } catch (error: any) {
                console.error("Erro no Overpass:", error);
                setErrorMsg(error.message || "Falha ao buscar estabelecimentos.");
                setInitialLoading(false);
                setIsProcessing(false);
            }
        };

        fetchApis();
    }, [userLocation, selectedShopType, selectedDistance]);

    // PIPELINE 2: Processamento e cálculo de rotas (OSRM)
    useEffect(() => {
        if (!userLocation || cachedOverpassData.elements.length === 0) {
            setEvaluatedMarkets([]);
            setInitialLoading(false);
            setIsProcessing(false);
            return;
        }

        const processRoutes = async () => {
            setIsProcessing(true);

            let parsedMarkers: MarketMarker[] = cachedOverpassData.elements.map((element: any) => {
                const lat = element.type === 'node' ? element.lat : element.center?.lat;
                const lon = element.type === 'node' ? element.lon : element.center?.lon;
                if (!lat || !lon) return null;

                return {
                    id: String(element.id),
                    title: element.tags?.name || "Mercado / Loja",
                    coordinate: { latitude: lat, longitude: lon },
                    straightDistance: getDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon),
                    routeDistance: 0,
                    openingHours: element.tags?.opening_hours || null,
                };
            }).filter(Boolean) as MarketMarker[];

            parsedMarkers.sort((a, b) => a.straightDistance - b.straightDistance);
            const topClosestMarkers = parsedMarkers.slice(0, 25);

            const withRouteDistances = await fetchRouteDistances(userLocation.latitude, userLocation.longitude, topClosestMarkers);

            setEvaluatedMarkets(withRouteDistances);
            setInitialLoading(false);
            setIsProcessing(false);
        };

        processRoutes();
    }, [cachedOverpassData, userLocation]);

    // PIPELINE 3: Filtros Locais
    useEffect(() => {
        if (!userLocation || evaluatedMarkets.length === 0) {
            setVisibleMarkers([]);
            return;
        }

        const filtered = evaluatedMarkets.filter(marker => {
            if (selectedHoursFilter === "with_hours" && !marker.openingHours) return false;
            if ((marker.routeDistance * 1000) > selectedDistance) return false;
            return true;
        });

        filtered.sort((a, b) => a.routeDistance - b.routeDistance);
        setVisibleMarkers(filtered);

        if (mapRef.current) {
            if (filtered.length > 0) {
                const coordsToFit = filtered.map(m => m.coordinate);
                coordsToFit.push(userLocation);

                setTimeout(() => {
                    mapRef.current?.fitToCoordinates(coordsToFit, {
                        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
                        animated: true,
                    });
                }, 500);
            } else {
                mapRef.current.animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05
                }, 1000);
            }
        }
    }, [evaluatedMarkets, selectedDistance, selectedHoursFilter, userLocation]);

    const getFilterLabel = (filterId: string) => {
        if (filterId === "type") {
            const current = SHOP_TYPES.find((s) => s.value === selectedShopType);
            return current ? current.label.split("/")[0] : "Tipo";
        }
        if (filterId === "distance") return `${selectedDistance / 1000} km`;
        if (filterId === "hours") return selectedHoursFilter === "with_hours" ? "Com Horário" : "Horários";
        return "";
    };

    // Função para abrir o Google Maps
    const openDirections = (market: MarketMarker) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${market.coordinate.latitude},${market.coordinate.longitude}`;
        Linking.openURL(url).catch(() => {
            alert("Não foi possível abrir o Google Maps.");
        });
    };

    // --- Renderização Condicional ---
    if (initialLoading) {
        return (
            <View style={[styles.container, styles.centered, themeStyles.bg]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={[styles.loadingText, themeStyles.text]}>Preparando o mapa e rotas...</Text>
            </View>
        );
    }

    if (errorMsg) {
        return (
            <View style={[styles.container, styles.centered, themeStyles.bg]}>
                <Text style={[themeStyles.text, styles.errorText]}>{errorMsg}</Text>
                <TouchableOpacity onPress={initLocation} style={styles.retryButton}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, themeStyles.bg]}>
            <Stack.Screen options={{ gestureEnabled: false }} />
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    showsUserLocation={true}
                    showsMyLocationButton={false} // Desabilitado para usar o nosso botão customizado
                    initialRegion={userLocation ? {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    } : undefined}
                >
                    {visibleMarkers.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                            pinColor={isDark ? COLORS.accent : COLORS.darkBlue}
                            onPress={() => setSelectedMarket(marker)}
                        />
                    ))}
                </MapView>

                {/* Filtros no topo */}
                <View style={styles.filtersWrapper}>
                    <TouchableOpacity
                        style={[styles.filterCard, themeStyles.card, themeStyles.border]}
                        activeOpacity={0.8}
                        onPress={() => setActiveFilterModal("type")}
                    >
                        <Ionicons name="storefront-outline" size={20} color={isDark ? "#F0E6D3" : COLORS.darkBlue} />
                        <Text style={[styles.filterText, themeStyles.text]} numberOfLines={1}>
                            {getFilterLabel("type")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterCard, themeStyles.card, themeStyles.border]}
                        activeOpacity={0.8}
                        onPress={() => setActiveFilterModal("distance")}
                    >
                        <Ionicons name="navigate-outline" size={20} color={isDark ? "#F0E6D3" : COLORS.darkBlue} />
                        <Text style={[styles.filterText, themeStyles.text]} numberOfLines={1}>
                            {getFilterLabel("distance")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterCard, themeStyles.card, themeStyles.border]}
                        activeOpacity={0.8}
                        onPress={() => setActiveFilterModal("hours")}
                    >
                        <Ionicons name="time-outline" size={20} color={isDark ? "#F0E6D3" : COLORS.darkBlue} />
                        <Text style={[styles.filterText, themeStyles.text]} numberOfLines={1}>
                            {getFilterLabel("hours")}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* NOVO: Botão de Centralizar na Localização */}
                <TouchableOpacity
                    style={[styles.recenterButton, themeStyles.card, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={centerOnUserLocation}
                >
                    <Ionicons name="locate" size={24} color={COLORS.accent} />
                </TouchableOpacity>

                {/* Loading dinâmico */}
                {isProcessing && !initialLoading && (
                    <View style={styles.inlineLoader}>
                        <ActivityIndicator size="small" color={COLORS.accent} />
                        <Text style={{ marginLeft: 8, fontSize: 12, color: "#333", fontWeight: '500' }}>Atualizando...</Text>
                    </View>
                )}
            </View>

            {/* Modal de Filtros */}
            <Modal
                visible={activeFilterModal !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActiveFilterModal(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setActiveFilterModal(null)}>
                    <View style={[styles.modalContent, themeStyles.card]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, themeStyles.text]}>
                                {activeFilterModal === "type" && "Selecione o Tipo"}
                                {activeFilterModal === "distance" && "Selecione a Distância Máxima"}
                                {activeFilterModal === "hours" && "Filtrar por Horário"}
                            </Text>
                            <TouchableOpacity onPress={() => setActiveFilterModal(null)}>
                                <Ionicons name="close-circle-outline" size={26} color={isDark ? "#fff" : "#333"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {activeFilterModal === "type" &&
                                SHOP_TYPES.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[styles.optionItem, selectedShopType === item.value && styles.selectedOption]}
                                        onPress={() => { setSelectedShopType(item.value); setActiveFilterModal(null); }}
                                    >
                                        <Text style={[styles.optionText, themeStyles.text]}>{item.label}</Text>
                                        {selectedShopType === item.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                                    </TouchableOpacity>
                                ))}

                            {activeFilterModal === "distance" &&
                                DISTANCE_OPTIONS.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[styles.optionItem, selectedDistance === item.value && styles.selectedOption]}
                                        onPress={() => { setSelectedDistance(item.value); setActiveFilterModal(null); }}
                                    >
                                        <Text style={[styles.optionText, themeStyles.text]}>{item.label}</Text>
                                        {selectedDistance === item.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                                    </TouchableOpacity>
                                ))}

                            {activeFilterModal === "hours" &&
                                HOURS_OPTIONS.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[styles.optionItem, selectedHoursFilter === item.value && styles.selectedOption]}
                                        onPress={() => { setSelectedHoursFilter(item.value); setActiveFilterModal(null); }}
                                    >
                                        <Text style={[styles.optionText, themeStyles.text]}>{item.label}</Text>
                                        {selectedHoursFilter === item.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Modal de Detalhes do Mercado */}
            <Modal
                visible={selectedMarket !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedMarket(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedMarket(null)}>
                    <Pressable style={[styles.marketDetailContent, themeStyles.card]}>

                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop' }}
                            style={styles.marketImage}
                        />

                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, themeStyles.text, { flex: 1 }]} numberOfLines={2}>
                                {selectedMarket?.title}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedMarket(null)} style={{ paddingLeft: 10 }}>
                                <Ionicons name="close-circle" size={28} color={isDark ? "#fff" : "#333"} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.marketInfoRow}>
                            <Ionicons name="navigate-outline" size={22} color={COLORS.accent} />
                            <Text style={[styles.marketInfoText, themeStyles.text]}>
                                A exatos {selectedMarket?.routeDistance.toFixed(2)} km de você
                            </Text>
                        </View>

                        <View style={styles.marketInfoRow}>
                            <Ionicons name="time-outline" size={22} color={COLORS.accent} />
                            <Text style={[styles.marketInfoText, themeStyles.text]}>
                                {formatOpeningHoursBR(selectedMarket?.openingHours)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.routesButton}
                            activeOpacity={0.8}
                            onPress={() => selectedMarket && openDirections(selectedMarket)}
                        >
                            <Ionicons name="map" size={20} color="#fff" />
                            <Text style={styles.routesButtonText}>Rotas</Text>
                        </TouchableOpacity>

                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, fontSize: 16, fontWeight: "500" },
    errorText: { textAlign: 'center', padding: 20, marginBottom: 10, fontSize: 16 },
    retryButton: { backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    mapContainer: { flex: 1 },
    map: { ...StyleSheet.absoluteFillObject },
    filtersWrapper: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 16,
        zIndex: 10,
    },
    filterCard: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        width: "31%",
        borderWidth: 1,
        elevation: 3,
    },
    filterText: { fontSize: 11, marginTop: 4, textAlign: "center", fontWeight: "600" },


    recenterButton: {
        position: "absolute",
        bottom: 30,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10,
    },

    inlineLoader: {
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        elevation: 4,
    },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "50%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: "bold" },
    optionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 6,
    },
    selectedOption: { backgroundColor: "rgba(46, 125, 50, 0.15)" },
    optionText: { fontSize: 15, fontWeight: '500' },

    marketDetailContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 0,
        overflow: 'hidden',
    },
    marketImage: {
        width: "120%",
        height: 160,
        alignSelf: 'center',
        marginBottom: 20,
    },
    marketInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    marketInfoText: {
        fontSize: 15,
        marginLeft: 10,
        flex: 1,
    },
    routesButton: {
        backgroundColor: COLORS.accent,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 10,
        elevation: 2,
    },
    routesButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    }
});