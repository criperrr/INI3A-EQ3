import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../content/themeContent"; // Importação do tema
import { useI18n } from "../content/i18nContext";

const { width, height } = Dimensions.get("window");

const COLORS = {
  overlay: "rgba(0, 0, 0, 0.4)",
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { themeStyles, isDark } = useTheme(); // Consumo do tema
  const { t } = useI18n();

  const menuLinks = [
    { id: "account", label: t("navigation.profile"), route: "/profile" },
    { id: "markets", label: t("map.title"), route: "/?view=markets" },
    { id: "products", label: t("products.title"), route: "/?view=products" },
    { id: "settings", label: t("settings.title"), route: "/settings" },
    { id: "history", label: t("navigation.history"), route: "/profile" },
    { id: "scanner", label: t("navigation.scanner"), route: "/scannerProduct" },
  ];

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.blurTouch}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={[styles.menuPanel, themeStyles.card]}>
        <SidebarHeader themeStyles={themeStyles} />
        <NavigationLinks
          themeStyles={themeStyles}
          router={router}
          onClose={onClose}
          menuLinks={menuLinks}
        />
        <SidebarDecor isDark={isDark} />
      </View>
    </View>
  );
}

// --- Componentes Internos ---
const SidebarHeader = ({ themeStyles }: { themeStyles: any }) => (
  <View style={styles.treeSection}>
    <View style={styles.ipePlaceholder} />
    <Text style={[styles.treeText, themeStyles.text]}>PResco</Text>
  </View>
);

const NavigationLinks = ({
  themeStyles,
  router,
  onClose,
  menuLinks,
}: {
  themeStyles: any;
  router: any;
  onClose: () => void;
  menuLinks: Array<{ id: string; label: string; route: string }>;
}) => (
  <View style={styles.linksContainer}>
    {menuLinks.map((link) => (
      <TouchableOpacity
        key={link.id}
        style={styles.linkItem}
        activeOpacity={0.7}
        onPress={() => {
          onClose();
          try {
            if (router.canDismiss && router.canDismiss()) {
              router.dismissAll();
            }
          } catch {}
          router.replace(link.route as any);
        }}
      >
        <Text style={[styles.linkText, themeStyles.text]}>{link.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const LOGO_DARK = require("./images/logo-darkmode.png");
const LOGO_LIGHT = require("./images/logo-preta.png");

const SidebarDecor = ({ isDark }: { isDark: boolean }) => (
  <View style={styles.ararinhaContainer}>
    <Image
      source={isDark ? LOGO_DARK : LOGO_LIGHT}
      style={styles.watermarkLogo}
      resizeMode="contain"
    />
  </View>
);

// --- Estilos ---
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
  blurTouch: { position: "absolute", width: width, height: height },
  menuPanel: {
    width: width * 0.72,
    height: "100%",
    paddingTop: 40,
    paddingHorizontal: 24,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  treeSection: { marginBottom: 40, alignItems: "flex-start" },
  ipePlaceholder: {
    width: 130,
    height: 100,
    marginBottom: 8,
    marginLeft: -10,
    backgroundColor: "transparent",
  },
  treeText: { fontSize: 22, fontWeight: "bold" },
  linksContainer: { gap: 20 },
  linkItem: { paddingVertical: 8 },
  linkText: { fontSize: 16, fontWeight: "600" },
  ararinhaContainer: {
    position: "absolute",
    bottom: -20,
    left: -30,
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  watermarkLogo: {
    width: 160,
    height: 160,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
  },
});
