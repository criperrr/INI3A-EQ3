// app/_layout.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Animated, Platform, StyleSheet, View, StatusBar, AppState, LogBox } from "react-native";

LogBox.ignoreAllLogs(true);
import { SafeAreaProvider } from "react-native-safe-area-context";
import { usePathname, router } from "expo-router";
import { Stack as JsStack } from "expo-router/js-stack";
import {
  type StackCardStyleInterpolator,
  type StackNavigationOptions,
  type TransitionPreset,
} from "expo-router/build/react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { ThemeProvider, useTheme } from "../theme";
import { I18nProvider } from "../content/i18nContext";
import { AuthProvider } from "../content/authContext";
import { TabNavigationProvider, useTabNavigation } from "../content/tabNavigationContext";
import { AppAlertProvider } from "../components/AppAlertProvider";
import Header from "../components/Header";
import Footer, { TabKey } from "../components/Footer";
import Sidebar from "../components/Sidebar";
import SwipeTabNavigator from "../components/SwipeTabNavigator";

const MAIN_TAB_NAMES = new Set(["index", "search", "scannerProduct", "map", "profile"]);
const UTILITY_ROUTES = new Set(["/cart", "/settings", "/about", "/help"]);

const INSTANT_SPEC: TransitionPreset["transitionSpec"]["open"] = {
  animation: "timing",
  config: {
    duration: 0,
  },
};

const instantTabInterpolator: StackCardStyleInterpolator = () => ({
  cardStyle: {
    opacity: 1,
  },
});

const FAST_FADE_SPEC: TransitionPreset["transitionSpec"]["open"] = {
  animation: "timing",
  config: {
    duration: 90,
  },
};

const hybridFadeAndEdgeSwipeInterpolator: StackCardStyleInterpolator = ({
  current,
  inverted,
  closing,
  swiping,
  layouts: { screen },
}) => {
  const isSliding = Animated.add(swiping, closing).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const slideX = Animated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
      extrapolate: "clamp",
    }),
    inverted
  );

  const translateX = Animated.multiply(isSliding, slideX);

  const notSliding = isSliding.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // 1 when swiping/closing (opaque slide), current.progress when opening via tap (90ms fade)
  const opacity = Animated.add(
    isSliding,
    Animated.multiply(notSliding, current.progress)
  );

  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.08],
    extrapolate: "clamp",
  });

  return {
    cardStyle: {
      opacity,
      transform: [{ translateX }],
    },
    overlayStyle: {
      opacity: overlayOpacity,
    },
  };
};

function LayoutContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isDark, themeStyles, tokens } = useTheme();
  const { semantic } = tokens;
  const { getTabIndex } = useTabNavigation();
  const isMainTab = getTabIndex(pathname) !== -1;

  // Libera buffers de bitmap decodificados em RAM nativa quando o app vai para segundo plano do celular
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        Image.clearMemoryCache().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  const getActiveTab = (): TabKey | undefined => {
    if (!pathname || pathname === "/") return "home";
    if (pathname === "/map") return "map";
    if (pathname === "/scannerProduct") return "registerProduct";
    if (pathname === "/search") return "search";
    if (pathname === "/profile") return "profile";
    return undefined;
  };

  // Hide header/footer on auth screens
  const isAuthScreen = pathname === "/login" || pathname === "/registerUser";

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const handleOpenMenu = useCallback(() => setIsMenuOpen(true), []);
  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), []);
  const handlePressSettings = useCallback(() => {
    if (pathnameRef.current === "/settings") return;
    if (UTILITY_ROUTES.has(pathnameRef.current)) {
      router.replace("/settings");
    } else {
      router.push("/settings");
    }
  }, []);

  const stackScreenOptions = useCallback(
    ({ route }: { route: { name: string } }): StackNavigationOptions => {
      const isTabRoute = MAIN_TAB_NAMES.has(route.name);
      if (isTabRoute) {
        return {
          headerShown: false,
          gestureEnabled: false,
          transitionSpec: {
            open: INSTANT_SPEC,
            close: INSTANT_SPEC,
          },
          cardStyleInterpolator: instantTabInterpolator,
          cardStyle: { backgroundColor: semantic.colors.surface.background },
        };
      }

      return {
        headerShown: false,
        gestureEnabled: Platform.OS === "ios",
        gestureDirection: "horizontal",
        transitionSpec: {
          open: FAST_FADE_SPEC,
          close: FAST_FADE_SPEC,
        },
        cardStyleInterpolator: hybridFadeAndEdgeSwipeInterpolator,
        cardStyle: { backgroundColor: semantic.colors.surface.background },
      };
    },
    [semantic.colors.surface.background]
  );

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {!isAuthScreen && (
        <Header
          onPressMenu={handleOpenMenu}
          onPressSettings={handlePressSettings}
        />
      )}
      {!isAuthScreen && (
        <Sidebar isOpen={isMenuOpen} onClose={handleCloseMenu} />
      )}
      <View style={[styles.contentWrapper, { backgroundColor: semantic.colors.surface.background }]}>
        <SwipeTabNavigator>
          <JsStack detachInactiveScreens={true} screenOptions={stackScreenOptions}>
            <JsStack.Screen name="index" options={{ gestureEnabled: false }} />
            <JsStack.Screen name="search" options={{ gestureEnabled: false }} />
            <JsStack.Screen name="map" options={{ gestureEnabled: false }} />
            <JsStack.Screen name="profile" options={{ gestureEnabled: false }} />
            <JsStack.Screen name="settings" />
            <JsStack.Screen name="productDetails" />
            <JsStack.Screen name="cart" />
            <JsStack.Screen name="help" />
            <JsStack.Screen name="about" />
            <JsStack.Screen name="login" />
            <JsStack.Screen name="registerUser" />
            <JsStack.Screen name="scannerProduct" options={{ gestureEnabled: false }} />
            <JsStack.Screen name="manualEanSearch" />
            <JsStack.Screen name="scannerConfirmation" />
            <JsStack.Screen name="registerProduct" />
            <JsStack.Screen name="customRegisterProduct" />
            <JsStack.Screen name="adminModeration" />
          </JsStack>
        </SwipeTabNavigator>
      </View>
      {!isAuthScreen && <Footer activeTab={getActiveTab()} />}
    </View>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <AppAlertProvider>
              <AuthProvider>
                <TabNavigationProvider>
                  <LayoutContent />
                </TabNavigationProvider>
              </AuthProvider>
            </AppAlertProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
});
