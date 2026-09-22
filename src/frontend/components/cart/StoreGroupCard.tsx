import React, { memo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import { useI18n } from "../../content/i18nContext";
import type { OptimizedStoreGroupDisplay, OptimizedItemDisplay } from "../../services/cartService";

interface StoreGroupCardProps {
  group: OptimizedStoreGroupDisplay;
  otherStores?: { marketId: number; marketName: string }[];
  onUpdateItemQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onReallocateItem?: (productId: number, targetMarketId: number) => void;
}

export const StoreGroupCard = memo(function StoreGroupCard({
  group,
  otherStores = [],
  onUpdateItemQty,
  onRemoveItem,
  onReallocateItem,
}: StoreGroupCardProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const [reallocatingItem, setReallocatingItem] = useState<OptimizedItemDisplay | null>(null);

  const handleStep = (productId: number, delta: number, currentQty: number) => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      onRemoveItem(productId);
    } else {
      onUpdateItemQty(productId, newQty);
    }
  };

  const handleReallocateSelect = (targetMarketId: number) => {
    if (reallocatingItem && onReallocateItem) {
      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      onReallocateItem(reallocatingItem.productId, targetMarketId);
    }
    setReallocatingItem(null);
  };

  const formattedItemsSubtotal = `R$ ${group.subtotalItems.toFixed(2).replace(".", ",")}`;
  const formattedFuel = `R$ ${group.fuelCost.toFixed(2).replace(".", ",")}`;
  const formattedTotal = `R$ ${group.totalWithTravel.toFixed(2).replace(".", ",")}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: semantic.colors.surface.card,
          borderColor: semantic.colors.border.default,
        },
      ]}
    >
      {/* Store Header */}
      <View style={[styles.header, { borderBottomColor: semantic.colors.border.default }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.stopBadge, { backgroundColor: accent }]}>
            <Text style={styles.stopBadgeText}>#{group.stopOrder}</Text>
          </View>
          <View style={styles.storeDetails}>
            <Text style={[styles.storeName, { color: semantic.colors.text.primary }]} numberOfLines={1}>
              {group.marketName}
            </Text>
            <View style={styles.storeMetricsRow}>
              <View style={styles.tag}>
                <Ionicons name="navigate-outline" size={12} color={semantic.colors.text.secondary} />
                <Text style={[styles.tagText, { color: semantic.colors.text.secondary }]}>
                  {group.distanceKm} km
                </Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="time-outline" size={12} color={semantic.colors.text.secondary} />
                <Text style={[styles.tagText, { color: semantic.colors.text.secondary }]}>
                  ~{group.durationMinutes} min
                </Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="flame-outline" size={12} color={accent} />
                <Text style={[styles.tagText, { color: accent, fontWeight: "600" }]}>
                  {formattedFuel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Items List */}
      <View style={styles.itemsList}>
        {group.items.map((item) => (
          <View
            key={item.productId}
            style={[
              styles.itemRow,
              { borderBottomColor: semantic.colors.surface.input },
            ]}
          >
            {/* Top Zone: Product Image + Info + Subtotal */}
            <View style={styles.itemMainRow}>
              {/* Product Image */}
              <View
                style={[
                  styles.imageBox,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                {item.productIcon ? (
                  <Image
                    source={{ uri: item.productIcon }}
                    style={styles.productImg}
                    contentFit="contain"
                    transition={150}
                  />
                ) : (
                  <Ionicons name="cube-outline" size={22} color={semantic.colors.icon.secondary} />
                )}
              </View>

              {/* Product Info */}
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: semantic.colors.text.primary }]} numberOfLines={2}>
                  {item.productName}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.unitPrice, { color: semantic.colors.text.secondary }]}>
                    R$ {item.unitPrice.toFixed(2).replace(".", ",")} / un.
                  </Text>
                  {item.isPromotion && (
                    <View style={[styles.promoChip, { backgroundColor: `${accent}20` }]}>
                      <Text style={[styles.promoText, { color: accent }]}>Oferta</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Item Subtotal on Right */}
              <View style={styles.subtotalWrap}>
                <Text style={[styles.subtotalLabel, { color: semantic.colors.text.tertiary }]}>
                  Total ({item.quantity}x)
                </Text>
                <Text style={[styles.itemSubtotal, { color: semantic.colors.text.primary }]}>
                  R$ {item.subtotal.toFixed(2).replace(".", ",")}
                </Text>
              </View>
            </View>

            {/* Bottom Action Row: Reallocate Button & Quantity Stepper */}
            <View style={styles.itemActionRow}>
              {otherStores.length > 0 ? (
                <TouchableOpacity
                  style={[styles.reallocBtn, { backgroundColor: `${accent}15` }]}
                  activeOpacity={0.7}
                  onPress={() => setReallocatingItem(item)}
                >
                  <Ionicons name="swap-horizontal" size={13} color={accent} />
                  <Text style={[styles.reallocText, { color: accent }]}>
                    {t("cart.reallocate")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              <View
                style={[
                  styles.stepperBox,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                <TouchableOpacity
                  style={styles.stepBtn}
                  activeOpacity={0.7}
                  onPress={() => handleStep(item.productId, -1, item.quantity)}
                >
                  <Ionicons
                    name={item.quantity === 1 ? "trash-outline" : "remove"}
                    size={14}
                    color={item.quantity === 1 ? "#EF4444" : semantic.colors.icon.primary}
                  />
                </TouchableOpacity>

                <Text style={[styles.stepQty, { color: semantic.colors.text.primary }]}>
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  style={styles.stepBtn}
                  activeOpacity={0.7}
                  onPress={() => handleStep(item.productId, 1, item.quantity)}
                >
                  <Ionicons name="add" size={14} color={semantic.colors.icon.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Card Footer Summary */}
      <View
        style={[
          styles.cardFooter,
          {
            backgroundColor: semantic.colors.surface.input,
            borderTopColor: semantic.colors.border.default,
          },
        ]}
      >
        <View style={styles.footerCol}>
          <Text
            style={[styles.footerLabel, { color: semantic.colors.text.tertiary }]}
            numberOfLines={2}
          >
            {t("cart.grocerySubtotal")}
          </Text>
          <Text style={[styles.footerValue, { color: semantic.colors.text.primary }]}>
            {formattedItemsSubtotal}
          </Text>
        </View>

        <View style={[styles.footerDivider, { backgroundColor: semantic.colors.border.default }]} />

        <View style={styles.footerCol}>
          <Text
            style={[styles.footerLabel, { color: semantic.colors.text.tertiary }]}
            numberOfLines={2}
          >
            {t("cart.travelCost")}
          </Text>
          <Text style={[styles.footerValue, { color: semantic.colors.text.secondary }]}>
            +{formattedFuel}
          </Text>
        </View>

        <View style={[styles.footerDivider, { backgroundColor: semantic.colors.border.default }]} />

        <View style={styles.footerCol}>
          <Text
            style={[styles.footerLabel, { color: semantic.colors.text.tertiary }]}
            numberOfLines={2}
          >
            {t("cart.stopTotal")}
          </Text>
          <Text style={[styles.footerValueTotal, { color: accent }]}>
            {formattedTotal}
          </Text>
        </View>
      </View>

      {/* Reallocation Picker Modal */}
      <Modal visible={!!reallocatingItem} transparent animationType="fade" onRequestClose={() => setReallocatingItem(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.reallocBox,
              { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default },
            ]}
          >
            <View style={styles.reallocHeader}>
              <Text style={[styles.reallocTitle, { color: semantic.colors.text.primary }]}>
                {t("cart.reallocateModalTitle")}
              </Text>
              <TouchableOpacity onPress={() => setReallocatingItem(null)}>
                <Ionicons name="close" size={20} color={semantic.colors.icon.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.reallocItemName, { color: semantic.colors.text.secondary }]}>
              {reallocatingItem?.productName}
            </Text>

            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {otherStores.map((os) => (
                <TouchableOpacity
                  key={os.marketId}
                  style={[
                    styles.storeOptionRow,
                    { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleReallocateSelect(os.marketId)}
                >
                  <Ionicons name="storefront-outline" size={18} color={accent} />
                  <Text style={[styles.storeOptionName, { color: semantic.colors.text.primary }]} numberOfLines={1}>
                    {os.marketName}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={semantic.colors.icon.secondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stopBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
    lineHeight: 20,
  },
  storeMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
  },
  itemsList: {
    paddingHorizontal: 16,
  },
  itemRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImg: {
    width: "85%",
    height: "85%",
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unitPrice: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  promoChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoText: {
    fontSize: 10,
    fontWeight: "700",
  },
  subtotalWrap: {
    alignItems: "flex-end",
    marginLeft: 6,
  },
  subtotalLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  itemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    paddingLeft: 60, // Aligns neatly after 48px image + 12px gap
  },
  stepperBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
  },
  stepBtn: {
    paddingHorizontal: 8,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 6,
  },
  reallocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  reallocText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 4,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    lineHeight: 13,
    textAlign: "center",
    minHeight: 26,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  footerValueTotal: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  footerDivider: {
    width: 1,
    height: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reallocBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  reallocHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reallocTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  reallocItemName: {
    fontSize: 12,
    marginBottom: 14,
  },
  storeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  storeOptionName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});
