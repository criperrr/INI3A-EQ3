import React, { memo, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, Text, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useTabNavigation } from "../content/tabNavigationContext";
import { cartService } from "../services/cartService";

interface HeaderProps {
  onPressMenu?: () => void;
  onPressSettings?: () => void;
}

const LOGO_DARK = require("./images/logo-darkmode.png");
const LOGO_LIGHT = require("./images/logo-presco.png");
const UTILITY_ROUTES = new Set(["/cart", "/settings", "/about", "/help"]);

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
        resizeMode="contain"
        fadeDuration={0}
      />
    </TouchableOpacity>
  );
});

const Header = memo(function Header({ onPressMenu, onPressSettings }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { tokens, isDark, accent } = useTheme();
  const { semantic } = tokens;
  const { navigateToTab } = useTabNavigation();
  const pathname = usePathname();
  const router = useRouter();

  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    cartService.getCartCount().then(setCartCount);
    const unsub = cartService.subscribe((items) => {
      const count = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      setCartCount(count);
    });
    return unsub;
  }, []);

  const isHomeScreen = !pathname || pathname === "/";
  const isCartScreen = pathname === "/cart";
  const isSettingsScreen = pathname === "/settings";
  const hideRightActions = isCartScreen || isSettingsScreen;

  const handleLeftPress = useCallback(() => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    if (isHomeScreen) {
      onPressMenu?.();
    } else {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        navigateToTab("/", "left", true);
      }
    }
  }, [isHomeScreen, onPressMenu, router, navigateToTab]);

  const handleLogoPress = useCallback(() => {
    navigateToTab("/", "left", true);
  }, [navigateToTab]);

  const handleCartPress = useCallback(() => {
    if (pathname === "/cart") return;
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (UTILITY_ROUTES.has(pathname)) {
      router.replace("/cart" as any);
    } else {
      router.push("/cart" as any);
    }
  }, [pathname, router]);

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
        testID="header-left-btn"
        style={[
          styles.iconButton,
          !isHomeScreen && {
            backgroundColor: semantic.colors.surface.card,
            borderRadius: semantic.radius.badge,
            borderWidth: 1,
            borderColor: semantic.colors.border.default,
          },
        ]}
        onPress={handleLeftPress}
        accessibilityRole="button"
        accessibilityLabel={isHomeScreen ? "Abrir menu" : "Voltar"}
      >
        <Ionicons
          name={isHomeScreen ? "menu-outline" : "chevron-back"}
          size={isHomeScreen ? 26 : 24}
          color={semantic.colors.icon.primary}
        />
      </TouchableOpacity>

      <LogoBrand isDark={isDark} onPress={handleLogoPress} />

      <View style={styles.rightButtonsRow}>
        {!hideRightActions ? (
          <TouchableOpacity
            activeOpacity={0.7}
            testID="header-cart-btn"
            style={styles.iconButton}
            onPress={handleCartPress}
            accessibilityRole="button"
            accessibilityLabel="Lista de Compras"
          >
            <Ionicons
              name={cartCount > 0 ? "cart" : "cart-outline"}
              size={24}
              color={cartCount > 0 ? accent : semantic.colors.icon.primary}
            />
            {cartCount > 0 && (
              <View style={[styles.badgeContainer, { backgroundColor: accent }]}>
                <Text style={styles.badgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}

        {!hideRightActions ? (
          <TouchableOpacity
            activeOpacity={0.7}
            testID="header-settings-btn"
            style={styles.iconButton}
            onPress={onPressSettings}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={semantic.colors.icon.primary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>
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
  rightButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
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
