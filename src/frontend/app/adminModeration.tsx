import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";
import {
  fetchPendingOccurrences,
  approveOccurrence,
  rejectOccurrence,
  PendingOccurrenceItem,
} from "../services/ocurrencyService";
import { formatDisplayDate } from "../utils/dateUtils";

export default function AdminModerationScreen() {
  const [items, setItems] = useState<PendingOccurrenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const { tokens, accent, isDark } = useTheme();
  const { semantic } = tokens;
  const { isAdmin } = useAuth();
  const { t } = useI18n();

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchPendingOccurrences();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("[AdminModeration] Erro ao carregar itens pendentes:", err);
      Alert.alert(t("common.error"), err?.message || t("errors.genericError"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(t("common.error"), t("admin.adminOnly") || "Acesso restrito para administradores.");
      router.back();
      return;
    }
    loadPending();
  }, [isAdmin, loadPending, router, t]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPending();
  }, [loadPending]);

  const handleApprove = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoadingId(id);
    try {
      await approveOccurrence(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t("common.success"),
        t("admin.approvedSuccess") || "Preço aprovado com sucesso! A ocorrência agora é pública e os 15 XP foram concedidos ao usuário.",
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("common.error"), err?.message || t("errors.genericError"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("admin.rejectPromptTitle") || "Rejeitar Preço",
      t("admin.rejectPromptBody") || "Deseja realmente rejeitar este preço? O registro permanecerá suspenso e não será exibido para a comunidade.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("admin.rejectButton") || "Rejeitar",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(id);
            try {
              await rejectOccurrence(id);
              setItems((prev) => prev.filter((item) => item.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t("common.success"), t("admin.rejectedSuccess") || "Ocorrência rejeitada com sucesso.");
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t("common.error"), err?.message || t("errors.genericError"));
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "R$ 0,00";
    return `R$ ${num.toFixed(2).replace(".", ",")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: semantic.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: semantic.colors.border.subtle }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: semantic.colors.surface.highlight }]}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={20} color={semantic.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: semantic.colors.text.primary }]}>
            {t("admin.moderationTitle") || "Moderação de Preços"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: semantic.colors.text.secondary }]}>
            {items.length} {items.length === 1 ? "registro retido" : "registros retidos"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: semantic.colors.surface.highlight }]}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            loadPending();
          }}
        >
          <Ionicons name="refresh" size={18} color={accent} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, { color: semantic.colors.text.secondary }]}>
            {t("common.loading") || "Carregando fila de moderação..."}
          </Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: accent + "18" }]}>
            <Ionicons name="shield-checkmark" size={48} color={accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: semantic.colors.text.primary }]}>
            {t("admin.moderationEmptyTitle") || "Tudo em ordem!"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: semantic.colors.text.secondary }]}>
            {t("admin.moderationEmptySubtitle") ||
              "Nenhum preço pendente de moderação no momento. Todos os valores submetidos pela comunidade estão dentro da margem de conformidade estatística."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listContainer, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          <View style={[styles.bannerAlert, { backgroundColor: accent + "15", borderColor: accent + "30" }]}>
            <Ionicons name="information-circle-outline" size={20} color={accent} />
            <Text style={[styles.bannerAlertText, { color: semantic.colors.text.primary }]}>
              {t("admin.moderationBanner") ||
                "Preços abaixo foram retidos automaticamente pelo motor de desvio padrão por excederem os limites da curva de mercado."}
            </Text>
          </View>

          {items.map((item) => {
            const isItemBusy = actionLoadingId === item.id;
            const diffSign = item.diffPercent > 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%`;

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: semantic.colors.surface.card,
                    borderColor: semantic.colors.border.subtle,
                  },
                ]}
              >
                {/* Card Top: Product Info */}
                <View style={styles.cardHeader}>
                  <Image
                    source={{ uri: item.productIcon || "https://images.openfoodfacts.org/images/placeholder.png" }}
                    style={[styles.productThumb, { backgroundColor: semantic.colors.surface.input }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.productDetails}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: accent + "20" }]}>
                        <Text style={[styles.categoryBadgeText, { color: accent }]}>
                          {item.productCategory || "Geral"}
                        </Text>
                      </View>
                      {item.hasTrendQuorum && (
                        <View style={[styles.trendBadge, { backgroundColor: "#EA580C20" }]}>
                          <Text style={[styles.trendBadgeText, { color: "#EA580C" }]}>
                            🔥 Tendência ({item.quorumUsersCount} users)
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.productName, { color: semantic.colors.text.primary }]} numberOfLines={2}>
                      {item.productName || "Produto"}
                    </Text>
                    <View style={styles.marketRow}>
                      <Ionicons name="storefront-outline" size={13} color={semantic.colors.text.secondary} />
                      <Text style={[styles.marketName, { color: semantic.colors.text.secondary }]} numberOfLines={1}>
                        {item.marketName || "Supermercado"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price Metrics Comparison Block */}
                <View style={[styles.metricsBox, { backgroundColor: isDark ? "#111827" : "#F8FAFC" }]}>
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                      Valor Informado
                    </Text>
                    <Text style={[styles.reportedPriceText, { color: semantic.colors.feedback.warning }]}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                      Média Recente
                    </Text>
                    <Text style={[styles.baselinePriceText, { color: semantic.colors.text.primary }]}>
                      {item.baselineAvgPrice ? formatCurrency(item.baselineAvgPrice) : "Sem histórico"}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                      Variação
                    </Text>
                    <View
                      style={[
                        styles.diffPill,
                        { backgroundColor: item.diffPercent > 0 ? "#EF444420" : "#10B98120" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffText,
                          { color: item.diffPercent > 0 ? "#EF4444" : "#10B981" },
                        ]}
                      >
                        {diffSign}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* User & Date Footer */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.authorText, { color: semantic.colors.text.tertiary }]}>
                    Enviado por: {item.userName || item.userEmail || `User #${item.userId}`}
                  </Text>
                  <Text style={[styles.dateText, { color: semantic.colors.text.tertiary }]}>
                    {formatDisplayDate(item.createdAt)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.rejectBtn,
                      { borderColor: "#EF444450", backgroundColor: "#EF444415" },
                    ]}
                    activeOpacity={0.7}
                    disabled={isItemBusy}
                    onPress={() => handleReject(item.id)}
                  >
                    {isItemBusy ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                        <Text style={[styles.rejectBtnText, { color: "#EF4444" }]}>
                          {t("admin.rejectAction") || "Rejeitar"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.approveBtn,
                      { backgroundColor: accent },
                    ]}
                    activeOpacity={0.7}
                    disabled={isItemBusy}
                    onPress={() => handleApprove(item.id)}
                  >
                    {isItemBusy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.approveBtnText}>
                          {t("admin.approveAction") || "Aprovar Preço"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    opacity: 0.8,
  },
  listContainer: {
    padding: 16,
    gap: 14,
  },
  bannerAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  bannerAlertText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  marketName: {
    fontSize: 12,
    fontWeight: "500",
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  reportedPriceText: {
    fontSize: 16,
    fontWeight: "800",
  },
  baselinePriceText: {
    fontSize: 14,
    fontWeight: "700",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#94A3B830",
  },
  diffPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  diffText: {
    fontSize: 12,
    fontWeight: "800",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  authorText: {
    fontSize: 11,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  approveBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
