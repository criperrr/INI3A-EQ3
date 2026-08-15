import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent"; // Importação do tema
import { useTabNavigation } from "../content/tabNavigationContext";

interface HeaderProps {
  onPressMenu?: () => void;
  onPressSettings?: () => void;
}

export default function Header({ onPressMenu, onPressSettings }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark } = useTheme(); // Consumo do tema
  const router = useRouter();
  const { navigateToTab } = useTabNavigation();

  const iconColor = isDark ? "#F0E6D3" : "#1A2E1A";

  const handleLogoPress = () => {
    navigateToTab("/");
  };

  return (
    <View
      style={[
        styles.container,
        themeStyles.headerBg,
        themeStyles.border,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.iconButton}
        onPress={onPressMenu}
      >
        <Ionicons name="menu-outline" size={26} color={iconColor} />
      </TouchableOpacity>

      <LogoBrand isDark={isDark} onPress={handleLogoPress} />

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.iconButton}
        onPress={onPressSettings}
      >
        <Ionicons name="settings-outline" size={24} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

const LOGO_DARK = require("./images/logo-darkmode.png");
const LOGO_LIGHT = require("./images/logo-presco.png");

const LogoBrand = ({ isDark, onPress }: { isDark: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={styles.logoContainer} 
    activeOpacity={0.7} 
    onPress={onPress}
  >
    <Image
      source={isDark ? LOGO_DARK : LOGO_LIGHT}
      style={styles.logoImage}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  iconButton: {
    padding: 6,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
});
