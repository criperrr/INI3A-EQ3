import React, { memo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import { useTabNavigation } from "../content/tabNavigationContext";

const { width, height } = Dimensions.get("window");

const COLORS = {
  overlay: "rgba(0, 0, 0, 0.45)",
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const LOGO_DARK = require("./images/logo-darkmode.png");
const LOGO_LIGHT = require("./images/logo-presco.png");

const SidebarHeader = memo(function SidebarHeader({
  themeStyles,
  isDark,
  onClose,
}: {
  themeStyles: any;
  isDark: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <View style={[styles.headerContainer, themeStyles.border]}>
      <View style={styles.brandRow}>
        <Image
          source={isDark ? LOGO_DARK : LOGO_LIGHT}
          style={styles.brandLogo}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
        />
        <View style={styles.brandInfo}>
          <Text style={[styles.brandTitle, themeStyles.text]}>PResco</Text>
          <Text style={[styles.brandSubtitle, themeStyles.subText]}>
            {t("home.welcomeSubtitle")}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.closeButton, themeStyles.inputBg]}
        activeOpacity={0.7}
        onPress={onClose}
      >
        <Ionicons
          name="close"
          size={20}
          color={isDark ? "#E5E7EB" : "#374151"}
        />
      </TouchableOpacity>
    </View>
  );
});

const NavigationLinks = memo(function NavigationLinks({
  themeStyles,
  router,
  pathname,
  onClose,
  menuLinks,
}: {
  themeStyles: any;
  router: any;
  pathname: string;
  onClose: () => void;
  menuLinks: MenuItem[];
}) {
  const { accent, isDark } = useTheme();
  const { navigateToTab } = useTabNavigation();

  return (
    <View style={styles.linksContainer}>
      {menuLinks.map((link) => {
        const isActive =
          pathname === link.route ||
          (link.route.startsWith("/?") && pathname === "/");

        return (
          <TouchableOpacity
            key={link.id}
            style={[
              styles.linkItem,
              isActive && [
                styles.linkItemActive,
                { backgroundColor: accent + "18" },
              ],
            ]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              if (link.id === "home" || link.route === "/") {
                navigateToTab("/", "left", true);
              } else if (link.route.startsWith("/?view=")) {
                const viewParam = link.route.split("view=")[1];
                router.push({ pathname: "/", params: { view: viewParam } });
              } else {
                router.push(link.route as any);
              }
            }}
          >
            <View
              style={[
                styles.linkIconBox,
                themeStyles.inputBg,
                isActive && {
                  backgroundColor: accent + "25",
                },
              ]}
            >
              <Ionicons
                name={link.icon}
                size={20}
                color={isActive ? accent : isDark ? "#D1D5DB" : "#4B5563"}
              />
            </View>
            <Text
              style={[
                styles.linkText,
                themeStyles.text,
                isActive && { color: accent, fontWeight: "700" },
              ]}
            >
              {link.label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isActive ? accent : isDark ? "#6B7280" : "#9CA3AF"}
              style={styles.chevron}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const UserProfileCard = memo(function UserProfileCard({
  themeStyles,
  onClose,
  router,
}: {
  themeStyles: any;
  onClose: () => void;
  router: any;
}) {
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { accent, isDark } = useTheme();
  const { t } = useI18n();

  const displayName = profile?.name || user?.name || t("common.guest");
  const userInitial = displayName.charAt(0).toUpperCase();
  const userPoints = profile?.points ?? user?.points ?? 0;
  const userLevel = profile?.level ?? user?.level ?? 1;

  const handleProfilePress = () => {
    onClose();
    if (isAuthenticated) {
      router.push("/profile");
    } else {
      router.push("/login");
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.userCard,
        themeStyles.card,
        themeStyles.border,
        { borderColor: isDark ? "#2C2C2C" : "#E5E7EB" },
      ]}
      activeOpacity={0.8}
      onPress={handleProfilePress}
    >
      <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
        <Text style={styles.avatarText}>{userInitial}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text
            style={[styles.userName, themeStyles.text]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: accent + "25" }]}>
              <Text style={[styles.adminBadgeText, { color: accent }]}>
                {t("profile.adminBadge")}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.userStatus, themeStyles.subText]}>
          {isAuthenticated
            ? `${t("profile.level")} ${userLevel} • ${userPoints} XP`
            : t("auth.signIn")}
        </Text>
      </View>
      <Ionicons
        name="arrow-forward-circle-outline"
        size={22}
        color={accent}
      />
    </TouchableOpacity>
  );
});

const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark } = useTheme();
  const { t } = useI18n();

  const menuLinks: MenuItem[] = [
    {
      id: "home",
      label: t("navigation.home"),
      icon: "home-outline",
      route: "/",
    },
    {
      id: "products",
      label: t("navigation.products"),
      icon: "cube-outline",
      route: "/?view=products",
    },
    {
      id: "markets",
      label: t("navigation.map"),
      icon: "location-outline",
      route: "/map",
    },
    {
      id: "scanner",
      label: t("navigation.scanner"),
      icon: "barcode-outline",
      route: "/scannerProduct",
    },
    {
      id: "search",
      label: t("navigation.search"),
      icon: "search-outline",
      route: "/search",
    },
    {
      id: "account",
      label: t("navigation.profile"),
      icon: "person-outline",
      route: "/profile",
    },
    {
      id: "settings",
      label: t("settings.title"),
      icon: "settings-outline",
      route: "/settings",
    },
    {
      id: "help",
      label: t("navigation.help"),
      icon: "help-circle-outline",
      route: "/help",
    },
    {
      id: "about",
      label: t("navigation.about"),
      icon: "information-circle-outline",
      route: "/about",
    },
  ];

  if (!isOpen) return null;

  const panelTopPadding = Math.max(insets.top + 8, 36);
  const panelBottomPadding = Math.max(insets.bottom + 16, 24);

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.blurTouch}
        activeOpacity={1}
        onPress={onClose}
      />

      <View
        style={[
          styles.menuPanel,
          themeStyles.card,
          themeStyles.border,
          {
            paddingTop: panelTopPadding,
            paddingBottom: panelBottomPadding,
          },
        ]}
      >
        <SidebarHeader
          themeStyles={themeStyles}
          isDark={isDark}
          onClose={onClose}
        />

        <NavigationLinks
          themeStyles={themeStyles}
          router={router}
          pathname={pathname}
          onClose={onClose}
          menuLinks={menuLinks}
        />

        <View style={styles.footerSection}>
          <UserProfileCard
            themeStyles={themeStyles}
            onClose={onClose}
            router={router}
          />
        </View>
      </View>
    </View>
  );
});

export default Sidebar;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    flexDirection: "row",
    zIndex: 100,
  },
  blurTouch: {
    position: "absolute",
    width: width,
    height: height,
  },
  menuPanel: {
    width: Math.min(width * 0.8, 330),
    height: "100%",
    paddingHorizontal: 20,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: "space-between",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandLogo: {
    width: 38,
    height: 38,
  },
  brandInfo: {
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  linksContainer: {
    flex: 1,
    paddingTop: 16,
    gap: 6,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  linkItemActive: {
    borderRadius: 14,
  },
  linkIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  footerSection: {
    paddingTop: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    maxWidth: 130,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  userStatus: {
    fontSize: 12,
    marginTop: 2,
  },
});
