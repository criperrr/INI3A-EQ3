import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Index() {
  return (
    <View style={styles.container}>
      <Header menu profile cart sideBar />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho e Busca */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>O preço justo no{"\n"}comércio do seu bairro.</Text>

          <View style={styles.searchBarSkeleton}>
            <Text style={styles.searchTextSkeleton}>Buscar tomate, leite, fralda...</Text>
            <View style={styles.searchButtonSkeleton} />
          </View>
        </View>

        {/* Destaque da Comunidade */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Oferta Validada</Text>
          <TouchableOpacity style={[styles.card, styles.primaryCard]} activeOpacity={0.9}>
            <View style={styles.placeholderImage} />
            <Text style={styles.cardTitleWhite}>Tomate Carmem (1kg)</Text>
            <Text style={styles.cardSubtitleWhite}>Preço validado por 98% da comunidade local e aprovado pelo filtro estatístico.</Text>
          </TouchableOpacity>
        </View>

        {/* Feed de Atividades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atualizações na Região (Raio 5km)</Text>
          <View style={styles.listContainer}>

            {/* Item Validado */}
            <View style={styles.listItem}>
              <View style={styles.avatarSkeleton} />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listItemTitle}>Leite Integral (1L) - R$ 4,89</Text>
                <Text style={styles.listItemSubtitle}>Confirmado há 10 min por João (Nível 3)</Text>
              </View>
            </View>

            {/* Item em Análise */}
            <View style={styles.listItem}>
              <View style={[styles.avatarSkeleton, { backgroundColor: COLORS.yellow }]} />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listItemTitle}>Óleo de Soja (900ml) - Em Análise</Text>
                <Text style={styles.listItemSubtitle}>Enviado para quarentena há 25 min.</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Status e Gamificação */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.card, styles.profileCard]} activeOpacity={0.9}>
            <Text style={styles.cardTitleDark}>Sua Reputação</Text>
            <Text style={styles.cardSubtitleDark}>Você tem 350 XP. Faltam 150 pontos para desbloquear a auditoria de preços em Quarentena!</Text>
            <View style={styles.progressBarSkeleton}>
              <View style={styles.progressFillSkeleton} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Navegação por Categorias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navegar por Categorias</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.smallCard, styles.secondaryCard]} activeOpacity={0.8}>
              <Text style={styles.smallCardText}>Hortifrúti</Text>
              <View style={styles.accentLine} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallCard, styles.secondaryCard]} activeOpacity={0.8}>
              <Text style={styles.smallCardText}>Padaria</Text>
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
  yellow: "#FFC107",
  beige: "#DDD6C4",
  darkBlue: "#273462",
  vibrantBlue: "#0062CC",
  cyan: "#38BDF8",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.beige,
  },
  content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 120,
      paddingBottom: 100,
    },

  // Busca
  heroSection: {
    marginBottom: 30,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.darkBlue,
    marginBottom: 20,
  },
  searchBarSkeleton: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchTextSkeleton: {
    color: "#A0A0A0",
    marginLeft: 15,
  },
  searchButtonSkeleton: {
    backgroundColor: COLORS.vibrantBlue,
    width: 80,
    height: 35,
    borderRadius: 20,
  },

  // Layout Base
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.darkBlue,
    marginBottom: 12,
  },

  // Cards
  card: {
    width: "100%",
    padding: 24,
    borderRadius: 20,
    shadowColor: COLORS.darkBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: COLORS.darkBlue,
  },
  profileCard: {
    backgroundColor: COLORS.yellow,
  },
  placeholderImage: {
    width: "100%",
    height: 150,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginBottom: 15,
  },
  cardTitleWhite: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardSubtitleWhite: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  cardTitleDark: {
    color: COLORS.darkBlue,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardSubtitleDark: {
    color: COLORS.darkBlue,
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },

  // Feed de Atividades
  listContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatarSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.beige,
    marginRight: 12,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemTitle: {
    color: COLORS.darkBlue,
    fontWeight: "bold",
    fontSize: 14,
  },
  listItemSubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },

  // Grid de Categorias
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  smallCard: {
    width: "48%",
    padding: 20,
    borderRadius: 16,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: COLORS.darkBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryCard: {
    backgroundColor: COLORS.white,
  },
  smallCardText: {
    color: COLORS.darkBlue,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  accentLine: {
    width: 30,
    height: 4,
    backgroundColor: COLORS.vibrantBlue,
    borderRadius: 2,
  },

  // Barras de Progresso
  progressBarSkeleton: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    marginTop: 15,
  },
  progressFillSkeleton: {
    width: "60%",
    height: "100%",
    backgroundColor: COLORS.darkBlue,
    borderRadius: 4,
  }
});