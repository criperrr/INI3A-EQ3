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
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter"
];

// In-memory cache for Overpass queries (stores raw nodes/ways around coords)
const OVERPASS_CACHE = new Map<string, { elements: any[]; timestamp: number }>();

// In-memory cache for OSRM driving distances
const OSRM_DISTANCE_CACHE = new Map<string, number>();

// Module-level cache for instant 0ms map open and tab transitions
let lastSessionLocation: Coordinate | null = null;
let lastSessionElements: any[] = [];
let lastSessionBackendMarkets: MarketMarker[] = [];

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
    shopType?: string;
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

    const locKey = `${userLocation.latitude.toFixed(3)}_${userLocation.longitude.toFixed(3)}`;
    const uncachedMarkers = markers.filter(m => !OSRM_DISTANCE_CACHE.has(`${locKey}_${m.id}`));

    if (uncachedMarkers.length === 0) {
        return markers.map(m => ({
            ...m,
            routeDistance: OSRM_DISTANCE_CACHE.get(`${locKey}_${m.id}`) ?? m.straightDistance
        }));
    }

    const toQuery = uncachedMarkers.slice(0, 15);
    const coordinatesString = toQuery.map(m => `${m.coordinate.longitude},${m.coordinate.latitude}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${userLocation.longitude},${userLocation.latitude};${coordinatesString}?sources=0&annotations=distance`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.code === 'Ok' && data.distances?.[0]) {
            toQuery.forEach((marker, index) => {
                const distanceInMeters = data.distances[0][index + 1];
                if (distanceInMeters !== null && distanceInMeters !== undefined) {
                    OSRM_DISTANCE_CACHE.set(`${locKey}_${marker.id}`, distanceInMeters / 1000);
                }
            });
        }
    } catch {
        // Fallback to straight distance silently without error blocking
    }

    return markers.map(m => ({
        ...m,
        routeDistance: OSRM_DISTANCE_CACHE.get(`${locKey}_${m.id}`) ?? m.straightDistance
    }));
};

/**
 * Fetch a single Overpass endpoint with strict JSON and timeout validation.
 */
const fetchOverpassEndpoint = async (endpoint: string, query: string, signal: AbortSignal): Promise<any[]> => {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept": "application/json",
            "User-Agent": "PrescoApp/1.0 (contato@presco.app)"
        },
        body: `data=${encodeURIComponent(query)}`,
        signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.elements)) throw new Error("Invalid elements payload");
    return data.elements;
};

/**
 * Ultra-fast fallback fetchers using Photon & Nominatim OpenStreetMap engines.
 */
