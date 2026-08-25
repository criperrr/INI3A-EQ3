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
    Linking
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { fetchMarkets } from "../services/marketService";

const THEME_COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
};

const getMarketTypes = (t: (key: any) => string) => [
    { label: t("map.typeAll"), value: "all" },
    { label: t("map.typeSupermarket"), value: "supermarket" },
    { label: t("map.typeConvenience"), value: "convenience" },
    { label: t("map.typeGrocery"), value: "grocery" },
];

const MAX_DISTANCE_OPTIONS = [
    { label: "1 km", value: 1000 },
    { label: "3 km", value: 3000 },
    { label: "5 km", value: 5000 },
    { label: "10 km", value: 10000 },
];

const getOperatingHoursOptions = (t: (key: any) => string) => [
    { label: t("map.hoursAll"), value: "all" },
    { label: t("map.hoursWithInfo"), value: "with_hours" },
];

const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
];

// In-memory cache for Overpass queries to eliminate repeated HTTP calls
const OVERPASS_CACHE = new Map<string, { elements: any[]; timestamp: number }>();

// Default fallback coordinate (São Paulo Center)
const DEFAULT_COORDINATE: Coordinate = {
    latitude: -23.55052,
    longitude: -46.633308,
};

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
    isBackendMarket?: boolean;
}

const formatOpeningHours = (hours: string | null | undefined, t?: (key: any) => string): string => {
    if (!hours) return t ? t("map.hoursUnknown") : "Horário não informado";
    if (hours === "24/7") return t ? t("map.open24Hours") : "24h";

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
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
    } catch {
        // Fallback to straight distance silently without error blocking
    }
    return markers;
};

const fetchMarketsData = async (latitude: number, longitude: number, radius: number, shopType: string) => {
    const roundedLat = latitude.toFixed(2);
    const roundedLon = longitude.toFixed(2);
    const cacheKey = `${roundedLat}_${roundedLon}_${radius}_${shopType}`;

    const cached = OVERPASS_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
        return { elements: cached.elements };
    }

    const shopFilter = shopType === "all"
        ? '["shop"~"supermarket|convenience|grocery|deli|general"]'
        : `["shop"="${shopType}"]`;

    const query = `[out:json][timeout:5];nwr(around:${radius},${latitude},${longitude})${shopFilter};out center;`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "application/json",
                    "User-Agent": "MarketFinderApp/1.0 (contato@marketfinder.com)"
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.elements) {
                    OVERPASS_CACHE.set(cacheKey, { elements: data.elements, timestamp: Date.now() });
                }
                return data;
            }
        } catch {
        }
    }

    if (cached) return { elements: cached.elements };
    return { elements: [] };
};

