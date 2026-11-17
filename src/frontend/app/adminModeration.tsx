import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";
import { appAlert } from "../components/AppAlertProvider";
import {
  fetchPendingOccurrences,
  approveOccurrence,
  rejectOccurrence,
  PendingOccurrenceItem,
} from "../services/ocurrencyService";
import {
  fetchPendingProducts,
  approveProduct,
  rejectProduct,
  PendingProductItem,
} from "../services/productService";
import { formatDisplayDate } from "../utils/dateUtils";
import { AnimatedScreenContainer } from "../components/AnimatedMotion";

export default function AdminModerationScreen() {
  const [activeTab, setActiveTab] = useState<"prices" | "products">("products");
  const [items, setItems] = useState<PendingOccurrenceItem[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProductItem[]>([]);
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
      const [occurrencesData, productsData] = await Promise.all([
        fetchPendingOccurrences().catch(() => []),
        fetchPendingProducts().catch(() => []),
      ]);
      setItems(Array.isArray(occurrencesData) ? occurrencesData : []);
      setPendingProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err: any) {
      console.warn("[AdminModeration] Erro ao carregar itens pendentes:", err);
      appAlert(t("common.error"), err?.message || t("errors.genericError"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAdmin) {
      appAlert(t("common.error"), t("admin.adminOnly") || "Acesso restrito para administradores.");
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
      appAlert(
        t("common.success"),
        t("admin.approvedSuccess") || "Preço aprovado com sucesso! A ocorrência agora é pública e os 15 XP foram concedidos ao usuário.",
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      appAlert(t("common.error"), err?.message || t("errors.genericError"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    appAlert(
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
              appAlert(t("common.success"), t("admin.rejectedSuccess") || "Ocorrência rejeitada com sucesso.");
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              appAlert(t("common.error"), err?.message || t("errors.genericError"));
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const handleApproveProduct = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoadingId(id);
    try {
      await approveProduct(id);
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      appAlert(
        t("common.success"),
        "Produto aprovado! Ele saiu da quarentena, agora aparece nas buscas públicas e concedeu +25 XP aos colaboradores.",
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      appAlert(t("common.error"), err?.message || t("errors.genericError"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectProduct = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    appAlert(
      "Rejeitar Produto em Quarentena",
      "Deseja remover este produto da fila de quarentena? Ele será excluído e não aparecerá nas buscas.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("admin.rejectButton") || "Rejeitar",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(id);
            try {
              await rejectProduct(id);
              setPendingProducts((prev) => prev.filter((p) => p.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              appAlert(t("common.success"), "Produto rejeitado e removido da quarentena.");
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              appAlert(t("common.error"), err?.message || t("errors.genericError"));
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
    <AnimatedScreenContainer style={[styles.container, { backgroundColor: semantic.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: semantic.colors.border.subtle }]}>
        <TouchableOpacity
          testID="admin-moderation-back-btn"
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
            {t("admin.moderationTitle") || "Central de Moderação"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: semantic.colors.text.secondary }]}>
            {pendingProducts.length} {pendingProducts.length === 1 ? "produto em quarentena" : "produtos em quarentena"} • {items.length} {items.length === 1 ? "preço retido" : "preços retidos"}
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

      {/* Segmented Tabs: Produtos em Quarentena vs Preços Retidos */}
      <View style={[styles.tabsContainer, { borderBottomColor: semantic.colors.border.subtle }]}>
        <TouchableOpacity
          testID="admin-tab-products"
          style={[
            styles.tabBtn,
            activeTab === "products" && { backgroundColor: accent + "18", borderColor: accent },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("products");
          }}
        >
          <Ionicons
            name="cube-outline"
            size={16}
            color={activeTab === "products" ? accent : semantic.colors.text.secondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "products" ? accent : semantic.colors.text.secondary },
            ]}
          >
            Produtos ({pendingProducts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="admin-tab-prices"
          style={[
            styles.tabBtn,
            activeTab === "prices" && { backgroundColor: accent + "18", borderColor: accent },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("prices");
          }}
        >
          <Ionicons
            name="pricetag-outline"
            size={16}
            color={activeTab === "prices" ? accent : semantic.colors.text.secondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "prices" ? accent : semantic.colors.text.secondary },
            ]}
          >
            Preços ({items.length})
          </Text>
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
      ) : activeTab === "products" ? (
        pendingProducts.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.centerContainer}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accent} />}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: accent + "18" }]}>
              <Ionicons name="shield-checkmark" size={48} color={accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: semantic.colors.text.primary }]}>
              Nenhum produto em quarentena!
            </Text>
            <Text style={[styles.emptySubtitle, { color: semantic.colors.text.secondary }]}>
              Produtos não encontrados nas bases nacionais ficam retidos aqui até atingirem o quórum de 3 usuários distintos ou serem aprovados manualmente.
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.listContainer, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accent} />}
          >
            <View style={[styles.bannerAlert, { backgroundColor: accent + "15", borderColor: accent + "30" }]}>
              <Ionicons name="shield-half-outline" size={20} color={accent} />
              <Text style={[styles.bannerAlertText, { color: semantic.colors.text.primary }]}>
                Estes produtos não foram localizados nas bases nacionais. Eles ficam ocultos das buscas até que 3 usuários diferentes cadastrem o mesmo item ou um administrador aprove.
              </Text>
            </View>

            {pendingProducts.map((prod) => {
              const isProdBusy = actionLoadingId === prod.id;
              const quorumCount = prod.quorumUsersCount || 1;
              const quorumTarget = prod.quorumTarget || 3;
              const quorumPercent = Math.min(100, Math.round((quorumCount / quorumTarget) * 100));
              const rewardXpPerUser = prod.rewardXpPerUser || 25;
              const totalPendingXp = quorumCount * rewardXpPerUser;
              const contributorsList = Array.isArray(prod.contributors) ? prod.contributors : [];

              return (
                <View
                  key={prod.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: semantic.colors.surface.card,
                      borderColor: semantic.colors.border.subtle,
                    },
                  ]}
                >
                  {/* Top: Product Header */}
                  <View style={styles.cardHeader}>
                    <Image
                      source={{ uri: prod.icon || "https://images.openfoodfacts.org/images/placeholder.png" }}
                      style={[styles.productThumb, { backgroundColor: semantic.colors.surface.input }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.productDetails}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: semantic.colors.surface.highlight }]}>
                          <Text style={[styles.categoryBadgeText, { color: semantic.colors.text.secondary }]}>
                            ID #{prod.id}
                          </Text>
                        </View>
                        <View style={[styles.categoryBadge, { backgroundColor: accent + "20" }]}>
                          <Text style={[styles.categoryBadgeText, { color: accent }]}>
                            {prod.category || "Outros"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.trendBadge,
                            { backgroundColor: "#F59E0B20", flexDirection: "row", alignItems: "center" },
                          ]}
                        >
                          <Ionicons name="people-outline" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                          <Text style={[styles.trendBadgeText, { color: "#F59E0B" }]}>
                            Quórum: {quorumCount}/{quorumTarget}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.productName, { color: semantic.colors.text.primary }]} numberOfLines={2}>
                        {prod.name}
                      </Text>
                      <View style={styles.marketRow}>
                        <Ionicons name="barcode-outline" size={13} color={semantic.colors.text.secondary} />
                        <Text style={[styles.marketName, { color: semantic.colors.text.secondary }]} numberOfLines={1}>
                          {prod.ean
                            ? `${prod.gs1Format || "EAN"}: ${prod.ean} (${prod.isGs1Valid ? "GS1 Válido" : "Inválido"})`
                            : "Sem código de barras (EAN)"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Technical GS1 & Catalog Diagnostics Box */}
                  <View style={[styles.metricsBox, { backgroundColor: isDark ? "#111827" : "#F8FAFC" }]}>
                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                        Padrão GS1
                      </Text>
                      <Text style={[styles.baselinePriceText, { color: prod.isGs1Valid ? "#10B981" : "#F59E0B" }]}>
                        {prod.ean ? prod.gs1Format || "EAN-13" : "Manual"}
                      </Text>
                      <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                        {prod.checkDigitActual !== null && prod.checkDigitActual !== undefined
                          ? `Dígito: ${prod.checkDigitActual} (OK)`
                          : "Sem dígito"}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                        Origem / Prefixo
                      </Text>
                      <Text style={[styles.baselinePriceText, { color: semantic.colors.text.primary }]}>
                        {prod.isVariableWeightCode
                          ? `Balança PLU`
                          : prod.isBrazilianPrefix
                            ? "Brasil (789/790)"
                            : prod.ean
                              ? `Prefixo ${prod.ean.slice(0, 3)}`
                              : "Regional"}
                      </Text>
                      <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                        {prod.ncm ? `NCM: ${prod.ncm}` : "NCM não informado"}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                        XP Retido
                      </Text>
                      <Text style={[styles.reportedPriceText, { color: accent, fontSize: 15 }]}>
                        +{totalPendingXp} XP
                      </Text>
                      <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                        (+{rewardXpPerUser} XP / user)
                      </Text>
                    </View>
                  </View>

                  {/* Detailed Audit & Quarantine Diagnostic Panel */}
                  <View
                    style={[
                      styles.auditDetailBox,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                        borderColor: semantic.colors.border.subtle,
                      },
                    ]}
                  >
                    <View style={styles.auditRowHeader}>
                      <Ionicons name="analytics-outline" size={15} color={accent} />
                      <Text style={[styles.auditSectionTitle, { color: semantic.colors.text.primary }]}>
                        Diagnóstico da Quarentena e Bases Nacionais
                      </Text>
                    </View>
                    <Text style={[styles.auditReasonText, { color: semantic.colors.text.secondary }]}>
                      {prod.quarantineReason ||
                        "Código GS1 matematicamente válido pelo Módulo-10, mas ausente nas 3 camadas de catálogos nacionais (OpenFoodFacts, Federação Varejista VTEX e Cosmos API)."}
                    </Text>

                    <View style={styles.auditGrid}>
                      <View style={styles.auditChip}>
                        <Ionicons name="close-circle-outline" size={12} color="#F59E0B" />
                        <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                          Nível 1 (OpenFood/UPC): Ausente
                        </Text>
                      </View>
                      <View style={styles.auditChip}>
                        <Ionicons name="close-circle-outline" size={12} color="#F59E0B" />
                        <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                          Nível 2 (Varejo BR): Ausente
                        </Text>
                      </View>
                      <View style={styles.auditChip}>
                        <Ionicons name="close-circle-outline" size={12} color="#F59E0B" />
                        <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                          Nível 3 (Cosmos GTIN): Ausente
                        </Text>
                      </View>
                      <View style={styles.auditChip}>
                        <Ionicons
                          name={prod.icon ? "image-outline" : "alert-circle-outline"}
                          size={12}
                          color={prod.icon ? "#10B981" : "#94A3B8"}
                        />
                        <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                          Foto: {prod.icon ? "Anexada" : "Sem foto oficial"}
                        </Text>
                      </View>
                    </View>

                    {/* Multi-User Anti-Sybil Quorum Progress Bar */}
                    <View style={styles.quorumProgressSection}>
                      <View style={styles.quorumLabelRow}>
                        <Text style={[styles.quorumLabelTitle, { color: semantic.colors.text.primary }]}>
                          Progresso do Quórum Anti-Sybil ({quorumCount} de {quorumTarget} contas distintas)
                        </Text>
                        <Text style={[styles.quorumPercentText, { color: accent }]}>{quorumPercent}%</Text>
                      </View>
                      <View style={[styles.quorumTrack, { backgroundColor: isDark ? "#1E293B" : "#CBD5E1" }]}>
                        <View
                          style={[
                            styles.quorumFill,
                            { width: `${quorumPercent}%`, backgroundColor: accent },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Distinct Contributors List */}
                    {contributorsList.length > 0 && (
                      <View style={styles.contributorsBox}>
                        <Text style={[styles.contributorsTitle, { color: semantic.colors.text.secondary }]}>
                          Usuários distintos que solicitaram este produto:
                        </Text>
                        {contributorsList.map((c, idx) => (
                          <View key={`${prod.id}-u-${c.userId}`} style={styles.contributorRow}>
                            <Ionicons name="person-circle-outline" size={14} color={accent} />
                            <Text
                              style={[styles.contributorText, { color: semantic.colors.text.primary }]}
                              numberOfLines={1}
                            >
                              {idx + 1}. {c.userName || "Usuário"} ({c.userEmail || `ID #${c.userId}`})
                            </Text>
                            <Text style={[styles.contributorXpBadge, { color: accent }]}>
                              {c.points} XP • {formatDisplayDate(c.submittedAt)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.authorText, { color: semantic.colors.text.tertiary }]}>
                      Autor original: {prod.userName || "Usuário"} ({prod.userEmail || `ID #${prod.createdByUserId || 1}`})
                    </Text>
                    <Text style={[styles.dateText, { color: semantic.colors.text.tertiary }]}>
                      {formatDisplayDate(prod.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.rejectBtn,
                        { borderColor: "#EF444450", backgroundColor: "#EF444415" },
                      ]}
                      activeOpacity={0.7}
                      disabled={isProdBusy}
                      onPress={() => handleRejectProduct(prod.id)}
                    >
                      {isProdBusy ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={17} color="#EF4444" />
                          <Text style={[styles.rejectBtnText, { color: "#EF4444" }]}>
                            Rejeitar
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
                      disabled={isProdBusy}
                      onPress={() => handleApproveProduct(prod.id)}
                    >
                      {isProdBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>
                            Aprovar Produto (+{totalPendingXp} XP)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )
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
                        <View style={[styles.trendBadge, { backgroundColor: "#EA580C20", flexDirection: "row", alignItems: "center" }]}>
                          <Ionicons name="flame" size={12} color="#EA580C" style={{ marginRight: 3 }} />
                          <Text style={[styles.trendBadgeText, { color: "#EA580C" }]}>
                            Tendência ({item.quorumUsersCount} users)
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
                    <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                      {item.isPromotion ? "Em Oferta" : "Preço Normal"}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                      Média / Mediana
                    </Text>
                    <Text style={[styles.baselinePriceText, { color: semantic.colors.text.primary }]}>
                      {item.baselineAvgPrice ? formatCurrency(item.baselineAvgPrice) : "Cold Start"}
                    </Text>
                    <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                      {item.medianPrice ? `Med: ${formatCurrency(item.medianPrice)}` : "0 cotações ativas"}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: semantic.colors.text.secondary }]}>
                      Desvio / Z-Score
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
                        {item.baselineAvgPrice ? diffSign : "1ª Cotação"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: semantic.colors.text.tertiary }}>
                      {item.zScore !== undefined ? `${Number(item.zScore).toFixed(2)}σ` : "σ = 0"}
                    </Text>
                  </View>
                </View>

                {/* Statistical & Audit Breakdown for Suspended Price */}
                <View
                  style={[
                    styles.auditDetailBox,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                      borderColor: semantic.colors.border.subtle,
                    },
                  ]}
                >
                  <View style={styles.auditRowHeader}>
                    <Ionicons name="pulse-outline" size={15} color={accent} />
                    <Text style={[styles.auditSectionTitle, { color: semantic.colors.text.primary }]}>
                      Análise Estatística e Motivo da Retenção (#{item.id})
                    </Text>
                  </View>
                  <Text style={[styles.auditReasonText, { color: semantic.colors.text.secondary }]}>
                    {item.suspensionReason ||
                      "Retido preventivamente pelo motor de desvio padrão por divergir da curva histórica."}
                  </Text>

                  <View style={styles.auditGrid}>
                    <View style={styles.auditChip}>
                      <Ionicons name="barcode-outline" size={12} color={accent} />
                      <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                        EAN: {item.productEan || `Prod #${item.productId}`}
                      </Text>
                    </View>
                    <View style={styles.auditChip}>
                      <Ionicons name="swap-vertical-outline" size={12} color={accent} />
                      <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                        Faixa: {item.minPrice ? `${formatCurrency(item.minPrice)} – ${formatCurrency(item.maxPrice || item.minPrice)}` : "Sem faixa histórica"}
                      </Text>
                    </View>
                    <View style={styles.auditChip}>
                      <Ionicons name="stats-chart-outline" size={12} color={accent} />
                      <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                        Amostras: {item.activeSamplesCount ?? 0} ({item.distinctUsersCount ?? 0} users)
                      </Text>
                    </View>
                    <View style={styles.auditChip}>
                      <Ionicons name="trophy-outline" size={12} color={accent} />
                      <Text style={[styles.auditChipText, { color: semantic.colors.text.secondary }]}>
                        Recompensa: +{item.rewardXp ?? 15} XP
                      </Text>
                    </View>
                  </View>
                </View>

                {/* User & Date Footer */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.authorText, { color: semantic.colors.text.tertiary }]}>
                    Enviado por: {item.userName || "Usuário"} ({item.userEmail || `ID #${item.userId}`}) • {item.userPoints ?? 0} XP
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
    </AnimatedScreenContainer>
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
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
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
  auditDetailBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  auditRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  auditSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  auditReasonText: {
    fontSize: 12,
    lineHeight: 17,
  },
  auditGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  auditChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#64748B15",
  },
  auditChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quorumProgressSection: {
    marginTop: 4,
    gap: 5,
  },
  quorumLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quorumLabelTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  quorumPercentText: {
    fontSize: 11,
    fontWeight: "800",
  },
  quorumTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  quorumFill: {
    height: "100%",
    borderRadius: 4,
  },
  contributorsBox: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#64748B20",
    gap: 4,
  },
  contributorsTitle: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  contributorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contributorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  contributorXpBadge: {
    fontSize: 10,
    fontWeight: "700",
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
