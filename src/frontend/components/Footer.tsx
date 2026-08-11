import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent"; // Importação do tema

const COLORS = {
  white: "#FFFFFF",
  gray: "#8E8E93",
  centerDarkBg: "#2C2C2E",
};

export type TabKey = "home" | "search" | "registerProduct" | "map" | "profile";

interface FooterProps {
  activeTab?: TabKey;
}

interface TabConfig {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
  isCenter?: boolean;
}

const NAV_TABS: TabConfig[] = [
  { key: "home", icon: "home-outline", activeIcon: "home", route: "/" },
  {
    key: "search",
    icon: "search-outline",
    activeIcon: "search",
    route: "/search",
  },
  {
    key: "registerProduct",
    icon: "add",
    activeIcon: "add",
    route: "/scannerProduct",
    isCenter: true,
  },
  { key: "map", icon: "map-outline", activeIcon: "map", route: "/map" },
  {
    key: "profile",
    icon: "person-outline",
    activeIcon: "person",
    route: "/profile",
  },
];

export default function Footer({ activeTab }: FooterProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark, accent } = useTheme();

  const dynamicPaddingBottom = insets.bottom > 0 ? insets.bottom : 12;
  const dynamicHeight = 60 + dynamicPaddingBottom;

  return (
    <View
      style={[
        styles.container,
        themeStyles.headerBg,
        themeStyles.border,
        { height: dynamicHeight, paddingBottom: dynamicPaddingBottom },
      ]}
    >
      {NAV_TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.centerItem}
              activeOpacity={0.8}
              onPress={() => router.replace(tab.route as any)}
            >
              <View
                style={[
                  styles.centerCircle,
                  isActive
                    ? { backgroundColor: accent }
                    : isDark
                      ? { backgroundColor: "#374151" }
                      : { backgroundColor: COLORS.centerDarkBg },
                ]}
              >
                <Ionicons name={tab.icon} size={32} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace(tab.route as any)}
          >
            {isActive ? (
              <View style={[styles.activeCircle, { backgroundColor: accent }]}>
                <Ionicons
                  name={tab.activeIcon}
                  size={24}
                  color={COLORS.white}
                />
              </View>
            ) : (
              <Ionicons
                name={tab.icon}
                size={26}
                color={isDark ? "#9CA3AF" : COLORS.gray}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },
  activeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  centerItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  centerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -18 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  centerCircleActive: { backgroundColor: "#2E7D32" },
});
