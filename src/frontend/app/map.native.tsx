import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

const THEME_COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
};

const MARKET_TYPES = [
    { label: "Todos os Mercados", value: "all" },
    { label: "Supermercados", value: "supermarket" },
    { label: "Mercados de Bairro / Conveniência", value: "convenience" },
    { label: "Mercearias & Hortifruti", value: "grocery" },
];

const MAX_DISTANCE_OPTIONS = [
    { label: "1 km", value: 1000 },
    { label: "3 km", value: 3000 },
    { label: "5 km", value: 5000 },
    { label: "10 km", value: 10000 },
];

const OPERATING_HOURS_OPTIONS = [
    { label: "Todos os Horários", value: "all" },
    { label: "Com Horário Informado", value: "with_hours" },
];

const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
];

interface Coordinate {
    latitude: number;
    longitude: number;
}

interface MarketMarker {
    id: string;
    title: string;
    coordinate: Coordinate;
    straightDistance: number;
    routeDistance: number;
    openingHours?: string;
}

const formatOpeningHours = (hours: string | null | undefined): string => {
    if (!hours) return "Horário de funcionamento não informado";
    if (hours === "24/7") return "Aberto 24 horas";

    const daysTranslation: Record<string, string> = {
        Mo: "Seg", Tu: "Ter", We: "Qua", Th: "Qui", Fr: "Sex",
        Sa: "Sáb", Su: "Dom", PH: "Feriados", off: "fechado", closed: "fechado"
    };

    let formatted = hours.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|off|closed)\b/g, match => daysTranslation[match] || match);
    return formatted.replace(/([A-Z][a-z]+|Sáb|Dom)-([A-Z][a-z]+|Sáb|Dom)/g, "$1 a $2");
};

const calculateDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRadians = 0.017453292519943295;
    const a = 0.5 - Math.cos((lat2 - lat1) * toRadians) / 2 +
        Math.cos(lat1 * toRadians) * Math.cos(lat2 * toRadians) *
        (1 - Math.cos((lon2 - lon1) * toRadians)) / 2;
    return 12742 * Math.asin(Math.sqrt(a));
};

const fetchDrivingDistances = async (userLocation: Coordinate, markers: MarketMarker[]): Promise<MarketMarker[]> => {
    if (markers.length === 0) return markers;

    const coordinatesString = markers.map(m => `${m.coordinate.longitude},${m.coordinate.latitude}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${userLocation.longitude},${userLocation.latitude};${coordinatesString}?sources=0&annotations=distance`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.distances?.[0]) {
            return markers.map((marker, index) => {
                const distanceInMeters = data.distances[0][index + 1];
                return {
                    ...marker,
                    routeDistance: distanceInMeters !== null ? (distanceInMeters / 1000) : marker.straightDistance
                };
            });
        }
    } catch (error) {
        console.error("Erro ao buscar distâncias de rota:", error);
    }
    return markers;
};

const fetchMarketsData = async (latitude: number, longitude: number, radius: number, shopType: string) => {
    const shopFilter = shopType === "all"
        ? '["shop"~"supermarket|convenience|grocery|deli|general"]'
        : `["shop"="${shopType}"]`;

    const query = `[out:json][timeout:25];nwr(around:${radius},${latitude},${longitude})${shopFilter};out center;`;
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

            if (response.ok) return await response.json();

            lastErrorStatus = response.status;
        } catch (error) {
            console.warn(`Falha no endpoint ${endpoint}. Tentando o próximo...`);
        }
    }

    if (lastErrorStatus === 406) throw new Error("Erro de cabeçalho na requisição ao servidor de mapas.");
    if (lastErrorStatus === 429) throw new Error("Servidores sobrecarregados. Aguarde um instante.");
    throw new Error("Não foi possível conectar à base de dados de mapas.");
};

