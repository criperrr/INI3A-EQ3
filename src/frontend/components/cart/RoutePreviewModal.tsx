import React from "react";
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

interface RoutePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  optimization: OptimizationResult;
}

export function RoutePreviewModal({ visible, onClose, optimization }: RoutePreviewModalProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const handleOpenGps = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    const { userLocation } = optimization.parametersUsed;
    const stores = optimization.storeGroups;

    if (stores.length === 0) return;

    if (stores.length === 1) {
      const dest = stores[0]!.coordinate;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
      Linking.openURL(url).catch(() => {});
      return;
    }

    // Multi-stop route URL for Google Maps
    const origin = `${userLocation.lat},${userLocation.lng}`;
    const destination = `${stores[stores.length - 1]!.coordinate.lat},${stores[stores.length - 1]!.coordinate.lng}`;
    const waypoints = stores
      .slice(0, stores.length - 1)
      .map((s) => `${s.coordinate.lat},${s.coordinate.lng}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
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
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={semantic.colors.icon.primary} />
            </TouchableOpacity>
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
              </View>
            </View>

            {/* Stops */}
            {optimization.storeGroups.map((sg, index) => (
              <View key={sg.marketId} style={styles.stepItem}>
                <View style={styles.stepIndicatorCol}>
                  <View style={[styles.stopNumberBadge, { backgroundColor: accent }]}>
                    <Text style={styles.stopNumberText}>{sg.stopOrder}</Text>
                  </View>
                  <View style={[styles.stepLine, { backgroundColor: semantic.colors.border.default }]} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, { color: accent }]}>
                    PARADA {sg.stopOrder} • {sg.items.length} {sg.items.length === 1 ? "item" : "itens"}
                  </Text>
                  <Text style={[styles.stepName, { color: semantic.colors.text.primary }]}>
                    {sg.marketName}
                  </Text>
                  <Text style={[styles.stepMeta, { color: semantic.colors.text.secondary }]}>
                    {sg.distanceKm} km • ~{sg.durationMinutes} min • R${" "}
                    {sg.subtotalItems.toFixed(2).replace(".", ",")} em compras
                  </Text>
                </View>
              </View>
            ))}

            {/* Return / Destination */}
            <View style={styles.stepItem}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepDot, { backgroundColor: "#10B981" }]} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepLabel, { color: semantic.colors.text.tertiary }]}>DESTINO FINAL</Text>
                <Text style={[styles.stepName, { color: semantic.colors.text.primary }]}>
                  {optimization.parametersUsed.isRoundTrip ? "Retorno para casa" : "Último supermercado"}
                </Text>
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
  closeBtn: {
    padding: 4,
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
