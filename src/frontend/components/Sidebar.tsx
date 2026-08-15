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

const { width, height } = Dimensions.get("window");

const COLORS = {
  overlay: "rgba(0, 0, 0, 0.4)",
};

const MENU_LINKS = [
  { id: "account", label: "Minha Conta", route: "/profile" },
  // Alteração aqui: enviando para a raiz com o parâmetro view
  { id: "markets", label: "Mercados", route: "/?view=markets" },
  { id: "products", label: "Produtos", route: "/?view=products" },
  { id: "settings", label: "Configurações", route: "/settings" },
  { id: "help", label: "Ajuda", route: "/helpUser" },
  { id: "about", label: "Sobre Nós", route: "/aboutUs" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { themeStyles, isDark } = useTheme(); // Consumo do tema

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
}: {
  themeStyles: any;
  router: any;
  onClose: () => void;
}) => (
  <View style={styles.linksContainer}>
    {MENU_LINKS.map((link) => (
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
