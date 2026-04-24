import { View, StyleSheet, Text , TouchableOpacity, ScrollView  } from "react-native";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import React from "react";

export default function Index() {
  return (
      <View style={styles.container}>
        <Header menu profile cart sideBar />

        <ScrollView contentContainerStyle={styles.content}>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Olá, Usuario!</Text>
            <Text style={styles.subtitle}>O que procura hoje?</Text>
          </View>

          {/* Grid de Botões */}
          <View style={styles.grid}>

            {/* Botão Principal*/}
            <TouchableOpacity style={[styles.card, styles.primaryCard]} activeOpacity={0.8}>
              <Text style={styles.cardTitleWhite}>Explorar Produtos</Text>
              <Text style={styles.cardSubtitleWhite}>Acesse nosso catálogo completo</Text>
            </TouchableOpacity>

            {/* Botão   */}
            <TouchableOpacity style={[styles.card, styles.gamificationCard]} activeOpacity={0.8}>
              <Text style={styles.cardTitleDark}>Suas Recompensas</Text>
              <Text style={styles.cardSubtitleDark}>Você acumulou 500 XP!</Text>
            </TouchableOpacity>

            {/* Linha com dois botões menores lado a lado */}
            <View style={styles.row}>
              {/* Botão Secundário - Azul Escuro com acento Ciano */}
              <TouchableOpacity style={[styles.smallCard, styles.secondaryCard]} activeOpacity={0.8}>
                <Text style={styles.smallCardText}>Histórico</Text>
                <View style={styles.accentLine} />
              </TouchableOpacity>

              {/* Botão Secundário - Azul Escuro com acento Ciano */}
              <TouchableOpacity style={[styles.smallCard, styles.secondaryCard]} activeOpacity={0.8}>
                <Text style={styles.smallCardText}>Suporte</Text>
                <View style={styles.accentLine} />
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>

        <Footer />
      </View>
  );
}

const COLORS = {
  yellow: "#FFC107",      // Gamificação, alertas, calor
  beige: "#DDD6C4",       // Fundo de página, neutralidade
  darkBlue: "#273462",    // Textos, sofisticação, fundos de contraste
  vibrantBlue: "#0062CC", // Botões principais, destaques
  cyan: "#38BDF8",        // Detalhes secundários, acentos
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.beige, // Fundo neutro e calmo conforme a paleta
  },
  content: {
    flexGrow: 1,
    padding: 24, // Espaçamento generoso para respiro visual (design moderno)
  },
  headerSection: {
    marginBottom: 32,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.darkBlue, // Contraste forte e sofisticado para o texto
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.darkBlue,
    opacity: 0.7, // Deixa o subtítulo um pouco mais suave
  },
  grid: {
    width: "100%",
  },
  card: {
    width: "100%",
    padding: 24,
    borderRadius: 16, // Bordas arredondadas são essenciais no design moderno
    marginBottom: 16,
    // Sombras para dar profundidade (funciona em iOS e Android)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: COLORS.vibrantBlue, // Foco principal da interface
  },
  gamificationCard: {
    backgroundColor: COLORS.yellow, // Alerta e gamificação (XP)
  },
  cardTitleWhite: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardSubtitleWhite: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
  },
  cardTitleDark: {
    color: COLORS.darkBlue,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardSubtitleDark: {
    color: COLORS.darkBlue,
    fontSize: 14,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between", // Separa os dois botões menores
    marginTop: 8,
  },
  smallCard: {
    width: "48%", // Ocupa quase metade da tela, deixando um espaço no meio
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryCard: {
    backgroundColor: COLORS.darkBlue, // Fundo escuro tecnológico
  },
  smallCardText: {
    color: COLORS.beige,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  accentLine: {
    width: 30,
    height: 4,
    backgroundColor: COLORS.cyan, // Ciano usado como detalhe secundário/acento
    borderRadius: 2,
  },
});
