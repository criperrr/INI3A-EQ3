import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  darkBlue: "#273462",
  vibrantBlue: "#0062CC",
  white: "#FFFFFF",
  beige: "#DDD6C4",
  cyan: "#38BDF8",
};

export default function Footer() {
  const ICON_SIZE = 24;

  return (
    <View style={styles.container}>

      {/* Botão Início */}
      <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
        <Ionicons name="home" size={ICON_SIZE} color={COLORS.vibrantBlue} />
        <Text style={[styles.navText, { color: COLORS.vibrantBlue }]}>Início</Text>
      </TouchableOpacity>

      {/* Botão Principal de Ação (Adicionar Preço) */}
      <TouchableOpacity style={styles.mainActionButton} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      {/* Botão Reputação/Gamificação */}
      <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
        <Ionicons name="trophy-outline" size={ICON_SIZE} color={COLORS.beige} />
        <Text style={styles.navText}>Ranking</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.darkBlue,
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80, // Altura fixa confortável
    paddingBottom: 15, // Espaço para a barra de home do iPhone/Android modernos
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginTop: 10,
  },
  navText: {
    color: COLORS.beige,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  // O botão central fica flutuando para dar destaque à ação de cadastrar preço
  mainActionButton: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.vibrantBlue,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30, // Faz o botão "vazar" para fora do footer
    borderWidth: 4,
    borderColor: COLORS.beige, // Cria um anel combinando com o fundo do app
    shadowColor: COLORS.vibrantBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});