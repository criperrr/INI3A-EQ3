import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  darkBlue: "#273462",
  cyan: "rgba(56, 189, 248, 0.4)",
};

export interface PossibleHeaderItems {
  title?: string;
  menu?: boolean;
  profile?: boolean;
  cart?: boolean;
  sideBar?: boolean;
}

export default function Header({ title, menu, profile, cart, sideBar }: PossibleHeaderItems) {
  const ICON_SIZE = 26;

  return (
    <BlurView intensity={40} tint="light" style={styles.blurContainer}>
      <View style={styles.container}>

        {/* Lado Esquerdo */}
        <View style={styles.sideBarContainer}>
          {sideBar && (
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="menu-outline" size={ICON_SIZE} color={COLORS.darkBlue} />
            </TouchableOpacity>
          )}
        </View>

        {/* Centro - Título */}
        {title && <Text style={styles.title}>{title}</Text>}

        {/* Lado Direito - Ações */}
        <View style={styles.itemsContainer}>
          {cart && (
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="cart-outline" size={ICON_SIZE} color={COLORS.darkBlue} />
            </TouchableOpacity>
          )}
          {profile && (
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="person-outline" size={ICON_SIZE} color={COLORS.darkBlue} />
            </TouchableOpacity>
          )}
          {menu && (
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={ICON_SIZE} color={COLORS.darkBlue} />
            </TouchableOpacity>
          )}
        </View>

      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: "absolute",
    top: 40, // Afastado do topo para não conflitar com a barra de status do celular
    left: 16,
    right: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    zIndex: 10,
  },
  container: {
    height: 60,
    flexDirection: "row", // Facilita o alinhamento de itens esq/centro/dir
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)", // Leve clareamento para destacar o vidro
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cyan,
  },
  title: {
    color: COLORS.darkBlue,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sideBarContainer: {
    position: "absolute",
    left: 16,
    justifyContent: "center",
  },
  itemsContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});