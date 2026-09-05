// app/_layout.tsx
import React, { useState } from "react";
import { StyleSheet, View, StatusBar, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, usePathname, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../theme";
import { I18nProvider } from "../content/i18nContext";
import { AuthProvider } from "../content/authContext";
import { TabNavigationProvider, useTabNavigation } from "../content/tabNavigationContext";
import Header from "../components/Header";
import Footer, { TabKey } from "../components/Footer";
import Sidebar from "../components/Sidebar";
import SwipeTabNavigator from "../components/SwipeTabNavigator";

function LayoutContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isDark, themeStyles, tokens } = useTheme();
  const { semantic } = tokens;
  const { getTabIndex } = useTabNavigation();
  const isMainTab = getTabIndex(pathname) !== -1;

  const getActiveTab = (): TabKey | undefined => {
    if (!pathname) return "home";
    if (pathname === "/") return "home";
    if (pathname.includes("/map")) return "map";
    if (pathname.includes("/scannerProduct")) return "registerProduct";
    if (pathname.includes("/search")) return "search";
    if (pathname.includes("/profile")) return "profile";
    return undefined;
  };

  // Hide header/footer on auth screens
  const isAuthScreen = pathname === "/login" || pathname === "/registerUser";

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {!isAuthScreen && (
        <Header
          onPressMenu={() => setIsMenuOpen(true)}
          onPressSettings={() => {
            if (pathname !== "/settings") {
              router.push("/settings");
            }
          }}
        />
      )}
      {!isAuthScreen && (
        <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      )}
      <View style={[styles.contentWrapper, { backgroundColor: semantic.colors.surface.background }]}>
        <SwipeTabNavigator>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: Platform.OS !== "web" && !isMainTab,
              gestureDirection: "horizontal",
              animation: isMainTab
                ? "none"
                : Platform.OS === "ios"
                ? "default"
                : "slide_from_right",
              fullScreenGestureEnabled: false,
              animationDuration: 220,
              contentStyle: { backgroundColor: semantic.colors.surface.background },
            }}
          />
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
            <AuthProvider>
              <TabNavigationProvider>
                <LayoutContent />
              </TabNavigationProvider>
            </AuthProvider>
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
