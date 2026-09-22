import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import {
  cartService,
  DEFAULT_TRAVEL_SETTINGS,
  type CartProductItem,
  type TravelSettings,
  type OptimizationResult,
} from "../services/cartService";
import { getUserLocation } from "../utils/userLocation";
import { SavingsHeroCard } from "../components/cart/SavingsHeroCard";
import { OptimizationStrategyControl } from "../components/cart/OptimizationStrategyControl";
import { StoreGroupCard } from "../components/cart/StoreGroupCard";
import { TravelSettingsModal } from "../components/cart/TravelSettingsModal";
import { RoutePreviewModal } from "../components/cart/RoutePreviewModal";

export default function CartScreen() {
  const router = useRouter();
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const [cartItems, setCartItems] = useState<CartProductItem[]>([]);
  const [settings, setSettings] = useState<TravelSettings>(DEFAULT_TRAVEL_SETTINGS);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Modals
  const [isTravelModalVisible, setIsTravelModalVisible] = useState(false);
  const [isRouteModalVisible, setIsRouteModalVisible] = useState(false);

  // Stable references to prevent hook re-trigger thrashing
  const cartItemsRef = useRef<CartProductItem[]>([]);
  const settingsRef = useRef<TravelSettings>(DEFAULT_TRAVEL_SETTINGS);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Run Optimization Engine in background
  const triggerOptimization = useCallback(
    async (itemsToOptimize?: CartProductItem[], settingsToUse?: TravelSettings) => {
      const activeItems = itemsToOptimize || cartItemsRef.current;
      const activeSettings = settingsToUse || settingsRef.current;

      if (!activeItems || activeItems.length === 0) {
        setOptimization(null);
        setOptimizing(false);
        setOptimizationError(null);
        return;
      }

      setOptimizing(true);
      setOptimizationError(null);

      try {
        const coords = await getUserLocation();
        const userLocation = coords
          ? { lat: coords.latitude, lng: coords.longitude }
          : undefined;

        const result = await cartService.optimizeCart({
          userLocation,
          customItems: activeItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
          customSettings: activeSettings,
        });

        setOptimization(result);
        setOptimizationError(null);
      } catch (err: any) {
        console.warn("[CartScreen] Optimization error:", err);
        setOptimizationError(err?.message || "Não foi possível conectar ao servidor de otimização.");
      } finally {
        setOptimizing(false);
      }
    },
    []
  );

  // Mount: fast initial load from AsyncStorage (takes <5ms), then trigger background optimization
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [items, loadedSettings] = await Promise.all([
          cartService.getCartItems(),
          cartService.getTravelSettings(),
        ]);

        if (!isMounted) return;
        setCartItems(items);
        setSettings(loadedSettings);
        setLoading(false); // Instant unblock so user sees their cart immediately!

        if (items.length > 0) {
          triggerOptimization(items, loadedSettings);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    })();

    const unsubscribe = cartService.subscribe((updatedItems) => {
      if (!isMounted) return;
      setCartItems(updatedItems);
      if (updatedItems.length > 0) {
        triggerOptimization(updatedItems);
      } else {
        setOptimization(null);
        setOptimizing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [triggerOptimization]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [items, loadedSettings] = await Promise.all([
        cartService.getCartItems(),
        cartService.getTravelSettings(),
      ]);
      setCartItems(items);
      setSettings(loadedSettings);
      if (items.length > 0) {
        await triggerOptimization(items, loadedSettings);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<TravelSettings>) => {
    const updated = await cartService.saveTravelSettings(updates);
    setSettings(updated);
    triggerOptimization(cartItems, updated);
  };

  const handleUpdateItemQty = async (productId: number, qty: number) => {
    const updated = await cartService.updateQuantity(productId, qty);
    setCartItems(updated);
  };

  const handleRemoveItem = async (productId: number) => {
    const updated = await cartService.removeFromCart(productId);
    setCartItems(updated);
  };

  const handleClearCart = () => {
    Alert.alert(
      t("cart.clearCartTitle"),
      t("cart.clearCartConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              } catch {}
            }
            await cartService.clearCart();
            setCartItems([]);
            setOptimization(null);
          },
        },
      ]
    );
  };

  const handleShareList = async () => {
    if (!optimization) return;
    try {
      let message = `🛒 *Minha Lista de Compras Otimizada (Presco)*\n\n`;
      optimization.storeGroups.forEach((g) => {
        message += `🏪 *${g.marketName}* (~${g.distanceKm} km | Combustível: R$ ${g.fuelCost.toFixed(2)})\n`;
        g.items.forEach((it) => {
          message += `   • ${it.quantity}x ${it.productName} — R$ ${it.unitPrice.toFixed(2)} un (R$ ${it.subtotal.toFixed(2)})\n`;
        });
        message += `   Subtotal: R$ ${g.subtotalItems.toFixed(2)}\n\n`;
      });
      message += `💰 *Gasto Total:* R$ ${optimization.totalCombinedCost.toFixed(2)} (Itens + R$ ${optimization.totalTravelCost.toFixed(2)} de combustível)\n`;
      if (optimization.netSavingsVsSingleStore > 0) {
        message += `✨ *Economia:* R$ ${optimization.netSavingsVsSingleStore.toFixed(2)}\n`;
      }
      await Share.share({ message });
    } catch {}
  };

  // Reallocation override handler
  const handleReallocateItem = (productId: number, targetMarketId: number) => {
    if (!optimization) return;
    let targetItem: any = null;
    const newGroups = optimization.storeGroups.map((g) => {
      const remainingItems = g.items.filter((it) => {
        if (it.productId === productId) {
          targetItem = it;
          return false;
        }
        return true;
      });
      const subtotalItems = Number(remainingItems.reduce((s, it) => s + it.subtotal, 0).toFixed(2));
      return {
        ...g,
        items: remainingItems,
        subtotalItems,
        totalWithTravel: Number((subtotalItems + g.fuelCost).toFixed(2)),
      };
    });

    if (targetItem) {
      const targetGroup = newGroups.find((g) => g.marketId === targetMarketId);
      if (targetGroup) {
        targetGroup.items.push(targetItem);
        targetGroup.subtotalItems = Number((targetGroup.subtotalItems + targetItem.subtotal).toFixed(2));
        targetGroup.totalWithTravel = Number((targetGroup.subtotalItems + targetGroup.fuelCost).toFixed(2));
      }
      setOptimization({
        ...optimization,
        storeGroups: newGroups.filter((g) => g.items.length > 0),
      });
    }
  };

  const totalItemCount = cartItems.reduce((sum, it) => sum + (it.quantity || 1), 0);

  return (
    <View style={[styles.container, { backgroundColor: semantic.colors.surface.background }]}>
      {/* Main Content */}
      {loading ? (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, { color: semantic.colors.text.secondary }]}>
            Carregando sua lista...
          </Text>
        </View>
      ) : cartItems.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: semantic.colors.surface.input }]}>
            <Ionicons name="cart-outline" size={56} color={semantic.colors.icon.secondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: semantic.colors.text.primary }]}>
            {t("cart.emptyTitle")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: semantic.colors.text.secondary }]}>
            {t("cart.emptySubtitle")}
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={() => router.push("/search")}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>{t("cart.exploreProducts")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Populated Cart */
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          {/* In-Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={[styles.cartIconCircle, { backgroundColor: `${accent}18` }]}>
                <Ionicons name="cart" size={18} color={accent} />
              </View>
              <View>
                <Text style={[styles.pageTitle, { color: semantic.colors.text.primary }]}>
                  {t("cart.title")}
                </Text>
                <Text style={[styles.pageSubtitle, { color: semantic.colors.text.tertiary }]}>
                  {totalItemCount} {totalItemCount === 1 ? "item adicionado" : "itens adicionados"}
                </Text>
              </View>
            </View>

            {cartItems.length > 0 && (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: `${semantic.colors.feedback.error}15` }]}
                activeOpacity={0.7}
                onPress={handleClearCart}
              >
                <Ionicons name="trash-outline" size={14} color={semantic.colors.feedback.error} />
                <Text style={[styles.clearBtnText, { color: semantic.colors.feedback.error }]}>
                  Limpar
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notice if local simulation fallback is active */}
          {optimization?.isLocalFallback && (
            <View style={[styles.simulationNotice, { backgroundColor: `${accent}12`, borderColor: `${accent}35` }]}>
              <Ionicons name="information-circle-outline" size={18} color={accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.simulationNoticeTitle, { color: semantic.colors.text.primary }]}>
                  Modo Simulação Local
                </Text>
                <Text style={[styles.simulationNoticeText, { color: semantic.colors.text.secondary }]}>
                  {optimization.fallbackReason || "Servidor conectado, aguardando deploy da API no servidor remoto."}
                </Text>
              </View>
            </View>
          )}

          {/* Optimization Controls */}
          <OptimizationStrategyControl
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenTravelSettings={() => setIsTravelModalVisible(true)}
            onOpenRoutePreview={() => setIsRouteModalVisible(true)}
          />

          {/* Optimizer Results or Loading State */}
          {optimizing && (
            <View style={[styles.optimizingBox, { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default }]}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.optimizingText, { color: semantic.colors.text.secondary }]}>
                Calculando melhor rota, preços e consumo de combustível...
              </Text>
            </View>
          )}

          {optimization ? (
            <>
              {/* Savings & Comparison Banner */}
              <SavingsHeroCard optimization={optimization} />

              {/* Grouped Stores List */}
              <View style={styles.sectionHeader}>
                <Ionicons name="git-merge-outline" size={16} color={accent} />
                <Text style={[styles.sectionTitle, { color: semantic.colors.text.primary }]}>
                  Distribuição por Supermercado
                </Text>
              </View>

              {optimization.storeGroups.map((group) => (
                <StoreGroupCard
                  key={group.marketId}
                  group={group}
                  otherStores={optimization.storeGroups
                    .filter((g) => g.marketId !== group.marketId)
                    .map((g) => ({ marketId: g.marketId, marketName: g.marketName }))}
                  onUpdateItemQty={handleUpdateItemQty}
                  onRemoveItem={handleRemoveItem}
                  onReallocateItem={handleReallocateItem}
                />
              ))}

              {/* Unassigned / Missing items banner */}
              {optimization.unassignedItems.length > 0 && (
                <View style={[styles.unassignedBox, { backgroundColor: `${accent}10`, borderColor: accent }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={accent} />
                  <View style={styles.unassignedTextCol}>
                    <Text style={[styles.unassignedTitle, { color: semantic.colors.text.primary }]}>
                      {t("cart.missingItems")} ({optimization.unassignedItems.length})
                    </Text>
                    {optimization.unassignedItems.map((it) => (
                      <Text key={it.productId} style={[styles.unassignedItem, { color: semantic.colors.text.secondary }]}>
                        • {it.quantity}x {it.productName}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            /* Fallback Raw Items List (Offline or Pre-Optimization) */
            <View style={styles.fallbackListContainer}>
              {optimizationError && !optimizing && (
                <View style={[styles.offlineBanner, { backgroundColor: `${semantic.colors.feedback.warning}15`, borderColor: semantic.colors.feedback.warning }]}>
                  <Ionicons name="cloud-offline-outline" size={20} color={semantic.colors.feedback.warning} />
                  <View style={styles.offlineBannerTextCol}>
                    <Text style={[styles.offlineBannerTitle, { color: semantic.colors.text.primary }]}>
                      Modo Local (Offline)
                    </Text>
                    <Text style={[styles.offlineBannerDesc, { color: semantic.colors.text.secondary }]}>
                      Exibindo os itens salvos no dispositivo. Conecte ao servidor para calcular o trajeto e a economia entre supermercados.
                    </Text>
                    <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: accent }]}
                      activeOpacity={0.8}
                      onPress={() => triggerOptimization()}
                    >
                      <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.retryBtnText}>Tentar Otimizar Novamente</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={16} color={accent} />
                <Text style={[styles.sectionTitle, { color: semantic.colors.text.primary }]}>
                  Itens da sua Lista ({totalItemCount})
                </Text>
              </View>

              {cartItems.map((item) => (
                <View
                  key={item.productId}
                  style={[
                    styles.rawItemCard,
                    {
                      backgroundColor: semantic.colors.surface.card,
                      borderColor: semantic.colors.border.default,
                    },
                  ]}
                >
                  <View style={[styles.rawItemImageWrap, { backgroundColor: semantic.colors.surface.input }]}>
                    {item.icon ? (
                      <Image source={{ uri: item.icon }} style={styles.rawItemImage} contentFit="contain" cachePolicy="memory-disk" />
                    ) : (
                      <Ionicons name="cube-outline" size={24} color={semantic.colors.icon.secondary} />
                    )}
                  </View>

                  <View style={styles.rawItemInfo}>
                    <Text style={[styles.rawItemName, { color: semantic.colors.text.primary }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.ean && (
                      <Text style={[styles.rawItemEan, { color: semantic.colors.text.tertiary }]}>
                        EAN: {item.ean}
                      </Text>
                    )}
                  </View>

                  <View style={styles.rawItemActions}>
                    <View style={[styles.rawStepper, { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default }]}>
                      <TouchableOpacity
                        style={styles.rawStepBtn}
                        activeOpacity={0.7}
                        onPress={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={semantic.colors.icon.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.rawStepCount, { color: semantic.colors.text.primary }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={styles.rawStepBtn}
                        activeOpacity={0.7}
                        onPress={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={semantic.colors.icon.primary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.rawDeleteBtn, { backgroundColor: `${semantic.colors.feedback.error}15` }]}
                      activeOpacity={0.7}
                      onPress={() => handleRemoveItem(item.productId)}
                    >
                      <Ionicons name="trash-outline" size={16} color={semantic.colors.feedback.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Docked Bottom Bar (when cart has items) */}
      {cartItems.length > 0 && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: semantic.colors.surface.card,
              borderTopColor: semantic.colors.border.default,
            },
          ]}
        >
          {optimization ? (
            <>
              <View style={styles.bottomBarLeft}>
                <Text style={[styles.bottomBarLabel, { color: semantic.colors.text.tertiary }]}>
                  {t("cart.totalCombined")}
                </Text>
                <Text style={[styles.bottomBarTotal, { color: accent }]}>
                  R$ {optimization.totalCombinedCost.toFixed(2).replace(".", ",")}
                </Text>
                {optimization.netSavingsVsSingleStore > 0 && (
                  <Text style={[styles.bottomBarSavings, { color: "#10B981" }]}>
                    Economia: R$ {optimization.netSavingsVsSingleStore.toFixed(2).replace(".", ",")}
                  </Text>
                )}
              </View>

              <View style={styles.bottomBarActions}>
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default }]}
                  activeOpacity={0.7}
                  onPress={handleShareList}
                >
                  <Ionicons name="share-outline" size={18} color={semantic.colors.icon.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.routeBtn, { backgroundColor: accent }]}
                  activeOpacity={0.85}
                  onPress={() => setIsRouteModalVisible(true)}
                >
                  <Ionicons name="navigate" size={17} color="#FFFFFF" />
                  <Text style={styles.routeBtnText}>Navegar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.bottomBarLeft}>
                <Text style={[styles.bottomBarLabel, { color: semantic.colors.text.tertiary }]}>
                  {t("cart.title")}
                </Text>
                <Text style={[styles.bottomBarTotal, { color: semantic.colors.text.primary }]}>
                  {totalItemCount} {totalItemCount === 1 ? "item" : "itens"}
                </Text>
              </View>

              <View style={styles.bottomBarActions}>
                <TouchableOpacity
                  style={[styles.routeBtn, { backgroundColor: accent, opacity: optimizing ? 0.7 : 1 }]}
                  activeOpacity={0.85}
                  onPress={() => triggerOptimization()}
                  disabled={optimizing}
                >
                  {optimizing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="flash-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.routeBtnText}>Otimizar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Travel Settings Modal */}
      <TravelSettingsModal
        visible={isTravelModalVisible}
        onClose={() => setIsTravelModalVisible(false)}
        settings={settings}
        onSave={handleUpdateSettings}
      />

      {/* Route Preview Modal */}
      {optimization && (
        <RoutePreviewModal
          visible={isRouteModalVisible}
          onClose={() => setIsRouteModalVisible(false)}
          optimization={optimization}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 4,
  },
  pageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  simulationNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  simulationNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  simulationNoticeText: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  optimizingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  optimizingText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  unassignedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  unassignedTextCol: {
    flex: 1,
  },
  unassignedTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  unassignedItem: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  bottomBarTotal: {
    fontSize: 18,
    fontWeight: "800",
  },
  bottomBarSavings: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  bottomBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
  },
  routeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  fallbackListContainer: {
    gap: 10,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  offlineBannerTextCol: {
    flex: 1,
  },
  offlineBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  offlineBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  rawItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rawItemImageWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rawItemImage: {
    width: 44,
    height: 44,
  },
  rawItemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  rawItemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  rawItemEan: {
    fontSize: 11,
  },
  rawItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rawStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  rawStepBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rawStepCount: {
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  rawDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
