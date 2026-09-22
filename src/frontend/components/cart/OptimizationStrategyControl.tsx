import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import { useI18n } from "../../content/i18nContext";
import type { OptimizationStrategy, TravelSettings } from "../../services/cartService";

interface OptimizationStrategyControlProps {
  settings: TravelSettings;
  onUpdateSettings: (updates: Partial<TravelSettings>) => void;
  onOpenTravelSettings: () => void;
  onOpenRoutePreview: () => void;
}

export const OptimizationStrategyControl = memo(function OptimizationStrategyControl({
  settings,
  onUpdateSettings,
  onOpenTravelSettings,
  onOpenRoutePreview,
}: OptimizationStrategyControlProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const handleSelectStrategy = (strat: OptimizationStrategy) => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onUpdateSettings({ strategy: strat });
  };

  const handleSelectStops = (stops: number) => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onUpdateSettings({ maxStops: stops });
  };

  const strategyDescriptions: Record<OptimizationStrategy, string> = {
    max_savings: t("cart.maxSavingsDesc"),
    balanced: t("cart.balancedDesc"),
    single_store: t("cart.singleStoreDesc"),
  };

  return (
    <View style={[styles.container, { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default }]}>
      {/* Top Header Row with Vehicle and Route Buttons */}
      <View style={styles.topActionsRow}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="options-outline" size={16} color={accent} />
          <Text style={[styles.sectionTitle, { color: semantic.colors.text.primary }]}>
            {t("cart.strategy")}
          </Text>
        </View>

        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default }]}
            activeOpacity={0.7}
            onPress={onOpenTravelSettings}
          >
            <Ionicons name="speedometer-outline" size={13} color={accent} />
            <Text style={[styles.smallBtnText, { color: semantic.colors.text.primary }]}>
              {settings.fuelEfficiency} km/L
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: `${accent}15`, borderColor: accent }]}
            activeOpacity={0.7}
            onPress={onOpenRoutePreview}
          >
            <Ionicons name="map-outline" size={13} color={accent} />
            <Text style={[styles.smallBtnText, { color: accent, fontWeight: "700" }]}>
              {t("cart.optimizedRoute")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Strategy Stacked Options (Um em cima do outro para suporte a idiomas extensos) */}
      <View style={[styles.strategyPillContainer, { backgroundColor: semantic.colors.surface.input }]}>
        {([
          { key: "max_savings" as const, icon: "trending-down" as const, label: t("cart.maxSavings") },
          { key: "balanced" as const, icon: "scale-outline" as const, label: t("cart.balanced") },
          { key: "single_store" as const, icon: "storefront-outline" as const, label: t("cart.singleStore") },
        ] as const).map((strat) => {
          const isSelected = settings.strategy === strat.key;
          return (
            <TouchableOpacity
              key={strat.key}
              style={[
                styles.strategyTab,
                isSelected
                  ? [styles.strategyTabActive, { backgroundColor: accent, borderColor: accent }]
                  : { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default },
              ]}
              activeOpacity={0.8}
              onPress={() => handleSelectStrategy(strat.key)}
            >
              <View style={styles.strategyTabLeft}>
                <Ionicons
                  name={strat.icon}
                  size={16}
                  color={isSelected ? semantic.colors.text.inverse : semantic.colors.text.secondary}
                />
                <Text
                  style={[
                    styles.strategyTabText,
                    { color: isSelected ? semantic.colors.text.inverse : semantic.colors.text.primary },
                    isSelected && styles.strategyTabTextActive,
                  ]}
                >
                  {strat.label}
                </Text>
              </View>

              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={isSelected ? semantic.colors.text.inverse : semantic.colors.text.tertiary}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.strategyDescription, { color: semantic.colors.text.tertiary }]}>
        {strategyDescriptions[settings.strategy]}
      </Text>

      {/* Max Stops Selector Row */}
      <View style={styles.controlsRow}>
        <Text style={[styles.controlLabel, { color: semantic.colors.text.secondary }]}>
          {t("cart.maxStops")}:
        </Text>

        <View style={styles.stopsPills}>
          {[1, 2, 3, 4].map((n) => {
            const isSelected = settings.maxStops === n;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.stopPill,
                  {
                    backgroundColor: isSelected ? accent : semantic.colors.surface.input,
                    borderColor: isSelected ? accent : semantic.colors.border.default,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectStops(n)}
              >
                <Text
                  style={[
                    styles.stopPillText,
                    { color: isSelected ? semantic.colors.text.inverse : semantic.colors.text.primary },
                    isSelected && { fontWeight: "700" },
                  ]}
                >
                  {n === 4 ? "4+" : n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  quickButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  strategyPillContainer: {
    flexDirection: "column",
    padding: 6,
    borderRadius: 14,
    marginBottom: 8,
    gap: 6,
  },
  strategyTab: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  strategyTabLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  strategyTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  strategyTabText: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  strategyTabTextActive: {
    fontWeight: "700",
  },
  strategyDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  stopsPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopPill: {
    width: 36,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stopPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
