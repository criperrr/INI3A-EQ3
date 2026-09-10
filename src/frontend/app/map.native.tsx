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
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { fetchMarkets } from "../services/marketService";
import { getOptimizedImageUrl } from "../utils/imageUtils";

const THEME_COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
};

export const CATEGORY_CONFIG = {
    supermarket: {
        color: "#2563EB",
        icon: "cart" as const,
        labelKey: "map.typeSupermarket",
        defaultLabel: "Supermercados",
    },
    grocery: {
        color: "#F59E0B",
        icon: "storefront" as const,
        labelKey: "map.typeConvenience",
        defaultLabel: "Comércio Local",
    },
    hortifruti: {
        color: "#10B981",
        icon: "leaf" as const,
        labelKey: "map.typeGrocery",
        defaultLabel: "Hortifrutis",
    },
};

const getMarketTypes = (t: (key: any) => string) => [
    { label: t("map.typeAll"), value: "all" },
    { label: t("map.typeSupermarket"), value: "supermarket" },
    { label: t("map.typeConvenience"), value: "grocery" },
    { label: t("map.typeGrocery"), value: "hortifruti" },
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

// In-memory cache podado para queries HERE Places
const MAX_HERE_CACHE_SIZE = 8;
const HERE_PLACES_CACHE = new Map<string, { elements: any[]; timestamp: number }>();

function setHerePlacesCache(key: string, value: { elements: any[]; timestamp: number }) {
    if (HERE_PLACES_CACHE.size >= MAX_HERE_CACHE_SIZE) {
        const firstKey = HERE_PLACES_CACHE.keys().next().value;
        if (firstKey) HERE_PLACES_CACHE.delete(firstKey);
    }
    HERE_PLACES_CACHE.set(key, value);
}

// In-memory cache para distâncias calculadas HERE Routing v8
const MAX_HERE_DISTANCE_CACHE_SIZE = 60;
const HERE_DISTANCE_CACHE = new Map<string, number>();

function setHereDistanceCache(key: string, distance: number) {
    if (HERE_DISTANCE_CACHE.size >= MAX_HERE_DISTANCE_CACHE_SIZE) {
        const firstKey = HERE_DISTANCE_CACHE.keys().next().value;
        if (firstKey) HERE_DISTANCE_CACHE.delete(firstKey);
    }
    HERE_DISTANCE_CACHE.set(key, distance);
}

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
    const uncachedMarkers = markers.filter(m => !HERE_DISTANCE_CACHE.has(`${locKey}_${m.id}`));

    if (uncachedMarkers.length === 0) {
        return markers.map(m => ({
            ...m,
            routeDistance: HERE_DISTANCE_CACHE.get(`${locKey}_${m.id}`) ?? m.straightDistance
        }));
    }

    const apiKey = process.env.EXPO_PUBLIC_HERE_API_KEY || "";
    if (!apiKey) {
        return markers.map(m => ({
            ...m,
            routeDistance: m.straightDistance
        }));
    }

    const toQuery = uncachedMarkers.slice(0, 10);
    await Promise.allSettled(
        toQuery.map(async (marker) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);
                const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${userLocation.latitude},${userLocation.longitude}&destination=${marker.coordinate.latitude},${marker.coordinate.longitude}&return=summary&apiKey=${apiKey}`;
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const data = await res.json();
                    const lengthMeters = data.routes?.[0]?.sections?.[0]?.summary?.length;
                    if (typeof lengthMeters === "number") {
                        setHereDistanceCache(`${locKey}_${marker.id}`, lengthMeters / 1000);
                    }
                }
            } catch {
                // Fallback to straight distance silently without error blocking
            }
        })
    );

    return markers.map(m => ({
        ...m,
        routeDistance: HERE_DISTANCE_CACHE.get(`${locKey}_${m.id}`) ?? m.straightDistance
    }));
};

/**
 * Normaliza e limpa nomes de estabelecimentos da HERE API
 */
const normalizeHereMarketName = (name: string): string => {
    let clean = (name || "").trim();
    if (!clean) return "";

    // Rejeitar nomes de ruas/rodovias
    if (/^(rua|r\.|av\.|avenida|alameda|estrada|rodovia|travessa|tv\.|praça|praca|viela|rod\.)\b/i.test(clean)) {
        return "";
    }
    if (/^\d+/.test(clean)) return "";

    // Rejeitar estabelecimentos não comerciais / irrelevantes
    if (
        /\b(estacionamento|parking|sindicato|associação|associacao|conselho|igreja|templo|paróquia|paroquia|escola|colégio|colegio|faculdade|universidade|posto|auto posto|gasolina|farmácia|farmacia|drogaria|academia|lava rápido|lava rapido|oficina|mecânica|mecanica|borracharia|hospital|clínica|clinica|odontologia|consultório|consultorio|pet\s*shop|agropecu[aá]ria|veterin[aá]ria|m[oó]veis|planejados|churros|tabacaria|barbearia|imobili[aá]ria|design)\b/i.test(
            clean
        ) ||
        /\b(padaria\s+pet|wood\s+design|casa\s+company)\b/i.test(clean)
    ) {
        return "";
    }

    clean = clean.replace(/^(supermercado|mercado|hipermercado)\s+/i, match => {
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });

    if (/^(supermercado|mercado|loja|mercearia)$/i.test(clean)) return "";
    return clean;
};

const classifyEstablishment = (name: string, categories: any[] = []): "supermarket" | "grocery" | "hortifruti" => {
    const nameLower = (name || "").toLowerCase();

    // 1. Hortifrutis, sacolões, quitandas, fruteiras, Oba
    const hasHortifrutiCat = categories.some((c: any) =>
        c.id === "600-6900-0247" || /hortifruti|sacol[aã]o|quitanda|greengrocer|produce/i.test(c.name || "")
    );
    if (
        hasHortifrutiCat ||
        /\b(oba|oba\s+hortifruti)\b/i.test(nameLower) ||
        /hortifruti|horti-fruti|horti fruti|sacol[aã]o|quitanda|frutaria|frutas|verduras|legumes|pomar|feira|horta/i.test(nameLower)
    ) {
        return "hortifruti";
    }

    // 2. Padarias, panificadoras, confeitarias, confeitarias, bakeries
    const hasBakeryCat = categories.some((c: any) =>
        c.id === "600-6300-0244" || /bakery|padaria|panificadora|confeitaria/i.test(c.name || "")
    );
    const isBakery = hasBakeryCat || /padaria|panificadora|bakery|confeitaria|p[aã]o\b|fornada|trigal|doceira|bolo/i.test(nameLower);

    // 3. Mercados e mercearias locais, conveniências, empórios, açougues
    const hasLocalCat = categories.some((c: any) =>
        c.id === "600-6000-0061" || c.id === "600-6300-0067" ||
        /mercearia|conveni[eê]ncia|convenience|grocery|armaz[eé]m|emp[oó]rio|a[cç]ougue/i.test(c.name || "")
    );
    const isLocalByKeywords = /mercearia|mercadinho|minimercado|mini mercado|mini box|armaz[eé]m|emp[oó]rio|conveni[eê]ncia|am\/?pm|select|br mania|posto|oxxo|venda|bodega|a[cç]ougue|carnes|peixaria|rotisseria/i.test(nameLower);

    const isMajorSupermarket = /super|hiper|atacad[aã]o|atacarejo|atacadista|carrefour|p[aã]o de a[cç][uú]car|extra|assa[ií]|sonda|zaffari|mambo|st\.? marche|tenda|rold[aã]o|spani|makro|compre bem|covabra|enxuto|nagumo|shibata|savegnago/i.test(nameLower);
    const isNeighborhoodMercado = /^mercado\s+/i.test(nameLower) && !isMajorSupermarket;

    if (isBakery || hasLocalCat || isLocalByKeywords || isNeighborhoodMercado) {
        return "grocery";
    }

    // 4. Supermercados
    return "supermarket";
};

const parseHereResponse = (items: any[]): any[] => {
    return items.map(item => {
        const rawName = normalizeHereMarketName(item.title);
        if (!rawName) return null;
        const pos = item.position;
        if (!pos || typeof pos.lat !== "number" || typeof pos.lng !== "number") return null;

        // Rejeitar unidade extinta do Oba no Jardim América (mudou-se para Av. Getúlio Vargas)
        if (
            /\boba\b/i.test(rawName) &&
            (
                /jos[eé]\s+maria\s+rodrigues/i.test(item.address?.label || "") ||
                (Math.abs(pos.lat - (-22.34598)) < 0.005 && Math.abs(pos.lng - (-49.05957)) < 0.005)
            )
        ) {
            return null;
        }

        const shopType = classifyEstablishment(rawName, item.categories || []);

        let openingHours: string | undefined;
        if (item.openingHours && Array.isArray(item.openingHours) && item.openingHours.length > 0) {
            const oh = item.openingHours[0];
            if (Array.isArray(oh.text) && oh.text.length > 0) {
                openingHours = oh.text.join(" | ");
            } else if (oh.isOpen !== undefined) {
                openingHours = oh.isOpen ? "Aberto agora" : "Fechado agora";
            }
        }

        return {
            id: item.id || `here_${pos.lat}_${pos.lng}`,
            lat: pos.lat,
            lon: pos.lng,
            name: rawName,
            tags: {
                name: rawName,
                shop: shopType,
                opening_hours: openingHours,
                address: item.address?.label,
            }
        };
    }).filter(Boolean);
};

const fetchHereDiscover = async (
    latitude: number,
    longitude: number,
    apiKey: string,
    limit: number = 100
): Promise<any[]> => {
    const url = `https://discover.search.hereapi.com/v1/discover?at=${latitude},${longitude}&q=supermercado&limit=${limit}&apiKey=${apiKey}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return parseHereResponse(data?.items || []);
    } catch {
        return [];
    }
};

