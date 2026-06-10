import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent"; // Importação do tema

const COLORS = {
  darkBlue: "#273462",
};

interface HeaderProps {
  onPressMenu?: () => void;
  onPressSettings?: () => void;
}

export default function Header({ onPressMenu, onPressSettings }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark } = useTheme(); // Consumo do tema

  const iconColor = isDark ? "#FFFFFF" : COLORS.darkBlue;

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

      <LogoBrand isDark={isDark} themeStyles={themeStyles} />

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

// Passamos propriedades para o componente interno
const LogoBrand = ({
  isDark,
  themeStyles,
}: {
  isDark: boolean;
  themeStyles: any;
}) => (
  <View style={styles.logoContainer}>
    <Image
      source={
        isDark
          ? require("./images/logo-darkmode.png")
          : require("./images/logo-presco.png")
      }
      style={styles.logoImage}
    />
    <Text style={[styles.logoText, themeStyles.text]}>PResco</Text>
  </View>
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
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    marginRight: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