const fetchPhotonMarkets = async (latitude: number, longitude: number): Promise<any[]> => {
    const url = `https://photon.komoot.io/api/?q=supermercado&lat=${latitude}&lon=${longitude}&limit=50`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, {
            headers: { "User-Agent": "PrescoApp/1.0 (contato@presco.app)" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map((f: any) => ({
            id: f.properties?.osm_id || Math.floor(Math.random() * 1000000),
            lat: f.geometry?.coordinates?.[1],
            lon: f.geometry?.coordinates?.[0],
            tags: {
                name: f.properties?.name || f.properties?.street || "Supermercado",
                shop: f.properties?.osm_value || "supermarket",
                street: f.properties?.street,
                city: f.properties?.city,
                opening_hours: f.properties?.opening_hours
            }
        })).filter((el: any) => el.lat && el.lon);
    } catch {
        return [];
    }
};

const fetchNominatimMarkets = async (latitude: number, longitude: number): Promise<any[]> => {
    const delta = 0.08;
    const url = `https://nominatim.openstreetmap.org/search?q=supermercado&format=json&bounded=1&viewbox=${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}&limit=50`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, {
            headers: { "User-Agent": "PrescoApp/1.0 (contato@presco.app)" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((item: any) => ({
            id: item.osm_id || Math.floor(Math.random() * 1000000),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            tags: {
                name: item.name || item.display_name?.split(",")?.[0] || "Supermercado",
                shop: "supermarket"
            }
        })).filter((el: any) => el.lat && el.lon);
    } catch {
        return [];
    }
};

/**
 * Progressive multi-source fetcher: returns fast Nominatim results immediately (< 900ms)
 * and enriches with Overpass / Photon in parallel.
 */
const fetchAllMarketsData = async (
    latitude: number,
    longitude: number,
    onProgress?: (elements: any[]) => void
): Promise<any[]> => {
    const roundedLat = latitude.toFixed(2);
    const roundedLon = longitude.toFixed(2);
    const cacheKey = `${roundedLat}_${roundedLon}_all`;

    const cached = OVERPASS_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 600000) {
        if (onProgress) onProgress(cached.elements);
        return cached.elements;
    }

    const delta = 0.09; // ~10km bounding box
    const query = `[out:json][timeout:8];(
  node["shop"~"supermarket|convenience|grocery|deli|general"](around:8000,${latitude},${longitude});
  way["shop"~"supermarket|convenience|grocery|deli|general"](around:8000,${latitude},${longitude});
);out center tags 80;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const accumulated: any[] = [];
    const seenIds = new Set<string>();
    const seenGeo = new Set<string>();

    const mergeElements = (items: any[]) => {
        let added = 0;
        for (const el of items) {
            const idKey = el.id !== undefined && el.id !== null ? String(el.id) : null;
            const latCoord = (el.lat || el.center?.lat);
            const lonCoord = (el.lon || el.center?.lon);
            if (latCoord && lonCoord) {
                const geoKey = `${latCoord.toFixed(4)}_${lonCoord.toFixed(4)}`;
                const isIdSeen = idKey ? seenIds.has(idKey) : false;
                const isGeoSeen = seenGeo.has(geoKey);

                if (!isIdSeen && !isGeoSeen) {
                    if (idKey) seenIds.add(idKey);
                    seenGeo.add(geoKey);
                    accumulated.push(el);
                    added++;
                }
            }
        }
        if (added > 0 && onProgress) {
            onProgress([...accumulated]);
        }
    };

    // 1. Fast Nominatim Bounded Search (< 900ms)
    const nominatimPromise = fetchNominatimMarkets(latitude, longitude)
        .then(nom => {
            if (nom.length > 0) mergeElements(nom);
            return nom;
        })
        .catch(() => []);

    // 2. Overpass Parallel Mirror Race
    const overpassPromise = Promise.any(
        OVERPASS_ENDPOINTS.map(endpoint => fetchOverpassEndpoint(endpoint, query, controller.signal))
    )
        .then(over => {
            if (over.length > 0) mergeElements(over);
            return over;
        })
        .catch(() => []);

    // 3. Photon Fallback
    const photonPromise = fetchPhotonMarkets(latitude, longitude)
        .then(pho => {
            if (pho.length > 0) mergeElements(pho);
            return pho;
        })
        .catch(() => []);

    try {
        await Promise.allSettled([nominatimPromise, overpassPromise, photonPromise]);
        clearTimeout(timeoutId);

        if (accumulated.length > 0) {
            OVERPASS_CACHE.set(cacheKey, { elements: accumulated, timestamp: Date.now() });
            lastSessionElements = accumulated;
            return accumulated;
        }

        if (cached) return cached.elements;
        if (lastSessionElements.length > 0) return lastSessionElements;
        return [];
    } catch {
        clearTimeout(timeoutId);
        if (cached) return cached.elements;
        if (lastSessionElements.length > 0) return lastSessionElements;
        return [];
    }
};

export default function MapScreen() {
    const { themeStyles, isDark, accent, tokens } = useTheme();
    const { t } = useI18n();
    const mapRef = useRef<MapView>(null);

    const themeAccentColor = typeof accent === "string" ? accent : (tokens?.semantic?.colors?.text?.accent || (isDark ? "#F5B731" : "#1565C0"));

    const [appState, setAppState] = useState({
        isLoadingMarkets: true,
        isProcessingLocation: false,
        error: null as string | null
    });
    const [filters, setFilters] = useState({ shopType: "all", maxDistance: 5000, hoursOption: "all" });
    const [rawOsmElements, setRawOsmElements] = useState<any[]>(lastSessionElements);
    const [backendMarketsList, setBackendMarketsList] = useState<MarketMarker[]>(lastSessionBackendMarkets);

    // Initialize immediately with last known session location or fallback coordinate for instant 0ms mount
    const [userLocation, setUserLocation] = useState<Coordinate>(lastSessionLocation || DEFAULT_COORDINATE);
    const [visibleMarkers, setVisibleMarkers] = useState<MarketMarker[]>([]);
    const [activeFilterModal, setActiveFilterModal] = useState<"type" | "distance" | "hours" | null>(null);
    const [selectedMarket, setSelectedMarket] = useState<MarketMarker | null>(null);

    const initializeUserLocation = useCallback(async () => {
        try {
            setAppState(prev => ({ ...prev, error: null, isProcessingLocation: true }));
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setAppState(prev => ({ ...prev, isProcessingLocation: false }));
                return;
            }

            // Quick non-blocking last known position check (< 20ms)
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                const loc = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
                lastSessionLocation = loc;
                setUserLocation(loc);
                mapRef.current?.animateToRegion({
                    ...loc,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                }, 400);
            }

            // Background high-precision GPS lock with 3.5s timeout
            const gpsPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));

            const loc = await Promise.race([gpsPromise, timeoutPromise]);
            if (loc && 'coords' in loc) {
                const refined = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                lastSessionLocation = refined;
                setUserLocation(refined);
                mapRef.current?.animateToRegion({
                    ...refined,
                    latitudeDelta: 0.03,
                    longitudeDelta: 0.03,
                }, 600);
            }
        } catch {
            // Keep current location on failure
        } finally {
            setAppState(prev => ({ ...prev, isProcessingLocation: false }));
        }
    }, []);

    useEffect(() => {
        initializeUserLocation();
    }, [initializeUserLocation]);

    // Fetch backend markets with radius query and global fallback
    useEffect(() => {
        let isMounted = true;
        if (!userLocation) return;

        const loadBackendMarkets = async () => {
            try {
                let res = await fetchMarkets({ latitude: userLocation.latitude, longitude: userLocation.longitude, radius: 25000 });
                if (!res || res.length === 0) {
                    res = await fetchMarkets();
                }
                if (!isMounted || !res || !Array.isArray(res)) return;

                const mapped: MarketMarker[] = [];
                for (const m of res) {
                    if (m.location) {
                        let lat = userLocation.latitude;
                        let lon = userLocation.longitude;
                        try {
                            const parsed = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
                            if (parsed?.coordinates && Array.isArray(parsed.coordinates)) {
                                lon = parsed.coordinates[0];
                                lat = parsed.coordinates[1];
                            } else if (parsed?.lat && parsed?.lng) {
                                lat = parsed.lat;
                                lon = parsed.lng;
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
                            shopType: "supermarket",
                        });
                    }
                }
                if (isMounted && mapped.length > 0) {
                    lastSessionBackendMarkets = mapped;
                    setBackendMarketsList(mapped);
                }
            } catch {}
        };

        loadBackendMarkets();

        return () => { isMounted = false; };
    }, [userLocation.latitude, userLocation.longitude]);

    // Pre-fetch raw OSM elements progressively in background
    useEffect(() => {
        let isMounted = true;
        setAppState(prev => ({ ...prev, isLoadingMarkets: true }));

        fetchAllMarketsData(
            userLocation.latitude,
            userLocation.longitude,
            (partialElements) => {
                if (isMounted && partialElements?.length) {
                    setRawOsmElements(partialElements);
                    setAppState(prev => ({ ...prev, isLoadingMarkets: false }));
                }
            }
        )
            .then(elements => {
                if (isMounted && elements?.length) {
                    setRawOsmElements(elements);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setAppState(prev => ({ ...prev, isLoadingMarkets: false }));
            });

        return () => { isMounted = false; };
    }, [userLocation.latitude, userLocation.longitude]);

    // Instant in-memory filtering (0ms) across shopType, maxDistance, and hoursOption
    const nearbyMarkets: MarketMarker[] = useMemo(() => {
        const locKey = `${userLocation.latitude.toFixed(3)}_${userLocation.longitude.toFixed(3)}`;
        const overpassMarkers: MarketMarker[] = [];

        for (const el of rawOsmElements) {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) continue;

            const shop = el.tags?.shop || "supermarket";
            if (filters.shopType !== "all") {
                if (filters.shopType === "grocery") {
                    if (shop !== "grocery" && shop !== "deli" && shop !== "general" && shop !== "greengrocer") continue;
                } else if (filters.shopType === "convenience") {
                    if (shop !== "convenience" && shop !== "kiosk") continue;
                } else if (shop !== filters.shopType && shop !== "supermarket" && shop !== "hypermarket") {
                    continue;
                }
            }

            if (filters.hoursOption === "with_hours" && !el.tags?.opening_hours) {
                continue;
            }

            const straightDistance = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);
            if (straightDistance * 1000 > filters.maxDistance) {
                continue;
            }

            const name = el.tags?.name || el.tags?.brand || el.tags?.operator || el.name || (el.tags?.shop ? `Mercado (${el.tags.shop})` : "Supermercado");
            const cachedRoute = OSRM_DISTANCE_CACHE.get(`${locKey}_osm_${el.id}`);

            overpassMarkers.push({
                id: `osm_${el.id}`,
                title: name,
                coordinate: { latitude: lat, longitude: lon },
                straightDistance,
                routeDistance: cachedRoute ?? straightDistance,
                openingHours: el.tags?.opening_hours,
                shopType: shop,
            });
        }

        const filteredBackend = backendMarketsList.filter(m => {
            if (filters.shopType !== "all" && m.shopType && m.shopType !== filters.shopType) return false;
            if (m.straightDistance * 1000 > filters.maxDistance) return false;
            if (filters.hoursOption === "with_hours" && !m.openingHours) return false;
            return true;
        });

        const combined = [...filteredBackend, ...overpassMarkers];
        const unique: MarketMarker[] = [];
        const seenMarketIds = new Set<string>();

        for (const marker of combined) {
            if (!seenMarketIds.has(marker.id)) {
                seenMarketIds.add(marker.id);
                unique.push(marker);
            }
        }

        return unique.sort((a, b) => a.routeDistance - b.routeDistance);
    }, [userLocation, rawOsmElements, backendMarketsList, filters]);

    // Sync visible markers instantly, then enrich driving routes in background
    useEffect(() => {
        let isMounted = true;
        setVisibleMarkers(nearbyMarkets);

        if (nearbyMarkets.length === 0) return;

        const locKey = `${userLocation.latitude.toFixed(3)}_${userLocation.longitude.toFixed(3)}`;
        const needsRouteCalc = nearbyMarkets.slice(0, 15).some(
            m => !OSRM_DISTANCE_CACHE.has(`${locKey}_${m.id}`)
        );

        if (needsRouteCalc) {
            fetchDrivingDistances(userLocation, nearbyMarkets.slice(0, 15)).then(refined => {
                if (isMounted) {
                    const updatedMap = new Map(refined.map(m => [m.id, m.routeDistance]));
                    setVisibleMarkers(prev =>
                        prev.map(m => updatedMap.has(m.id) ? { ...m, routeDistance: updatedMap.get(m.id)! } : m)
                            .sort((a, b) => a.routeDistance - b.routeDistance)
                    );
                }
            });
        }

        return () => { isMounted = false; };
    }, [nearbyMarkets, userLocation]);

    const centerMapOnUser = () => {
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                ...userLocation,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 800);
        }
    };

    const navigateToMarket = (market: MarketMarker) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${market.coordinate.latitude},${market.coordinate.longitude}`;
        Linking.openURL(url).catch(() => alert(t("errors.networkError")));
    };

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
                    initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    }}
                >
                    {visibleMarkers.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                            pinColor={themeAccentColor}
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
                        accentColor={themeAccentColor}
                    />
                    <FilterButton
                        icon="navigate-outline"
                        label={getFilterLabel("distance")}
                        onPress={() => setActiveFilterModal("distance")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                        accentColor={themeAccentColor}
                    />
                    <FilterButton
                        icon="time-outline"
                        label={getFilterLabel("hours")}
                        onPress={() => setActiveFilterModal("hours")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                        accentColor={themeAccentColor}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.recenterButton, themeStyles.card, themeStyles.border]}
                    activeOpacity={0.8}
                    onPress={centerMapOnUser}
                >
                    <Ionicons name="locate" size={24} color={themeAccentColor} />
                </TouchableOpacity>

                {(appState.isLoadingMarkets || appState.isProcessingLocation) && (
                    <View style={styles.inlineLoader}>
                        <ActivityIndicator size="small" color={themeAccentColor} />
                        <Text style={styles.inlineLoaderText}>{t("common.loading")}</Text>
                    </View>
                )}

                {visibleMarkers.length === 0 && !appState.isLoadingMarkets && !appState.isProcessingLocation && (
                    <View style={[styles.noMarkersBanner, themeStyles.card, themeStyles.border]}>
                        <Ionicons name="information-circle-outline" size={18} color={themeAccentColor} />
                        <Text style={[styles.noMarkersText, themeStyles.text]}>
                            {rawOsmElements.length > 0 ? `Nenhum mercado a até ${filters.maxDistance / 1000} km` : "Nenhum mercado encontrado"}
                        </Text>
                        {filters.maxDistance < 10000 && (
                            <TouchableOpacity
                                style={[styles.expandRadiusBtn, { backgroundColor: themeAccentColor }]}
                                onPress={() => setFilters(prev => ({ ...prev, maxDistance: 10000, shopType: "all" }))}
                            >
                                <Text style={styles.expandRadiusText}>10 km</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <FilterSelectionModal
                activeModal={activeFilterModal}
                filters={filters}
                onClose={() => setActiveFilterModal(null)}
                onUpdateFilters={(newFilters: any) => setFilters(prev => ({ ...prev, ...newFilters }))}
                themeStyles={themeStyles}
                isDark={isDark}
                accentColor={themeAccentColor}
                t={t}
            />

            <MarketDetailModal
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
                onNavigate={navigateToMarket}
                themeStyles={themeStyles}
                isDark={isDark}
                accentColor={themeAccentColor}
                t={t}
            />
        </View>
    );
}

const FilterButton = ({ icon, label, onPress, themeStyles, isDark, accentColor }: any) => (
    <TouchableOpacity
        style={[styles.filterCard, themeStyles.card, themeStyles.border]}
        activeOpacity={0.8}
        onPress={onPress}
    >
        <Ionicons name={icon} size={20} color={isDark ? "#F0E6D3" : (accentColor || "#1565C0")} />
        <Text style={[styles.filterText, themeStyles.text]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
);

const FilterSelectionModal = ({ activeModal, filters, onClose, onUpdateFilters, themeStyles, isDark, accentColor, t }: any) => {
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
                                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const MarketDetailModal = ({ market, onClose, onNavigate, themeStyles, isDark, accentColor, t }: any) => {
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
                        <Ionicons name="navigate-outline" size={22} color={accentColor} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            {market.routeDistance.toFixed(2)} km {t("map.distanceRadius")}
                        </Text>
                    </View>
                    <View style={styles.marketInfoRow}>
                        <Ionicons name="time-outline" size={22} color={accentColor} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            {formatOpeningHours(market.openingHours, t)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.routesButton, { backgroundColor: accentColor }]}
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
    noMarkersBanner: {
        position: "absolute",
        bottom: 35,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        elevation: 4,
        borderWidth: 1,
        gap: 8,
    },
    noMarkersText: {
        fontSize: 13,
        fontWeight: "500",
    },
    expandRadiusBtn: {
        backgroundColor: THEME_COLORS.accent,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    expandRadiusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
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