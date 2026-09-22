import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import { useI18n } from "../../content/i18nContext";
import type { TravelSettings } from "../../services/cartService";

interface TravelSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: TravelSettings;
  onSave: (updates: Partial<TravelSettings>) => void;
}

export function TravelSettingsModal({ visible, onClose, settings, onSave }: TravelSettingsModalProps) {
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const [efficiencyStr, setEfficiencyStr] = useState(String(settings.fuelEfficiency));
  const [priceStr, setPriceStr] = useState(String(settings.fuelPrice));
  const [thresholdStr, setThresholdStr] = useState(String(settings.convenienceThreshold));
  const [radiusStr, setRadiusStr] = useState(String(settings.maxRadiusKm));
  const [isRoundTrip, setIsRoundTrip] = useState(settings.isRoundTrip);

  useEffect(() => {
    if (visible) {
      setEfficiencyStr(String(settings.fuelEfficiency));
      setPriceStr(String(settings.fuelPrice));
      setThresholdStr(String(settings.convenienceThreshold));
      setRadiusStr(String(settings.maxRadiusKm));
      setIsRoundTrip(settings.isRoundTrip);
    }
  }, [visible, settings]);

  const handleSave = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const eff = parseFloat(efficiencyStr.replace(",", "."));
    const prc = parseFloat(priceStr.replace(",", "."));
    const th = parseFloat(thresholdStr.replace(",", "."));
    const rad = parseFloat(radiusStr.replace(",", "."));

    onSave({
      fuelEfficiency: isNaN(eff) || eff <= 0 ? 10.0 : eff,
      fuelPrice: isNaN(prc) || prc <= 0 ? 5.8 : prc,
      convenienceThreshold: isNaN(th) || th < 0 ? 5.0 : th,
      maxRadiusKm: isNaN(rad) || rad <= 0 ? 15 : rad,
      isRoundTrip,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalBox,
            { backgroundColor: semantic.colors.surface.card, borderColor: semantic.colors.border.default },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="car-sport-outline" size={22} color={accent} />
              <Text style={[styles.title, { color: semantic.colors.text.primary }]}>
                {t("cart.travelSettings")}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={semantic.colors.icon.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Fuel Efficiency */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: semantic.colors.text.secondary }]}>
                {t("cart.fuelEfficiency")} (km/L)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: semantic.colors.text.primary }]}
                  keyboardType="numeric"
                  value={efficiencyStr}
                  onChangeText={setEfficiencyStr}
                  placeholder="10.0"
                  placeholderTextColor={semantic.colors.text.tertiary}
                />
                <Text style={[styles.inputUnit, { color: semantic.colors.text.tertiary }]}>km/L</Text>
              </View>
            </View>

            {/* Fuel Price */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: semantic.colors.text.secondary }]}>
                {t("cart.fuelPrice")} (R$/L)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: semantic.colors.text.primary }]}
                  keyboardType="numeric"
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="5.80"
                  placeholderTextColor={semantic.colors.text.tertiary}
                />
                <Text style={[styles.inputUnit, { color: semantic.colors.text.tertiary }]}>R$/L</Text>
              </View>
            </View>

            {/* Convenience Threshold */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: semantic.colors.text.secondary }]}>
                {t("cart.convenienceThreshold")}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: semantic.colors.text.primary }]}
                  keyboardType="numeric"
                  value={thresholdStr}
                  onChangeText={setThresholdStr}
                  placeholder="5.00"
                  placeholderTextColor={semantic.colors.text.tertiary}
                />
                <Text style={[styles.inputUnit, { color: semantic.colors.text.tertiary }]}>R$</Text>
              </View>
            </View>

            {/* Max Radius */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: semantic.colors.text.secondary }]}>
                {t("cart.maxRadius")} (km)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: semantic.colors.surface.input, borderColor: semantic.colors.border.default },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: semantic.colors.text.primary }]}
                  keyboardType="numeric"
                  value={radiusStr}
                  onChangeText={setRadiusStr}
                  placeholder="15"
                  placeholderTextColor={semantic.colors.text.tertiary}
                />
                <Text style={[styles.inputUnit, { color: semantic.colors.text.tertiary }]}>km</Text>
              </View>
            </View>

            {/* Round Trip Toggle */}
            <View style={[styles.toggleRow, { borderTopColor: semantic.colors.border.default }]}>
              <View style={styles.toggleTextCol}>
                <Text style={[styles.toggleLabel, { color: semantic.colors.text.primary }]}>
                  {t("cart.roundTrip")}
                </Text>
                <Text style={[styles.toggleSub, { color: semantic.colors.text.tertiary }]}>
                  Inclui trajeto de volta para casa
                </Text>
              </View>
              <Switch
                value={isRoundTrip}
                onValueChange={setIsRoundTrip}
                trackColor={{ false: semantic.colors.border.default, true: accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>{t("common.save")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  body: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 6,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 10,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
