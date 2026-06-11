// app/_layout.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, View, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, usePathname, router } from "expo-router";
import { ThemeProvider, useTheme } from "../content/themeContent";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer, { TabKey } from "../components/Footer";
import Sidebar from "../components/Sidebar";

// Telas que não precisam de autenticação
const PUBLIC_ROUTES = ["/login", "/registerUser"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const { themeStyles } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, pathname]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, themeStyles.bg]}>
        <ActivityIndicator size="large" color="#0062CC" />
      </View>
    );
  }

  return <>{children}</>;
}

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

  const isFullscreenRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/registerUser");

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {!isFullscreenRoute && (
        <>
          <Header
            onPressMenu={() => setIsMenuOpen(true)}
            onPressSettings={() => router.push("/settings")}
          />
          <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
      )}

      <View style={styles.contentWrapper}>
        <AuthGuard>
          <Slot />
        </AuthGuard>
      </View>

      {!isFullscreenRoute && <Footer activeTab={getActiveTab()} />}
    </View>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LayoutContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
