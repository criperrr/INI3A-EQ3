import React, { memo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useTabNavigation } from "../content/tabNavigationContext";

interface HeaderProps {
  onPressMenu?: () => void;
  onPressSettings?: () => void;
}

const LOGO_DARK = require("./images/logo-darkmode.png");
const LOGO_LIGHT = require("./images/logo-presco.png");

const LogoBrand = memo(function LogoBrand({
  isDark,
  onPress,
}: {
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.logoContainer}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Image
        source={isDark ? LOGO_DARK : LOGO_LIGHT}
        style={styles.logoImage}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
        priority="high"
      />
    </TouchableOpacity>
  );
});

const Header = memo(function Header({ onPressMenu, onPressSettings }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { semantic } = tokens;
  const { navigateToTab } = useTabNavigation();

  const handleLogoPress = () => {
    navigateToTab("/", "left", true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: semantic.colors.surface.header,
          borderBottomColor: semantic.colors.border.header,
          paddingHorizontal: semantic.spacing.headerPaddingHorizontal,
          paddingBottom: semantic.spacing.headerPaddingBottom,
          paddingTop: insets.top + semantic.spacing.microGap,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.iconButton}
        onPress={onPressMenu}
      >
        <Ionicons
          name="menu-outline"
          size={26}
          color={semantic.colors.icon.primary}
        />
      </TouchableOpacity>

      <LogoBrand isDark={isDark} onPress={handleLogoPress} />

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.iconButton}
        onPress={onPressSettings}
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={semantic.colors.icon.primary}
        />
      </TouchableOpacity>
    </View>
  );
});

export default Header;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
});
