import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Barcode,
  Image as ImageIcon,
  Globe,
  Clock,
  Radio,
  Server,
  X,
} from "lucide-react-native";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import {
  fetchOpenFoodFactsStatus,
  UpptimeServiceItem,
  UpptimeSummaryResult,
} from "../services/upptimeService";

interface Props {
  onBackToGeneral?: () => void;
}

type FilterType = "presco" | "all" | "issues";

export default function OpenFoodFactsStatusTab({ onBackToGeneral }: Props) {
  const { themeStyles, accent, isDark } = useTheme();
  const { t } = useI18n();

  const [data, setData] = useState<UpptimeSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("presco");
  const [searchQuery, setSearchQuery] = useState("");

  const triggerHaptic = useCallback((style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  }, []);

  const loadStatus = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const res = await fetchOpenFoodFactsStatus(forceRefresh);
        setData(res);
      } catch (err: any) {
        setErrorMessage(
          err?.message || t("errors.serverError") || "Erro ao consultar status da API."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t]
  );

  useEffect(() => {
    loadStatus(false);
  }, [loadStatus]);

  const handleRefresh = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    loadStatus(true);
  };

  const openUrl = (url: string) => {
    triggerHaptic();
    Linking.openURL(url).catch(() => {});
  };

  // Filtered services
  const displayedServices = useMemo(() => {
    if (!data) return [];
    let list = data.allServices;

    if (activeFilter === "presco") {
      list = data.essentialServices;
    } else if (activeFilter === "issues") {
      list = data.allServices.filter((s) => s.status !== "up");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.prescoRoleDescription && s.prescoRoleDescription.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data, activeFilter, searchQuery]);

  // Format latency tag color
  const getLatencyColor = (ms?: number) => {
    if (!ms) return isDark ? "#94A3B8" : "#64748B";
    if (ms < 800) return "#10B981"; // fast green
    if (ms < 2000) return "#F59E0B"; // normal yellow
    return "#EF4444"; // slow red
  };

  const formatTime = (d?: Date) => {
    if (!d) return "--:--";
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <View style={styles.container}>
      {/* Hero Overview Card */}
      <View
        style={[
          styles.heroCard,
          themeStyles.card,
          themeStyles.border,
          { borderColor: accent + "40" },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleWrap}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Radio size={20} color={accent} />
              <Text style={[styles.heroTitle, themeStyles.text]}>
                {t("admin.offStatusTitle") || "Monitoramento Open Food Facts"}
              </Text>
            </View>
            <Text style={[styles.heroSubtitle, themeStyles.subText]}>
              {t("admin.offStatusSubtitle") || "Status operacional e métricas de latência via Upptime"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.refreshButton,
              { backgroundColor: accent + "18", borderColor: accent + "30" },
            ]}
            activeOpacity={0.7}
            onPress={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <RefreshCw size={16} color={accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Global Status Banner */}
        {data && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor:
                  data.overallStatus === "all_up"
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(245, 158, 11, 0.12)",
                borderColor:
                  data.overallStatus === "all_up"
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(245, 158, 11, 0.3)",
              },
            ]}
          >
            {data.overallStatus === "all_up" ? (
              <CheckCircle2 size={18} color="#10B981" />
            ) : (
              <AlertTriangle size={18} color="#F59E0B" />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusBannerText,
                  {
                    color: data.overallStatus === "all_up" ? "#10B981" : "#F59E0B",
                  },
                ]}
              >
                {data.overallStatus === "all_up"
                  ? t("admin.offOverallOperational") || "Todos os serviços essenciais operacionais"
                  : t("admin.offOverallIssues") || "Oscilação ou instabilidade detectada em serviços"}
              </Text>
              <Text style={[styles.statusBannerSub, themeStyles.subText]}>
                {`${data.upCount} de ${data.totalCount} serviços operacionais • ${data.downCount} com alerta`}
              </Text>
            </View>
          </View>
        )}

        {/* Timestamp info */}
        <View style={styles.heroFooter}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Clock size={12} color={themeStyles.subText.color} />
            <Text style={[styles.metaText, themeStyles.subText]}>
              {t("admin.offLastCheck") || "Última verificação"}: {formatTime(data?.lastChecked)}
              {data?.fromCache && ` (${t("admin.offFromCache") || "cache"})`}
            </Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: accent + "20" }]}>
            <Text style={[styles.badgeText, { color: accent }]}>UPPTIME</Text>
          </View>
        </View>
      </View>

      {/* Error state */}
      {errorMessage && (
        <View style={[styles.errorCard, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => loadStatus(true)} style={{ marginTop: 6 }}>
              <Text style={[styles.retryText, { color: accent }]}>
                {t("common.refresh")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading state */}
      {isLoading && !data && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, themeStyles.subText]}>
            {t("admin.offRefreshing") || "Consultando dados no GitHub Upptime..."}
          </Text>
        </View>
      )}

      {data && (
        <>
          {/* Section: Presco Essential Services Highlights */}
          <View style={styles.sectionHeaderWrap}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Activity size={18} color={accent} />
              <Text style={[styles.sectionTitle, themeStyles.text]}>
                {t("admin.offServicesPresco") || "Serviços Essenciais do Presco"}
              </Text>
            </View>
            <View style={[styles.countPill, { backgroundColor: accent + "18" }]}>
              <Text style={[styles.countPillText, { color: accent }]}>
                {data.essentialServices.length}
              </Text>
            </View>
          </View>

          <View style={styles.essentialsGrid}>
            {data.essentialServices.map((service) => {
              const isUp = service.status === "up";
              let ServiceIcon = Server;
              if (service.prescoUsageType === "ean") ServiceIcon = Barcode;
              else if (service.prescoUsageType === "images") ServiceIcon = ImageIcon;
              else if (service.prescoUsageType === "main") ServiceIcon = Globe;
              else if (service.prescoUsageType === "search") ServiceIcon = Search;

              return (
                <View
                  key={service.slug}
                  style={[
                    styles.essentialCard,
                    themeStyles.card,
                    themeStyles.border,
                    { borderColor: isUp ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.3)" },
                  ]}
                >
                  <View style={styles.essentialCardHeader}>
                    <View
                      style={[
                        styles.serviceIconWrap,
                        { backgroundColor: isUp ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)" },
                      ]}
                    >
                      <ServiceIcon size={18} color={isUp ? "#10B981" : "#EF4444"} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.essentialCardName, themeStyles.text]} numberOfLines={1}>
                        {service.name}
                      </Text>
                      {service.prescoRoleDescription && (
                        <Text style={[styles.essentialRoleText, themeStyles.subText]} numberOfLines={2}>
                          {service.prescoRoleDescription}
                        </Text>
                      )}
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isUp
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isUp ? "#10B981" : "#EF4444" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isUp ? "#10B981" : "#EF4444" },
                        ]}
                      >
                        {isUp
                          ? t("admin.offStatusOperational") || "Operacional"
                          : t("admin.offStatusDown") || "Fora do ar"}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics bar */}
                  <View style={[styles.metricsRow, { borderTopColor: isDark ? "#2A3644" : "#E2E8F0" }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, themeStyles.subText]}>
                        {t("admin.offLatency") || "Latência"}
                      </Text>
                      <Text
                        style={[
                          styles.metricVal,
                          { color: getLatencyColor(service.time) },
                        ]}
                      >
                        {service.time ? `${service.time} ms` : "--"}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, themeStyles.subText]}>
                        {t("admin.offUptime") || "Uptime 24h"}
                      </Text>
                      <Text style={[styles.metricVal, themeStyles.text]}>
                        {service.uptimeDay || service.uptime || "100%"}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, themeStyles.subText]}>
                        Uptime Global
                      </Text>
                      <Text style={[styles.metricVal, themeStyles.text]}>
                        {service.uptime || "100%"}
                      </Text>
                    </View>
                  </View>

                  {/* Action row */}
                  {service.url ? (
                    <TouchableOpacity
                      style={styles.urlRow}
                      activeOpacity={0.7}
                      onPress={() => openUrl(service.url)}
                    >
                      <Text style={[styles.urlText, themeStyles.subText]} numberOfLines={1}>
                        {service.url}
                      </Text>
                      <ExternalLink size={12} color={themeStyles.subText.color} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Section: Filters & Full Services Directory */}
          <View style={[styles.sectionHeaderWrap, { marginTop: 24 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Server size={18} color={accent} />
              <Text style={[styles.sectionTitle, themeStyles.text]}>
                {t("admin.offServicesAll") || "Todos os Serviços Monitorados"}
              </Text>
            </View>
            <Text style={[styles.metaText, themeStyles.subText]}>
              {displayedServices.length} de {data.totalCount}
            </Text>
          </View>

          {/* Filters Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "presco"
                  ? { backgroundColor: accent, borderColor: accent }
                  : [themeStyles.card, themeStyles.border],
              ]}
              onPress={() => {
                triggerHaptic();
                setActiveFilter("presco");
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === "presco"
                    ? { color: "#FFF", fontWeight: "700" }
                    : themeStyles.text,
                ]}
              >
                {t("admin.offFilterPresco") || "Essenciais Presco"} ({data.essentialServices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "all"
                  ? { backgroundColor: accent, borderColor: accent }
                  : [themeStyles.card, themeStyles.border],
              ]}
              onPress={() => {
                triggerHaptic();
                setActiveFilter("all");
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === "all"
                    ? { color: "#FFF", fontWeight: "700" }
                    : themeStyles.text,
                ]}
              >
                {t("admin.offFilterAll") || "Todos"} ({data.totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "issues"
                  ? { backgroundColor: "#EF4444", borderColor: "#EF4444" }
                  : [themeStyles.card, themeStyles.border],
              ]}
              onPress={() => {
                triggerHaptic();
                setActiveFilter("issues");
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === "issues"
                    ? { color: "#FFF", fontWeight: "700" }
                    : themeStyles.text,
                ]}
              >
                {t("admin.offFilterIssues") || "Com Falhas"} ({data.downCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              themeStyles.card,
              themeStyles.border,
              { borderColor: accent + "30" },
            ]}
          >
            <Search size={16} color={themeStyles.subText.color} />
            <TextInput
              style={[styles.searchInput, themeStyles.text]}
              placeholder={t("admin.offSearchPlaceholder") || "Buscar serviço monitorado..."}
              placeholderTextColor={themeStyles.subText.color}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color={themeStyles.subText.color} />
              </TouchableOpacity>
            )}
          </View>

          {/* List of services */}
          <View style={styles.servicesList}>
            {displayedServices.map((service) => {
              const isUp = service.status === "up";
              return (
                <View
                  key={service.slug}
                  style={[
                    styles.directoryItem,
                    themeStyles.card,
                    themeStyles.border,
                  ]}
                >
                  <View style={styles.directoryMainRow}>
                    {service.icon ? (
                      <ExpoImage
                        source={{ uri: service.icon }}
                        style={styles.directoryFavicon}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.directoryFaviconFallback, { backgroundColor: accent + "20" }]}>
                        <Server size={12} color={accent} />
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.directoryName, themeStyles.text]} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <Text style={[styles.directoryUrl, themeStyles.subText]} numberOfLines={1}>
                        {service.url}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPillSmall,
                        {
                          backgroundColor: isUp
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(239, 68, 68, 0.12)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isUp ? "#10B981" : "#EF4444" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillSmallText,
                          { color: isUp ? "#10B981" : "#EF4444" },
                        ]}
                      >
                        {isUp ? "UP" : "DOWN"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.directoryFooterRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={[styles.directoryMetaText, themeStyles.subText]}>
                        {t("admin.offLatency") || "Latência"}:{" "}
                        <Text style={{ color: getLatencyColor(service.time), fontWeight: "700" }}>
                          {service.time ? `${service.time} ms` : "--"}
                        </Text>
                      </Text>
                      <Text style={[styles.directoryMetaText, themeStyles.subText]}>
                        Uptime: <Text style={{ fontWeight: "700" }}>{service.uptime}</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => openUrl(service.url)}
                      style={{ padding: 4 }}
                    >
                      <ExternalLink size={14} color={accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Useful External Links Buttons */}
          <View style={styles.externalLinksWrap}>
            <TouchableOpacity
              style={[
                styles.linkButton,
                { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: accent + "30" },
              ]}
              onPress={() => openUrl("https://github.com/openfoodfacts/openfoodfacts-upptime")}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color={accent} />
              <Text style={[styles.linkButtonText, { color: accent }]}>
                {t("admin.offViewOnGithub") || "Ver no GitHub Upptime"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.linkButton,
                { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: accent + "30" },
              ]}
              onPress={() => openUrl("https://status.openfoodfacts.org/")}
              activeOpacity={0.7}
            >
              <Globe size={16} color={accent} />
              <Text style={[styles.linkButtonText, { color: accent }]}>
                {t("admin.offOpenStatusPage") || "Página Oficial de Status"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  metaText: {
    fontSize: 11,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  essentialsGrid: {
    gap: 12,
  },
  essentialCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  essentialCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  essentialCardName: {
    fontSize: 14,
    fontWeight: "700",
  },
  essentialRoleText: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(150, 150, 150, 0.05)",
  },
  urlText: {
    fontSize: 10,
    flex: 1,
    marginRight: 6,
  },
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  servicesList: {
    gap: 8,
  },
  directoryItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  directoryMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  directoryFavicon: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  directoryFaviconFallback: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  directoryName: {
    fontSize: 13,
    fontWeight: "700",
  },
  directoryUrl: {
    fontSize: 10,
    marginTop: 1,
  },
  statusPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillSmallText: {
    fontSize: 10,
    fontWeight: "800",
  },
  directoryFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
  },
  directoryMetaText: {
    fontSize: 10,
  },
  externalLinksWrap: {
    marginTop: 20,
    gap: 10,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
