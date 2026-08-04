import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";

export default function MapScreen() {
  const { themeStyles, isDark } = useTheme();

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <View style={styles.content}>
        <Ionicons
          name="map-outline"
          size={64}
          color={isDark ? "#F0E6D3" : "#1A2E1A"}
        />
        <Text style={[styles.title, themeStyles.text]}>
          Mapa indisponível na web
        </Text>
        <Text style={[styles.subtitle, themeStyles.text]}>
          O mapa está disponível apenas no aplicativo móvel.{"\n"}
          Abra o app no seu celular para visualizar os pontos no mapa.
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
