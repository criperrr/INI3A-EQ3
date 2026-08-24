import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useTabNavigation } from "../content/tabNavigationContext";

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
  const insets = useSafeAreaInsets();
  const { tokens, accent } = useTheme();
  const { semantic } = tokens;
  const { navigateToTab } = useTabNavigation();

  const dynamicPaddingBottom = insets.bottom > 0 ? insets.bottom : semantic.spacing.microGap + 4; // 12
  const dynamicHeight = semantic.spacing.tabBarHeight + dynamicPaddingBottom;

  const handleTabPress = (tab: TabConfig, isActive: boolean) => {
    if (tab.key === "home") {
      navigateToTab("/", "left", true);
      return;
    }
    if (isActive) return;
    navigateToTab(tab.route);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: semantic.colors.surface.footer,
          borderTopColor: semantic.colors.border.header,
          height: dynamicHeight,
          paddingBottom: dynamicPaddingBottom,
          ...semantic.elevation.footer,
        },
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
              onPress={() => handleTabPress(tab, isActive)}
            >
              <View
                style={[
                  styles.centerCircle,
                  {
                    backgroundColor: isActive
                      ? accent
                      : semantic.colors.surface.centerCircle,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={32}
                  color={semantic.colors.icon.inverse}
                />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => handleTabPress(tab, isActive)}
          >
            {isActive ? (
              <View style={[styles.activeCircle, { backgroundColor: accent }]}>
                <Ionicons
                  name={tab.activeIcon}
                  size={24}
                  color={semantic.colors.icon.inverse}
                />
              </View>
            ) : (
              <Ionicons
                name={tab.icon}
                size={26}
                color={semantic.colors.icon.secondary}
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
});