export default function MapScreen() {
    const { themeStyles, isDark } = useTheme();
    const mapRef = useRef<MapView>(null);

    const [appState, setAppState] = useState({ isLoading: true, error: null as string | null, isProcessing: false });
    const [filters, setFilters] = useState({ shopType: "supermarket", maxDistance: 5000, hoursOption: "all" });
    const [mapData, setMapData] = useState<{ radius: number; type: string; elements: any[] }>({ radius: 0, type: "", elements: [] });

    const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
    const [visibleMarkers, setVisibleMarkers] = useState<MarketMarker[]>([]);
    const [activeFilterModal, setActiveFilterModal] = useState<"type" | "distance" | "hours" | null>(null);
    const [selectedMarket, setSelectedMarket] = useState<MarketMarker | null>(null);

    const initializeUserLocation = useCallback(async () => {
        try {
            setAppState(prev => ({ ...prev, error: null, isLoading: true }));
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') throw new Error('Permissão de localização negada.');

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        } catch (error: any) {
            setAppState(prev => ({ ...prev, error: error.message || "Não foi possível obter a localização.", isLoading: false }));
        }
    }, []);

    useEffect(() => {
        initializeUserLocation();
    }, [initializeUserLocation]);

    useEffect(() => {
        if (!userLocation) return;

        const requiredRadius = Math.floor(filters.maxDistance * 1.3);
        const isDataCached = mapData.type === filters.shopType && mapData.radius >= requiredRadius;

        if (isDataCached) {
            setAppState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        let isMounted = true;

        const fetchRawMapData = async () => {
            setAppState(prev => ({ ...prev, isProcessing: true }));
            try {
                const data = await fetchMarketsData(userLocation.latitude, userLocation.longitude, requiredRadius, filters.shopType);
                if (isMounted) {
                    setMapData({ radius: requiredRadius, type: filters.shopType, elements: data.elements || [] });
                    setAppState({ isLoading: false, error: null, isProcessing: false });
                }
            } catch (error: any) {
                if (isMounted) {
                    setAppState({ isLoading: false, error: error.message || "Falha ao buscar estabelecimentos.", isProcessing: false });
                }
            }
        };

        fetchRawMapData();
        return () => { isMounted = false; };
    }, [userLocation, filters.shopType, filters.maxDistance]);

    const nearbyMarkets = useMemo(() => {
        if (!userLocation || mapData.elements.length === 0) return [];

        const maxDistanceInKm = filters.maxDistance / 1000;

        const processedMarkers = mapData.elements.reduce((acc, element) => {
            const lat = element.type === 'node' ? element.lat : element.center?.lat;
            const lon = element.type === 'node' ? element.lon : element.center?.lon;
            if (!lat || !lon) return acc;

            const distance = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);
            const matchesHoursFilter = filters.hoursOption !== "with_hours" || element.tags?.opening_hours;

            if (distance <= maxDistanceInKm && matchesHoursFilter) {
                acc.push({
                    id: String(element.id),
                    title: element.tags?.name || "Mercado / Loja",
                    coordinate: { latitude: lat, longitude: lon },
                    straightDistance: distance,
                    routeDistance: distance,
                    openingHours: element.tags?.opening_hours || null,
                });
            }
            return acc;
        }, [] as MarketMarker[]);

        return processedMarkers.sort((a: MarketMarker, b: MarketMarker) => a.straightDistance - b.straightDistance);
    }, [mapData, userLocation, filters.maxDistance, filters.hoursOption]);

    useEffect(() => {
        if (nearbyMarkets.length === 0) {
            setVisibleMarkers([]);
            return;
        }

        let isMounted = true;
        setVisibleMarkers(nearbyMarkets);
        setAppState(prev => ({ ...prev, isProcessing: true }));

        const closestMarkets = nearbyMarkets.slice(0, 25);

        fetchDrivingDistances(userLocation!, closestMarkets).then(enrichedMarkets => {
            if (isMounted) {
                const enrichedIds = new Set(enrichedMarkets.map((m: MarketMarker) => m.id));
                const remainingMarkets = nearbyMarkets.filter((m: MarketMarker) => !enrichedIds.has(m.id));

                const finalMarkers = [...enrichedMarkets, ...remainingMarkets]
                    .filter(m => (m.routeDistance * 1000) <= filters.maxDistance)
                    .sort((a, b) => a.routeDistance - b.routeDistance);

                setVisibleMarkers(finalMarkers);
                setAppState(prev => ({ ...prev, isProcessing: false }));

                if (finalMarkers.length > 0 && mapRef.current) {
                    requestAnimationFrame(() => {
                        const coordinatesToFit = [...finalMarkers.map(m => m.coordinate), userLocation!];
                        mapRef.current?.fitToCoordinates(coordinatesToFit, {
                            edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
                            animated: true,
                        });
                    });
                }
            }
        });

        return () => { isMounted = false; };
    }, [nearbyMarkets]);

    const centerMapOnUser = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                ...userLocation,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
    };

    const navigateToMarket = (market: MarketMarker) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${market.coordinate.latitude},${market.coordinate.longitude}`;
        Linking.openURL(url).catch(() => alert("Não foi possível abrir o Google Maps."));
    };

    if (appState.isLoading) {
        return <LoadingScreen themeStyles={themeStyles} />;
    }

    if (appState.error) {
        return <ErrorScreen error={appState.error} onRetry={initializeUserLocation} themeStyles={themeStyles} />;
    }

    const getFilterLabel = (filterType: "type" | "distance" | "hours") => {
        if (filterType === "type") return MARKET_TYPES.find(s => s.value === filters.shopType)?.label.split("/")[0] || "Tipo";
        if (filterType === "distance") return `${filters.maxDistance / 1000} km`;
        if (filterType === "hours") return filters.hoursOption === "with_hours" ? "Com Horário" : "Horários";
        return "";
    };

    return (
        <View style={[styles.container, themeStyles.bg]}>
            <Stack.Screen options={{ gestureEnabled: false }} />
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
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
                            pinColor={isDark ? THEME_COLORS.accent : THEME_COLORS.darkBlue}
                            onPress={() => setSelectedMarket(marker)}
                        />
                    ))}
                </MapView>

                <View style={styles.filtersWrapper}>
                    <FilterButton
                        icon="storefront-outline"
                        label={getFilterLabel("type")}
                        onPress={() => setActiveFilterModal("type")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                    />
                    <FilterButton
                        icon="navigate-outline"
                        label={getFilterLabel("distance")}
                        onPress={() => setActiveFilterModal("distance")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                    />
                    <FilterButton
                        icon="time-outline"
                        label={getFilterLabel("hours")}
                        onPress={() => setActiveFilterModal("hours")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.recenterButton, themeStyles.card, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={centerMapOnUser}
                >
                    <Ionicons name="locate" size={24} color={THEME_COLORS.accent} />
                </TouchableOpacity>

                {appState.isProcessing && (
                    <View style={styles.inlineLoader}>
                        <ActivityIndicator size="small" color={THEME_COLORS.accent} />
                        <Text style={styles.inlineLoaderText}>Atualizando...</Text>
                    </View>
                )}
            </View>

            <FilterSelectionModal
                activeModal={activeFilterModal}
                filters={filters}
                onClose={() => setActiveFilterModal(null)}
                onUpdateFilters={(newFilters:any) => setFilters(prev => ({ ...prev, ...newFilters }))}
                themeStyles={themeStyles}
                isDark={isDark}
            />

            <MarketDetailModal
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
                onNavigate={navigateToMarket}
                themeStyles={themeStyles}
                isDark={isDark}
            />
        </View>
    );
}

// --- Subcomponentes de UI ---

const LoadingScreen = ({ themeStyles }: { themeStyles: any }) => (
    <View style={[styles.container, styles.centered, themeStyles.bg]}>
        <ActivityIndicator size="large" color={THEME_COLORS.accent} />
        <Text style={[styles.loadingText, themeStyles.text]}>Preparando o mapa e rotas...</Text>
    </View>
);

const ErrorScreen = ({ error, onRetry, themeStyles }: { error: string, onRetry: () => void, themeStyles: any }) => (
    <View style={[styles.container, styles.centered, themeStyles.bg]}>
        <Text style={[themeStyles.text, styles.errorText]}>{error}</Text>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
    </View>
);

const FilterButton = ({ icon, label, onPress, themeStyles, isDark }: any) => (
    <TouchableOpacity
        style={[styles.filterCard, themeStyles.card, themeStyles.border]}
        activeOpacity={0.8}
        onPress={onPress}
    >
        <Ionicons name={icon} size={20} color={isDark ? "#F0E6D3" : THEME_COLORS.darkBlue} />
        <Text style={[styles.filterText, themeStyles.text]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
);

const FilterSelectionModal = ({ activeModal, filters, onClose, onUpdateFilters, themeStyles, isDark }: any) => {
    if (!activeModal) return null;

    const getModalTitle = () => {
        if (activeModal === "type") return "Selecione o Tipo";
        if (activeModal === "distance") return "Selecione a Distância Máxima";
        return "Filtrar por Horário";
    };

    const getOptionsList = () => {
        if (activeModal === "type") return MARKET_TYPES;
        if (activeModal === "distance") return MAX_DISTANCE_OPTIONS;
        return OPERATING_HOURS_OPTIONS;
    };

    const handleSelectOption = (value: any) => {
        if (activeModal === "type") onUpdateFilters({ shopType: value });
        else if (activeModal === "distance") onUpdateFilters({ maxDistance: value });
        else if (activeModal === "hours") onUpdateFilters({ hoursOption: value });
        onClose();
    };

    const getCurrentValue = () => {
        if (activeModal === "type") return filters.shopType;
        if (activeModal === "distance") return filters.maxDistance;
        return filters.hoursOption;
    };

    return (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={[styles.modalContent, themeStyles.card]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, themeStyles.text]}>{getModalTitle()}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle-outline" size={26} color={isDark ? "#fff" : "#333"} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {getOptionsList().map((item) => {
                            const isSelected = getCurrentValue() === item.value;
                            return (
                                <TouchableOpacity
                                    key={item.value}
                                    style={[styles.optionItem, isSelected && styles.selectedOption]}
                                    onPress={() => handleSelectOption(item.value)}
                                >
                                    <Text style={[styles.optionText, themeStyles.text]}>{item.label}</Text>
                                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={THEME_COLORS.accent} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const MarketDetailModal = ({ market, onClose, onNavigate, themeStyles, isDark }: any) => {
    if (!market) return null;

    return (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.marketDetailContent, themeStyles.card]}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop' }}
                        style={styles.marketImage}
                    />
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, themeStyles.text, { flex: 1 }]} numberOfLines={2}>
                            {market.title}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ paddingLeft: 10 }}>
                            <Ionicons name="close-circle" size={28} color={isDark ? "#fff" : "#333"} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.marketInfoRow}>
                        <Ionicons name="navigate-outline" size={22} color={THEME_COLORS.accent} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            A exatos {market.routeDistance.toFixed(2)} km de você
                        </Text>
                    </View>
                    <View style={styles.marketInfoRow}>
                        <Ionicons name="time-outline" size={22} color={THEME_COLORS.accent} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            {formatOpeningHours(market.openingHours)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.routesButton}
                        activeOpacity={0.8}
                        onPress={() => onNavigate(market)}
                    >
                        <Ionicons name="map" size={20} color="#fff" />
                        <Text style={styles.routesButtonText}>Rotas</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, fontSize: 16, fontWeight: "500" },
    errorText: { textAlign: 'center', padding: 20, marginBottom: 10, fontSize: 16 },
    retryButton: { backgroundColor: THEME_COLORS.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontWeight: 'bold' },
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
    inlineLoaderText: { marginLeft: 8, fontSize: 12, color: "#333", fontWeight: '500' },
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
        backgroundColor: THEME_COLORS.accent,
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