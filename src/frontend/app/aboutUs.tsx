import React from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";

export default function AboutUs() {
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();

  const iconColor = isDark ? "#F0E6D3" : "#1A2E1A";

  return (
    <ScrollView
      contentContainerStyle={[styles.container, themeStyles.bg]}
      showsVerticalScrollIndicator={false}
    >
      {/* Botão de Voltar Customizado */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (router.canGoBack && router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color={iconColor} />
        <Text style={[styles.backText, themeStyles.text]}>Voltar</Text>
      </TouchableOpacity>

      {/* Cabeçalho da Tela */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, themeStyles.text]}>Sobre Nós</Text>
        <Text style={[styles.subtitle, themeStyles.subText]}>
          Conheça a nossa história e o nosso propósito.
        </Text>
      </View>

      {/* Seções de Conteúdo */}
      <View style={[styles.card, themeStyles.card, themeStyles.border]}>
        <Text style={[styles.cardTitle, themeStyles.text]}>Nossa Missão</Text>
        <Text style={[styles.cardBody, themeStyles.subText]}>
          Conectar os brasileiros ao comércio local através de uma plataforma
          simples e com a nossa cara, ajudando você a se informar e a economizar
          nas compras do dia a dia.
        </Text>
      </View>

      <View style={[styles.card, themeStyles.card, themeStyles.border]}>
        <Text style={[styles.cardTitle, themeStyles.text]}>Nossos Valores</Text>

        <View style={styles.valueItem}>
          <Ionicons name="checkmark-circle-outline" size={20} color={accent} />
          <Text style={[styles.valueText, themeStyles.text]}>
            <Text style={[styles.valueBold, themeStyles.text]}>
              Transparência:{" "}
            </Text>
            Clareza em todas as informações e ofertas.
          </Text>
        </View>

        <View style={styles.valueItem}>
          <Ionicons name="leaf-outline" size={20} color={accent} />
          <Text style={[styles.valueText, themeStyles.text]}>
            <Text style={[styles.valueBold, themeStyles.text]}>Ética: </Text>
            Compromisso absoluto com o respeito e o usuário.
          </Text>
        </View>

        <View style={styles.valueItem}>
          <Ionicons name="people-outline" size={20} color={accent} />
          <Text style={[styles.valueText, themeStyles.text]}>
            <Text style={[styles.valueBold, themeStyles.text]}>
              Veracidade:{" "}
            </Text>
            Informações reais e confiáveis sobre o seu entorno.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  valueBold: {
    fontWeight: "bold",
  },
  valueText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
