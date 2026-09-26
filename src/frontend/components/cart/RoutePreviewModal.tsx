import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import { useI18n } from "../../content/i18nContext";
import type { OptimizationResult } from "../../services/cartService";
import {
  openMarketInGoogleMaps,
  buildGoogleMapsQuery,
  buildGoogleMapsRouteUrl,
  resolveAddressFromCoordinates,
  shareCartList,
} from "../../utils/mapNavigation";

interface RoutePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  optimization: OptimizationResult;
}

export function RoutePreviewModal({ visible, onClose, optimization }: RoutePreviewModalProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();
  const [userAddress, setUserAddress] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    const { userLocation } = optimization.parametersUsed;
    if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      resolveAddressFromCoordinates(userLocation.lat, userLocation.lng).then((addr) => {
        if (addr) setUserAddress(addr);
      });
    }
  }, [visible, optimization]);

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    await shareCartList(optimization);
  };

  const handleOpenGps = async () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    const { userLocation } = optimization.parametersUsed;
    const stores = optimization.storeGroups;

    if (stores.length === 0) return;

    // Resolve nominal place queries for all stores along the shopping route
    const storeQueries = await Promise.all(
      stores.map((s) =>
        buildGoogleMapsQuery({
          marketName: s.marketName,
          coordinate: { latitude: s.coordinate.lat, longitude: s.coordinate.lng },
        })
      )
    );

    // Resolve user's nominal street address so Google Maps does not drop an anonymous pin at return
    let returnDestination = userAddress;
    if (!returnDestination && userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      returnDestination = (await resolveAddressFromCoordinates(userLocation.lat, userLocation.lng)) || "";
    }

    if (!returnDestination && userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      returnDestination = `${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`;
    }

    // Round-trip route: omitting 'origin' instructs Google Maps to use live device "Sua localização"
    // without dropping an origin pin, visiting all stores as waypoints, and returning to user's address
    const url = buildGoogleMapsRouteUrl({
      destination: returnDestination,
      waypoints: storeQueries,
      travelmode: "driving",
    });

    try {
      await Linking.openURL(url);
    } catch {
      // Fallback: if external app rejects the round-trip or waypoints, navigate directly to the first stop
      if (stores.length > 0) {
        await openMarketInGoogleMaps({
          marketName: stores[0]!.marketName,
          coordinate: {
            latitude: stores[0]!.coordinate.lat,
            longitude: stores[0]!.coordinate.lng,
          },
          mode: "directions",
        });
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetBox,
            { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="map-outline" size={22} color={accent} />
              <Text style={[styles.title, { color: semantic.colors.text.primary }]}>
                {t("cart.optimizedRoute")}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                testID="modal-share-route-btn"
                activeOpacity={0.7}
                onPress={handleShare}
                style={styles.iconBtn}
              >
                <Ionicons name="share-outline" size={20} color={semantic.colors.icon.primary} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="close" size={22} color={semantic.colors.icon.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={[styles.metricsBar, { backgroundColor: semantic.colors.surface.input }]}>
            <View style={styles.metricCol}>
              <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>Distância</Text>
              <Text style={[styles.metricVal, { color: semantic.colors.text.primary }]}>
                {optimization.totalDistanceKm} km
              </Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>Tempo</Text>
              <Text style={[styles.metricVal, { color: semantic.colors.text.primary }]}>
                ~{optimization.totalDurationMinutes} min
              </Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>Combustível</Text>
              <Text style={[styles.metricVal, { color: accent }]}>
                R$ {optimization.totalTravelCost.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          </View>

          {/* Itinerary Waypoints */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {/* Origin */}
            <View style={styles.stepItem}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, { backgroundColor: "#3B82F6" }]} />
                <View style={[styles.stepLine, { backgroundColor: semantic.colors.border.default }]} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepLabel, { color: semantic.colors.text.tertiary }]}>PONTO DE PARTIDA</Text>
                <Text style={[styles.stepName, { color: semantic.colors.text.primary }]}>
                  Sua Localização Atual
                </Text>
                {userAddress ? (
                  <Text style={[styles.stepMeta, { color: semantic.colors.text.secondary }]}>
                    {userAddress}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Stops */}
            {optimization.storeGroups.map((sg, index) => (
              <TouchableOpacity
                key={sg.marketId}
                style={styles.stepItem}
                activeOpacity={0.7}
                onPress={() => {
                  openMarketInGoogleMaps({
                    marketName: sg.marketName,
                    coordinate: { latitude: sg.coordinate.lat, longitude: sg.coordinate.lng },
                    mode: "search",
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`${sg.marketName} - ${t("productDetails.viewInGoogleMaps")}`}
              >
                <View style={styles.stepIndicatorCol}>
                  <View style={[styles.stopNumberBadge, { backgroundColor: accent }]}>
                    <Text style={styles.stopNumberText}>{sg.stopOrder}</Text>
                  </View>
                  <View style={[styles.stepLine, { backgroundColor: semantic.colors.border.default }]} />
                </View>
                <View style={styles.stepInfo}>
                  <View style={styles.stepHeaderRow}>
                    <Text style={[styles.stepLabel, { color: accent }]}>
                      PARADA {sg.stopOrder} • {sg.items.length} {sg.items.length === 1 ? "item" : "itens"}
                    </Text>
                    <Ionicons name="open-outline" size={13} color={accent} style={{ marginLeft: 6 }} />
                  </View>
                  <Text style={[styles.stepName, { color: semantic.colors.text.primary }]}>
                    {sg.marketName}
                  </Text>
                  <Text style={[styles.stepMeta, { color: semantic.colors.text.secondary }]}>
                    {sg.distanceKm} km • ~{sg.durationMinutes} min • R${" "}
                    {sg.subtotalItems.toFixed(2).replace(".", ",")} em compras
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Return / Destination */}
            <View style={styles.stepItem}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, { backgroundColor: "#10B981" }]} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepLabel, { color: semantic.colors.text.tertiary }]}>DESTINO FINAL (RETORNO)</Text>
                <Text style={[styles.stepName, { color: semantic.colors.text.primary }]}>
                  Ponto de Retorno (Local Inicial)
                </Text>
                {userAddress ? (
                  <Text style={[styles.stepMeta, { color: semantic.colors.text.secondary }]}>
                    {userAddress}
                  </Text>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.gpsBtn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={handleOpenGps}
          >
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
            <Text style={styles.gpsBtnText}>{t("cart.openInMaps")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetBox: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  metricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 16,
  },
  metricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollList: {
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepIndicatorCol: {
    alignItems: "center",
    width: 32,
    marginRight: 10,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
  },
  stopNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 4,
  },
  stepInfo: {
    flex: 1,
    paddingBottom: 10,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  stepMeta: {
    fontSize: 12,
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  gpsBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
