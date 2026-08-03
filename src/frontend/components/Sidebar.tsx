import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { useTheme } from "../content/themeContent"; // Importação do tema

const { width, height } = Dimensions.get("window");

const COLORS = {
  overlay: "rgba(0, 0, 0, 0.4)",
};

const MENU_LINKS = [
  { id: "account", label: "Minha Conta" },
  { id: "settings", label: "Configurações" },
  { id: "help", label: "Ajuda" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { themeStyles } = useTheme(); // Consumo do tema

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
        <NavigationLinks themeStyles={themeStyles} />
        <SidebarDecor />
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

const NavigationLinks = ({ themeStyles }: { themeStyles: any }) => (
  <View style={styles.linksContainer}>
    {MENU_LINKS.map((link) => (
      <TouchableOpacity
        key={link.id}
        style={styles.linkItem}
        activeOpacity={0.7}
      >
        <Text style={[styles.linkText, themeStyles.text]}>{link.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SidebarDecor = () => (
  <View style={styles.ararinhaContainer}>
    <View style={styles.ararinhaPlaceholder}>
      <Text style={styles.ararinhaText}>🦜</Text>
    </View>
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
    bottom: -15,
    left: -20,
    width: 140,
    height: 140,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  ararinhaPlaceholder: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  ararinhaText: { fontSize: 42 },
});