const fetchHereBrowse = async (
    latitude: number,
    longitude: number,
    apiKey: string,
    limit: number = 100
): Promise<any[]> => {
    const categories = "600-6300-0066,600-6300-0067,600-6000-0061,600-6900-0247,600-6300-0244,600-6800-0245,600-6700-0246";
    const url = `https://browse.search.hereapi.com/v1/browse?at=${latitude},${longitude}&categories=${categories}&limit=${limit}&apiKey=${apiKey}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return parseHereResponse(data?.items || []);
    } catch {
        return [];
    }
};

/**
 * Busca radial periférica nos 4 pontos cardeais (~3.5km a 4km de deslocamento)
 * para garantir descoberta profunda de mercados entre 3km e 10km, mesmo em cidades densas.
 */
const fetchHereRadialDiscover = async (
    latitude: number,
    longitude: number,
    apiKey: string
): Promise<any[]> => {
    const deltaLat = 0.032;
    const deltaLon = 0.035;
    const points = [
        { lat: latitude + deltaLat, lon: longitude },
        { lat: latitude - deltaLat, lon: longitude },
        { lat: latitude, lon: longitude + deltaLon },
        { lat: latitude, lon: longitude - deltaLon },
    ];
    const promises = points.map(p =>
        fetchHereDiscover(p.lat, p.lon, apiKey, 30)
    );
    const results = await Promise.allSettled(promises);
    return results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
        .flatMap(r => r.value);
};

/**
 * Ultra-fast market fetcher using HERE Location Services (Discover & Browse v7).
 */
const fetchHereMarketsData = async (
    latitude: number,
    longitude: number,
    onProgress?: (elements: any[]) => void
): Promise<any[]> => {
    const roundedLat = latitude.toFixed(2);
    const roundedLon = longitude.toFixed(2);
    const cacheKey = `${roundedLat}_${roundedLon}_here`;

    const cached = HERE_PLACES_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 600000) {
        if (onProgress) onProgress(cached.elements);
        return cached.elements;
    }

    const apiKey = process.env.EXPO_PUBLIC_HERE_API_KEY || "";
    if (!apiKey) {
        if (cached) return cached.elements;
        return [];
    }

    const accumulated: any[] = [];
    const seenIds = new Set<string>();
    const seenGeo = new Set<string>();

    const mergeElements = (items: any[]) => {
        let added = 0;
        for (const el of items) {
            const idKey = String(el.id || `${el.lat}_${el.lon}`);
            const latCoord = el.lat;
            const lonCoord = el.lon;

            if (
                typeof latCoord === "number" &&
                typeof lonCoord === "number" &&
                !isNaN(latCoord) &&
                !isNaN(lonCoord) &&
                latCoord >= -90 &&
                latCoord <= 90 &&
                lonCoord >= -180 &&
                lonCoord <= 180
            ) {
                const geoKey = `${latCoord.toFixed(4)}_${lonCoord.toFixed(4)}`;
                if (!seenIds.has(idKey) && !seenGeo.has(geoKey)) {
                    seenIds.add(idKey);
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

    const discoverPromise = fetchHereDiscover(latitude, longitude, apiKey, 100)
        .then(items => {
            if (items.length > 0) mergeElements(items);
            return items;
        })
        .catch(() => []);

    const browsePromise = fetchHereBrowse(latitude, longitude, apiKey, 100)
        .then(items => {
            if (items.length > 0) mergeElements(items);
            return items;
        })
        .catch(() => []);

    const radialPromise = fetchHereRadialDiscover(latitude, longitude, apiKey)
        .then(items => {
            if (items.length > 0) mergeElements(items);
            return items;
        })
        .catch(() => []);

    try {
        await Promise.allSettled([discoverPromise, browsePromise, radialPromise]);
        if (accumulated.length > 0) {
            setHerePlacesCache(cacheKey, { elements: accumulated, timestamp: Date.now() });
            lastSessionElements = accumulated;
            return accumulated;
        }

        if (cached) return cached.elements;
        if (lastSessionElements.length > 0) return lastSessionElements;
        return [];
    } catch {
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
    const [rawHereElements, setRawHereElements] = useState<any[]>(lastSessionElements);
    const [backendMarketsList, setBackendMarketsList] = useState<MarketMarker[]>(lastSessionBackendMarkets);

    // Initialize immediately with last known session location or fallback coordinate for instant 0ms mount
    const [userLocation, setUserLocation] = useState<Coordinate>(lastSessionLocation || DEFAULT_COORDINATE);
    const [isLocationResolved, setIsLocationResolved] = useState<boolean>(!!lastSessionLocation);
    const [visibleMarkers, setVisibleMarkers] = useState<MarketMarker[]>([]);
    const [tracksViewChanges, setTracksViewChanges] = useState<boolean>(true);
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
                setIsLocationResolved(true);
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
                setIsLocationResolved(true);
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
        if (!isLocationResolved || !userLocation) return;

        const loadBackendMarkets = async () => {
            try {
                const res = await fetchMarkets({ latitude: userLocation.latitude, longitude: userLocation.longitude, radius: 25000 });
                if (!isMounted || !res || !Array.isArray(res)) return;

                const mapped: MarketMarker[] = [];
                for (const m of res) {
                    if (m && m.location) {
                        let lat: number | null = null;
                        let lon: number | null = null;
                        try {
                            const parsed = typeof m.location === "string" ? JSON.parse(m.location) : m.location;
                            if (parsed?.coordinates && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
                                lon = typeof parsed.coordinates[0] === 'number' ? parsed.coordinates[0] : parseFloat(String(parsed.coordinates[0]));
                                lat = typeof parsed.coordinates[1] === 'number' ? parsed.coordinates[1] : parseFloat(String(parsed.coordinates[1]));
                            } else if (parsed?.lat !== undefined && parsed?.lng !== undefined) {
                                lat = typeof parsed.lat === 'number' ? parsed.lat : parseFloat(String(parsed.lat));
                                lon = typeof parsed.lng === 'number' ? parsed.lng : parseFloat(String(parsed.lng));
                            }
                        } catch {}

                        if (
                            lat !== null &&
                            lon !== null &&
                            !isNaN(lat) &&
                            !isNaN(lon) &&
                            lat >= -90 &&
                            lat <= 90 &&
                            lon >= -180 &&
                            lon <= 180
                        ) {
                            const straightDist = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);
                            const safeDist = isNaN(straightDist) ? 0 : straightDist;
                            // Enforce strict proximity bounds: only include backend markets within 25km of the user
                            if (safeDist <= 25) {
                                const backendShopType = classifyEstablishment(m.name || "");

                                mapped.push({
                                    id: `backend_${m.id}`,
                                    title: m.name || "Supermercado",
                                    coordinate: { latitude: lat, longitude: lon },
                                    straightDistance: safeDist,
                                    routeDistance: safeDist,
                                    isBackendMarket: true,
                                    shopType: backendShopType,
                                });
                            }
                        }
                    }
                }
                if (isMounted) {
                    lastSessionBackendMarkets = mapped;
                    setBackendMarketsList(mapped);
                }
            } catch {}
        };

        loadBackendMarkets();

        return () => { isMounted = false; };
    }, [userLocation.latitude, userLocation.longitude]);

    // Pre-fetch HERE elements progressively in background
    useEffect(() => {
        let isMounted = true;
        if (!isLocationResolved || !userLocation) return;
        setAppState(prev => ({ ...prev, isLoadingMarkets: true }));

        fetchHereMarketsData(
            userLocation.latitude,
            userLocation.longitude,
            (partialElements) => {
                if (isMounted && partialElements?.length) {
                    setRawHereElements(partialElements);
                    setAppState(prev => ({ ...prev, isLoadingMarkets: false }));
                }
            }
        )
            .then(elements => {
                if (isMounted && elements?.length) {
                    setRawHereElements(elements);
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
        const locKey = `${(userLocation.latitude || 0).toFixed(3)}_${(userLocation.longitude || 0).toFixed(3)}`;
        const hereMarkers: MarketMarker[] = [];

        for (const el of rawHereElements) {
            const rawLat = el.lat ?? el.center?.lat;
            const rawLon = el.lon ?? el.center?.lon;
            const lat = typeof rawLat === "number" ? rawLat : parseFloat(String(rawLat));
            const lon = typeof rawLon === "number" ? rawLon : parseFloat(String(rawLon));

            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

            const shop = el.tags?.shop || "supermarket";
            if (filters.shopType !== "all") {
                if (filters.shopType === "grocery") {
                    if (shop !== "grocery" && shop !== "convenience") continue;
                } else if (filters.shopType === "hortifruti") {
                    if (shop !== "hortifruti") continue;
                } else if (filters.shopType === "supermarket") {
                    if (shop !== "supermarket") continue;
                } else if (shop !== filters.shopType) {
                    continue;
                }
            }

            if (filters.hoursOption === "with_hours" && !el.tags?.opening_hours) {
                continue;
            }

            const straightDistance = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, lat, lon);
            const safeDist = isNaN(straightDistance) ? 0 : straightDistance;
            if (safeDist * 1000 > filters.maxDistance) {
                continue;
            }

            const name = el.tags?.name || el.name || "Supermercado";
            const markerId = String(el.id).startsWith("here_") ? String(el.id) : `here_${el.id}`;
            const cachedRoute = HERE_DISTANCE_CACHE.get(`${locKey}_${markerId}`);

            hereMarkers.push({
                id: markerId,
                title: String(name),
                coordinate: { latitude: lat, longitude: lon },
                straightDistance: safeDist,
                routeDistance: cachedRoute ?? safeDist,
                openingHours: el.tags?.opening_hours,
                shopType: shop,
            });
        }

        const filteredBackend = backendMarketsList.filter(m => {
            if (filters.shopType !== "all") {
                if (filters.shopType === "grocery" && m.shopType !== "grocery" && m.shopType !== "convenience") return false;
                if (filters.shopType === "hortifruti" && m.shopType !== "hortifruti") return false;
                if (filters.shopType === "supermarket" && m.shopType !== "supermarket") return false;
                if (m.shopType && m.shopType !== filters.shopType) return false;
            }
            const dist = typeof m.straightDistance === "number" ? m.straightDistance : 0;
            if (dist * 1000 > filters.maxDistance) return false;
            if (filters.hoursOption === "with_hours" && !m.openingHours) return false;
            return true;
        });

        const combined = [...filteredBackend, ...hereMarkers];
        const unique: MarketMarker[] = [];
        const seenMarketIds = new Set<string>();

        for (const marker of combined) {
            if (!marker.id || seenMarketIds.has(marker.id)) continue;

            const isDuplicate = unique.some(existing => {
                const dist = calculateDistanceInKm(
                    existing.coordinate.latitude,
                    existing.coordinate.longitude,
                    marker.coordinate.latitude,
                    marker.coordinate.longitude
                );
                // Qualquer ponto a menos de 80m é sempre considerado duplicata física
                if (dist < 0.08) return true;

                const name1 = existing.title.toLowerCase().trim().replace(/^(supermercado|mercado|hipermercado)\s+/i, "");
                const name2 = marker.title.toLowerCase().trim().replace(/^(supermercado|mercado|hipermercado)\s+/i, "");

                // Mesmo nome em até 600m (ex: entradas diferentes, coordenadas de estacionamento)
                if (dist < 0.6 && name1 === name2) return true;

                // Mesma marca (ex: Tauste Rio Branco vs Tauste Supermercados, Pão de Açúcar) em até 500m
                const brand1 = name1.split(/[\s\-]/)[0];
                const brand2 = name2.split(/[\s\-]/)[0];
                if (brand1 && brand1.length >= 4 && brand1 === brand2 && dist < 0.5) return true;

                // Oba Hortifruti: mesma rede em até 2.5km (evita duplicatas de lojas únicas migradas)
                if (/\boba\b/i.test(name1) && /\boba\b/i.test(name2) && dist < 2.5) return true;

                return false;
            });

            if (!isDuplicate) {
                seenMarketIds.add(marker.id);
                unique.push(marker);
            }
        }

        const sorted = unique.sort((a, b) => ((a.routeDistance ?? 0) - (b.routeDistance ?? 0)));
        const maxLimit = filters.maxDistance <= 3000 ? 50 : (filters.maxDistance <= 5000 ? 75 : 90);

        if (sorted.length <= maxLimit) {
            return sorted;
        }

        // Distribui pins equilibradamente por anéis de distância para que mercados além de 3km nunca fiquem de fora
        const ringLimit = Math.floor(maxLimit / 3);
        const close = sorted.filter(m => (m.straightDistance ?? 0) < 2.5);
        const mid = sorted.filter(m => (m.straightDistance ?? 0) >= 2.5 && (m.straightDistance ?? 0) < 5.0);
        const far = sorted.filter(m => (m.straightDistance ?? 0) >= 5.0);

        const distributed: MarketMarker[] = [
            ...close.slice(0, ringLimit),
            ...mid.slice(0, ringLimit),
            ...far.slice(0, ringLimit),
        ];

        const distributedIds = new Set(distributed.map(m => m.id));
        for (const m of sorted) {
            if (distributed.length >= maxLimit) break;
            if (!distributedIds.has(m.id)) {
                distributed.push(m);
                distributedIds.add(m.id);
            }
        }

        return distributed.sort((a, b) => ((a.routeDistance ?? 0) - (b.routeDistance ?? 0)));
    }, [userLocation, rawHereElements, backendMarketsList, filters]);

    // Sync visible markers instantly, then enrich driving routes in background
    useEffect(() => {
        let isMounted = true;
        setVisibleMarkers(nearbyMarkets);

        if (nearbyMarkets.length === 0) return;

        const locKey = `${(userLocation.latitude || 0).toFixed(3)}_${(userLocation.longitude || 0).toFixed(3)}`;
        const needsRouteCalc = nearbyMarkets.slice(0, 15).some(
            m => !HERE_DISTANCE_CACHE.has(`${locKey}_${m.id}`)
        );

        if (needsRouteCalc) {
            fetchDrivingDistances(userLocation, nearbyMarkets.slice(0, 15)).then(refined => {
                if (isMounted) {
                    const updatedMap = new Map(refined.map(m => [m.id, m.routeDistance]));
                    setVisibleMarkers(prev =>
                        prev.map(m => updatedMap.has(m.id) ? { ...m, routeDistance: updatedMap.get(m.id)! } : m)
                            .sort((a, b) => ((a.routeDistance ?? 0) - (b.routeDistance ?? 0)))
                    );
                }
            });
        }

        return () => { isMounted = false; };
    }, [nearbyMarkets, userLocation]);

    // Keep tracksViewChanges active briefly when markers or selection change, then freeze for 60fps pan/zoom
    useEffect(() => {
        setTracksViewChanges(true);
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [visibleMarkers, selectedMarket?.id]);

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
        if (filterType === "type") {
            if (filters.shopType === "grocery") return t("map.typeConvenience");
            if (filters.shopType === "hortifruti") return t("map.typeGrocery");
            if (filters.shopType === "supermarket") return t("map.typeSupermarket");
            return t("map.marketType");
        }
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
                    showsBuildings={false}
                    showsIndoors={false}
                    showsPointsOfInterests={false}
                    showsCompass={false}
                    showsScale={false}
                    toolbarEnabled={false}
                    loadingEnabled={false}
                    maxZoomLevel={19}
                    minZoomLevel={11}
                    initialRegion={{
                        latitude: userLocation.latitude || DEFAULT_COORDINATE.latitude,
                        longitude: userLocation.longitude || DEFAULT_COORDINATE.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    }}
                >
                    {visibleMarkers
                        .filter(marker =>
                            marker &&
                            marker.coordinate &&
                            typeof marker.coordinate.latitude === 'number' &&
                            typeof marker.coordinate.longitude === 'number' &&
                            !isNaN(marker.coordinate.latitude) &&
                            !isNaN(marker.coordinate.longitude) &&
                            marker.coordinate.latitude >= -90 &&
                            marker.coordinate.latitude <= 90 &&
                            marker.coordinate.longitude >= -180 &&
                            marker.coordinate.longitude <= 180
                        )
                        .map((marker) => {
                            const isSelected = selectedMarket?.id === marker.id;
                            const config = (CATEGORY_CONFIG as any)[marker.shopType || "supermarket"] || CATEGORY_CONFIG.supermarket;
                            const markerColor = config.color;

                            return (
                                <Marker
                                    key={marker.id}
                                    coordinate={{
                                        latitude: Number(marker.coordinate.latitude),
                                        longitude: Number(marker.coordinate.longitude),
                                    }}
                                    pinColor={markerColor}
                                    tracksViewChanges={tracksViewChanges}
                                    anchor={{ x: 0.5, y: 1 }}
                                    zIndex={isSelected ? 999 : 1}
                                    onPress={() => setSelectedMarket(marker)}
                                />
                            );
                        })}
                </MapView>

                <View style={styles.filtersWrapper}>
                    <FilterButton
                        icon="storefront-outline"
                        label={getFilterLabel("type")}
                        onPress={() => setActiveFilterModal("type")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                        accentColor={themeAccentColor}
                        isActive={filters.shopType !== "all"}
                    />
                    <FilterButton
                        icon="navigate-outline"
                        label={getFilterLabel("distance")}
                        onPress={() => setActiveFilterModal("distance")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                        accentColor={themeAccentColor}
                        isActive={filters.maxDistance !== 5000}
                    />
                    <FilterButton
                        icon="time-outline"
                        label={getFilterLabel("hours")}
                        onPress={() => setActiveFilterModal("hours")}
                        themeStyles={themeStyles}
                        isDark={isDark}
                        accentColor={themeAccentColor}
                        isActive={filters.hoursOption !== "all"}
                    />
                </View>

                {/* Mini Legenda no canto esquerdo inferior */}
                <View
                    style={[
                        styles.miniLegendCard,
                        themeStyles.card,
                        themeStyles.border,
                        isDark
                            ? { backgroundColor: "rgba(24, 28, 24, 0.92)", borderColor: "rgba(255, 255, 255, 0.12)" }
                            : { backgroundColor: "rgba(255, 255, 255, 0.94)", borderColor: "rgba(0, 0, 0, 0.08)" }
                    ]}
                >
                    <View style={styles.miniLegendHeaderRow}>
                        <Ionicons name="map-outline" size={11} color={isDark ? "#A0AEC0" : "#64748B"} />
                        <Text style={[styles.miniLegendTitle, themeStyles.text]}>
                            {t("map.legendTitle")}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.legendItem,
                            filters.shopType === "supermarket" && [styles.legendItemActive, { backgroundColor: "rgba(37, 99, 235, 0.14)" }]
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setFilters(prev => ({
                            ...prev,
                            shopType: prev.shopType === "supermarket" ? "all" : "supermarket"
                        }))}
                    >
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_CONFIG.supermarket.color }]}>
                            <Ionicons name="cart" size={10} color="#FFFFFF" />
                        </View>
                        <Text
                            style={[
                                styles.legendLabel,
                                themeStyles.text,
                                filters.shopType === "supermarket" && { fontWeight: "700", color: CATEGORY_CONFIG.supermarket.color }
                            ]}
                        >
                            {t("map.typeSupermarket")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.legendItem,
                            filters.shopType === "grocery" && [styles.legendItemActive, { backgroundColor: "rgba(245, 158, 11, 0.16)" }]
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setFilters(prev => ({
                            ...prev,
                            shopType: prev.shopType === "grocery" ? "all" : "grocery"
                        }))}
                    >
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_CONFIG.grocery.color }]}>
                            <Ionicons name="storefront" size={10} color="#FFFFFF" />
                        </View>
                        <Text
                            style={[
                                styles.legendLabel,
                                themeStyles.text,
                                filters.shopType === "grocery" && { fontWeight: "700", color: CATEGORY_CONFIG.grocery.color }
                            ]}
                        >
                            {t("map.typeConvenience")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.legendItem,
                            filters.shopType === "hortifruti" && [styles.legendItemActive, { backgroundColor: "rgba(16, 185, 129, 0.16)" }]
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setFilters(prev => ({
                            ...prev,
                            shopType: prev.shopType === "hortifruti" ? "all" : "hortifruti"
                        }))}
                    >
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_CONFIG.hortifruti.color }]}>
                            <Ionicons name="leaf" size={10} color="#FFFFFF" />
                        </View>
                        <Text
                            style={[
                                styles.legendLabel,
                                themeStyles.text,
                                filters.shopType === "hortifruti" && { fontWeight: "700", color: CATEGORY_CONFIG.hortifruti.color }
                            ]}
                        >
                            {t("map.typeGrocery")}
                        </Text>
                    </TouchableOpacity>
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
                            {(filters.shopType !== "all" || filters.hoursOption !== "all")
                                ? "Nenhum mercado com estes filtros"
                                : rawHereElements.length > 0
                                    ? `Nenhum mercado a até ${filters.maxDistance / 1000} km`
                                    : "Nenhum mercado encontrado"}
                        </Text>
                        {(filters.shopType !== "all" || filters.hoursOption !== "all" || filters.maxDistance < 10000) && (
                            <TouchableOpacity
                                style={[styles.expandRadiusBtn, { backgroundColor: themeAccentColor }]}
                                onPress={() => setFilters({ maxDistance: 10000, shopType: "all", hoursOption: "all" })}
                            >
                                <Text style={styles.expandRadiusText}>
                                    {(filters.shopType !== "all" || filters.hoursOption !== "all") ? "Limpar" : "10 km"}
                                </Text>
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

const FilterButton = ({ icon, label, onPress, themeStyles, isDark, accentColor, isActive }: any) => (
    <TouchableOpacity
        style={[
            styles.filterCard,
            themeStyles.card,
            themeStyles.border,
            isActive && {
                borderColor: accentColor || "#1565C0",
                borderWidth: 1.5,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(21, 101, 192, 0.08)",
            },
        ]}
        activeOpacity={0.8}
        onPress={onPress}
    >
        <Ionicons name={icon} size={20} color={isActive ? (accentColor || "#1565C0") : (isDark ? "#F0E6D3" : "#555")} />
        <Text
            style={[
                styles.filterText,
                themeStyles.text,
                isActive && { color: accentColor || "#1565C0", fontWeight: "700" }
            ]}
            numberOfLines={1}
        >
            {label}
        </Text>
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
    const categoryConfig = (CATEGORY_CONFIG as any)[market.shopType || "supermarket"] || CATEGORY_CONFIG.supermarket;

    return (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.marketDetailContent, themeStyles.card]}>
                    <Image
                        source={{ uri: getOptimizedImageUrl('https://images.unsplash.com/photo-1578916171728-46686eac8d58', 320, 70) || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=70&w=320&auto=format&fit=crop' }}
                        style={styles.marketImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.marketCategoryBadge, { backgroundColor: categoryConfig.color + "18", borderColor: categoryConfig.color }]}>
                                <Ionicons name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
                                <Text style={[styles.marketCategoryBadgeText, { color: categoryConfig.color }]}>
                                    {t(categoryConfig.labelKey as any) || categoryConfig.defaultLabel}
                                </Text>
                            </View>
                            <Text style={[styles.modalTitle, themeStyles.text]} numberOfLines={2}>
                                {market.title}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ paddingLeft: 10 }}>
                            <Ionicons name="close-circle" size={28} color={isDark ? "#fff" : "#333"} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.marketInfoRow}>
                        <Ionicons name="navigate-outline" size={22} color={accentColor} />
                        <Text style={[styles.marketInfoText, themeStyles.text]}>
                            {((typeof market.routeDistance === "number" && !isNaN(market.routeDistance))
                                ? market.routeDistance
                                : ((typeof market.straightDistance === "number" && !isNaN(market.straightDistance))
                                    ? market.straightDistance
                                    : 0)
                            ).toFixed(2)} km {t("map.distanceRadius")}
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
    map: {
        ...StyleSheet.absoluteFill,
        // Fabric (Nova Arquitetura) mede a MapView com altura 0 quando ela é
        // posicionada apenas por top/bottom. As dimensões explícitas dão ao
        // layout nativo um valor concreto, mantendo o mapa como camada de fundo
        // absoluta com os filtros fluindo por cima.
        width: "100%",
        height: "100%",
    },
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
    customMarkerContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    customMarkerContainerSelected: {
        zIndex: 999,
    },
    customMarkerBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 5,
    },
    customMarkerBubbleSelected: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2.5,
        borderColor: "#FFFFFF",
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 8,
    },
    customMarkerArrow: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 6,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        alignSelf: "center",
        marginTop: -1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 1,
        elevation: 2,
    },
    miniLegendCard: {
        position: "absolute",
        bottom: 28,
        left: 14,
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3.5,
        zIndex: 15,
        minWidth: 145,
        maxWidth: "75%",
    },
    miniLegendHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 5,
        maxWidth: "100%",
    },
    miniLegendTitle: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        opacity: 0.7,
        flexShrink: 1,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 3,
        paddingHorizontal: 5,
        borderRadius: 6,
        marginBottom: 2,
        gap: 6,
        width: "100%",
    },
    legendItemActive: {
        borderRadius: 6,
    },
    legendDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    legendLabel: {
        fontSize: 11,
        fontWeight: "500",
        flex: 1,
        flexWrap: "wrap",
    },
    marketCategoryBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 6,
        gap: 5,
    },
    marketCategoryBadgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    recenterButton: {
        position: "absolute",
        bottom: 28,
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
        zIndex: 15,
    },
    inlineLoader: {
        position: "absolute",
        top: 82,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        elevation: 4,
        zIndex: 12,
    },
    inlineLoaderText: { marginLeft: 8, fontSize: 12, color: "#333", fontWeight: '500' },
    noMarkersBanner: {
        position: "absolute",
        top: 80,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        elevation: 4,
        borderWidth: 1,
        gap: 8,
        zIndex: 12,
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