import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";

export default function MapScreen() {
  const { themeStyles, isDark } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <View style={styles.content}>
        <Ionicons
          name="map-outline"
          size={64}
          color={isDark ? "#F0E6D3" : "#1A2E1A"}
        />
        <Text style={[styles.title, themeStyles.text]}>
          {t("map.unavailableOnWeb")}
        </Text>
        <Text style={[styles.subtitle, themeStyles.text]}>
          {t("map.mobileOnlyNotice")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 20,
  },
});
