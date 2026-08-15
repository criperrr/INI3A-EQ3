// app/_layout.tsx
import React, { useState } from "react";
import { StyleSheet, View, StatusBar, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, usePathname, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../content/themeContent";
import { AuthProvider } from "../content/authContext";
import Header from "../components/Header";
import Footer, { TabKey } from "../components/Footer";
import Sidebar from "../components/Sidebar";

function LayoutContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isDark, themeStyles } = useTheme();

  const getActiveTab = (): TabKey => {
    if (!pathname) return "home";
    if (pathname === "/") return "home";
    if (pathname.includes("/map")) return "map";
    if (pathname.includes("/scannerProduct")) return "registerProduct";
    if (pathname.includes("/search")) return "search";
    if (pathname.includes("/profile")) return "profile";
    return "home";
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
      <View style={styles.contentWrapper}>
        <Stack screenOptions={{ 
          headerShown: false, 
          gestureEnabled: Platform.OS !== 'web', 
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          fullScreenGestureEnabled: true
        }} />
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
          <AuthProvider>
            <LayoutContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
});
