import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme";
import { useI18n } from "../../content/i18nContext";
import type { OptimizationResult } from "../../services/cartService";

interface SavingsHeroCardProps {
  optimization: OptimizationResult;
}

export const SavingsHeroCard = memo(function SavingsHeroCard({ optimization }: SavingsHeroCardProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const isMulti = optimization.recommendedType === "multi_store";
  const netSavings = optimization.netSavingsVsSingleStore;
  const singleBest = optimization.singleStoreComparison;

  const formattedSavings = `R$ ${netSavings.toFixed(2).replace(".", ",")}`;
  const formattedCombined = `R$ ${optimization.totalCombinedCost.toFixed(2).replace(".", ",")}`;
  const formattedGrocery = `R$ ${optimization.totalGroceryCost.toFixed(2).replace(".", ",")}`;
  const formattedTravel = `R$ ${optimization.totalTravelCost.toFixed(2).replace(".", ",")}`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: semantic.colors.surface.card,
          borderColor: isMulti && netSavings > 0 ? accent : semantic.colors.border.default,
          borderWidth: isMulti && netSavings > 0 ? 1.5 : 1,
        },
      ]}
    >
      {/* Dynamic Header Banner */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isMulti && netSavings > 0 ? `${accent}20` : semantic.colors.surface.input,
            },
          ]}
        >
          <Ionicons
            name={isMulti && netSavings > 0 ? "trending-down" : "storefront-outline"}
            size={22}
            color={isMulti && netSavings > 0 ? accent : semantic.colors.icon.primary}
          />
        </View>

        <View style={styles.bannerTextCol}>
          {isMulti && netSavings > 0 ? (
            <>
              <Text style={[styles.bannerTitle, { color: semantic.colors.text.primary }]}>
                {t("cart.savingsBannerSavings", {
                  savings: formattedSavings,
                  stops: optimization.storeGroups.length,
                })}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: semantic.colors.text.secondary }]}>
                {t("cart.netSavings")}: <Text style={{ color: accent, fontWeight: "bold" }}>{formattedSavings}</Text> vs{" "}
                {singleBest?.marketName || t("cart.singleStoreBest")}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.bannerTitle, { color: semantic.colors.text.primary }]}>
                {t("cart.savingsBannerSingle", {
                  store: singleBest?.marketName || optimization.storeGroups[0]?.marketName || "",
                })}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: semantic.colors.text.secondary }]}>
                {t("cart.singleStoreDesc")}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Metrics Row */}
      <View style={[styles.metricsRow, { borderTopColor: semantic.colors.border.default }]}>
        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>
            {t("cart.grocerySubtotal")}
          </Text>
          <Text style={[styles.metricValue, { color: semantic.colors.text.primary }]}>
            {formattedGrocery}
          </Text>
        </View>

        <View style={[styles.dividerVertical, { backgroundColor: semantic.colors.border.default }]} />

        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>
            {t("cart.travelCost")}
          </Text>
          <Text style={[styles.metricValue, { color: semantic.colors.text.secondary }]}>
            {formattedTravel}
          </Text>
        </View>

        <View style={[styles.dividerVertical, { backgroundColor: semantic.colors.border.default }]} />

        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: semantic.colors.text.tertiary }]}>
            {t("cart.totalCombined")}
          </Text>
          <Text style={[styles.metricValueTotal, { color: accent }]}>
            {formattedCombined}
          </Text>
        </View>
      </View>

      {/* Trip Details Sub-bar */}
      <View style={[styles.tripDetailsBar, { backgroundColor: semantic.colors.surface.input }]}>
        <View style={styles.tripMetricItem}>
          <Ionicons name="speedometer-outline" size={14} color={semantic.colors.icon.secondary} />
          <Text style={[styles.tripMetricText, { color: semantic.colors.text.secondary }]}>
            {optimization.totalDistanceKm} km
          </Text>
        </View>

        <View style={styles.tripMetricItem}>
          <Ionicons name="time-outline" size={14} color={semantic.colors.icon.secondary} />
          <Text style={[styles.tripMetricText, { color: semantic.colors.text.secondary }]}>
            ~{optimization.totalDurationMinutes} min
          </Text>
        </View>

        <View style={styles.tripMetricItem}>
          <Ionicons name="business-outline" size={14} color={semantic.colors.icon.secondary} />
          <Text style={[styles.tripMetricText, { color: semantic.colors.text.secondary }]}>
            {t("cart.storesCount", { count: optimization.storeGroups.length })}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    marginBottom: 14,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  metricValueTotal: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  dividerVertical: {
    width: 1,
    height: 28,
  },
  tripDetailsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tripMetricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tripMetricText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