export default function MapScreen() {
    const { themeStyles, isDark } = useTheme();
    const { t } = useI18n();
    const mapRef = useRef<MapView>(null);

    const [appState, setAppState] = useState({ isLoading: true, error: null as string | null, isProcessing: false });
    const [filters, setFilters] = useState({ shopType: "supermarket", maxDistance: 3000, hoursOption: "all" });
    const [mapData, setMapData] = useState<{ radius: number; type: string; elements: any[] }>({ radius: 0, type: "", elements: [] });
    const [backendMarketsList, setBackendMarketsList] = useState<MarketMarker[]>([]);

    const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
    const [visibleMarkers, setVisibleMarkers] = useState<MarketMarker[]>([]);
    const [activeFilterModal, setActiveFilterModal] = useState<"type" | "distance" | "hours" | null>(null);
    const [selectedMarket, setSelectedMarket] = useState<MarketMarker | null>(null);

    const initializeUserLocation = useCallback(async () => {
        try {
            setAppState(prev => ({ ...prev, error: null, isLoading: true }));
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setUserLocation(DEFAULT_COORDINATE);
                setAppState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                setUserLocation({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude });
                setAppState(prev => ({ ...prev, isLoading: false }));
            }

            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                .then(loc => {
                    if (loc) {
                        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                        setAppState(prev => ({ ...prev, isLoading: false }));
                    }
                })
                .catch(() => {
                    if (!lastKnown) {
                        setUserLocation(DEFAULT_COORDINATE);
                        setAppState(prev => ({ ...prev, isLoading: false }));
                    }
                });
        } catch {
            setUserLocation(DEFAULT_COORDINATE);
            setAppState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    useEffect(() => {
        initializeUserLocation();
    }, [initializeUserLocation]);

    useEffect(() => {
        let isMounted = true;
        if (!userLocation) return;

        fetchMarkets({ latitude: userLocation.latitude, longitude: userLocation.longitude, radius: filters.maxDistance * 1.5 }).then(res => {
            if (!isMounted || !res || !Array.isArray(res)) return;
            const mapped: MarketMarker[] = [];
            for (const m of res) {
                if (m.location) {
                    let lat = userLocation.latitude;
                    let lon = userLocation.longitude;
                    try {
                        const parsed = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
                        if (parsed?.coordinates) {
                            lon = parsed.coordinates[0];
                            lat = parsed.coordinates[1];
                        }
                    } catch {}
                    const straightDist = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);
                    mapped.push({
                        id: `backend_${m.id}`,
                        title: m.name,
                        coordinate: { latitude: lat, longitude: lon },
                        straightDistance: straightDist,
                        routeDistance: straightDist,
                        isBackendMarket: true,
                    });
                }
            }
            if (isMounted) setBackendMarketsList(mapped);
        }).catch(() => {});

        return () => { isMounted = false; };
    }, [userLocation, filters.maxDistance]);

    useEffect(() => {
        let isMounted = true;
        if (!userLocation) return;

        const timer = setTimeout(async () => {
            setAppState(prev => ({ ...prev, isProcessing: true }));
            try {
                const data = await fetchMarketsData(userLocation.latitude, userLocation.longitude, filters.maxDistance, filters.shopType);
                if (isMounted && data?.elements) {
                    setMapData({
                        radius: filters.maxDistance,
                        type: filters.shopType,
                        elements: data.elements
                    });
                }
            } catch {
            } finally {
                if (isMounted) setAppState(prev => ({ ...prev, isProcessing: false }));
            }
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [userLocation, filters.maxDistance, filters.shopType]);

    // Merge Overpass + Backend Markets
    const nearbyMarkets: MarketMarker[] = useMemo(() => {
        if (!userLocation) return [];

        const overpassMarkers: MarketMarker[] = [];
        for (const el of (mapData.elements || [])) {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) continue;

            const name = el.tags?.name || el.tags?.brand || el.tags?.operator || t("map.marketDetails");
            const straightDistance = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);

            overpassMarkers.push({
                id: `osm_${el.id}`,
                title: name,
                coordinate: { latitude: lat, longitude: lon },
                straightDistance,
                routeDistance: straightDistance,
                openingHours: el.tags?.opening_hours,
            });
        }

        const all = [...backendMarketsList, ...overpassMarkers];

        return all.filter(m => {
            if (m.straightDistance * 1000 > filters.maxDistance) return false;
            if (filters.hoursOption === "with_hours" && !m.openingHours) return false;
            return true;
        });
    }, [userLocation, mapData.elements, backendMarketsList, filters, t]);

    useEffect(() => {
        let isMounted = true;
        setVisibleMarkers(nearbyMarkets);

        if (!userLocation || nearbyMarkets.length === 0) return;

        fetchDrivingDistances(userLocation, nearbyMarkets.slice(0, 15)).then((refined) => {
            if (isMounted) {
                const updatedIds = new Set(refined.map(m => m.id));
                const remaining = nearbyMarkets.filter(m => !updatedIds.has(m.id));
                const finalMarkers = [...refined, ...remaining]
                    .sort((a, b) => a.routeDistance - b.routeDistance);

                setVisibleMarkers(finalMarkers);
            }
        });

        return () => { isMounted = false; };
    }, [nearbyMarkets, userLocation]);

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
        Linking.openURL(url).catch(() => alert(t("errors.networkError")));
    };

    if (appState.isLoading && !userLocation) {
        return <LoadingScreen themeStyles={themeStyles} t={t} />;
    }

    if (appState.error && !userLocation) {
        return <ErrorScreen error={appState.error} onRetry={initializeUserLocation} themeStyles={themeStyles} t={t} />;
    }

    const getFilterLabel = (filterType: "type" | "distance" | "hours") => {
        if (filterType === "type") return getMarketTypes(t).find(s => s.value === filters.shopType)?.label.split("/")[0] || t("map.marketType");
        if (filterType === "distance") return `${filters.maxDistance / 1000} km`;
        if (filterType === "hours") return filters.hoursOption === "with_hours" ? t("map.hoursWithInfo") : t("map.operatingHours");
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
                        <Text style={styles.inlineLoaderText}>{t("common.loading")}</Text>
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
                t={t}
            />

            <MarketDetailModal
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
                onNavigate={navigateToMarket}
                themeStyles={themeStyles}
                isDark={isDark}
                t={t}
            />
        </View>
    );
}

const LoadingScreen = ({ themeStyles, t }: { themeStyles: any, t: (key: any) => string }) => (
    <View style={[styles.container, styles.centered, themeStyles.bg]}>
        <ActivityIndicator size="large" color={THEME_COLORS.accent} />
        <Text style={[styles.loadingText, themeStyles.text]}>{t("common.loading")}</Text>
    </View>
);

const ErrorScreen = ({ error, onRetry, themeStyles, t }: { error: string, onRetry: () => void, themeStyles: any, t: (key: any) => string }) => (
    <View style={[styles.container, styles.centered, themeStyles.bg]}>
        <Text style={[themeStyles.text, styles.errorText]}>{error}</Text>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
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

const FilterSelectionModal = ({ activeModal, filters, onClose, onUpdateFilters, themeStyles, isDark, t }: any) => {
    if (!activeModal) return null;

    const getModalTitle = () => {
        if (activeModal === "type") return t("map.marketType");
        if (activeModal === "distance") return t("map.distanceRadius");
        return t("map.operatingHours");
    };

    const getOptionsList = () => {
        if (activeModal === "type") return getMarketTypes(t);
        if (activeModal === "distance") return MAX_DISTANCE_OPTIONS;
        return getOperatingHoursOptions(t);
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
                        {getOptionsList().map((item: any) => {
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

const MarketDetailModal = ({ market, onClose, onNavigate, themeStyles, isDark, t }: any) => {
    if (!market) return null;

    return (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.marketDetailContent, themeStyles.card]}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop' }}
                        style={styles.marketImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
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
                            {market.routeDistance.toFixed(2)} km {t("map.distanceRadius")}
                        </Text>
                    </View>
                    <View style={styles.marketInfoRow}>
                        <Ionicons name="time-outline" size={22} color={THEME_COLORS.accent} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            {formatOpeningHours(market.openingHours, t)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.routesButton}
                        activeOpacity={0.8}
                        onPress={() => onNavigate(market)}
                    >
                        <Ionicons name="map" size={20} color="#fff" />
                        <Text style={styles.routesButtonText}>{t("map.viewOnMap")}</Text>
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