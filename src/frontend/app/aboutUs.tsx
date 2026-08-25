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
import { useI18n } from "../content/i18nContext";

export default function AboutUs() {
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();

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
        <Text style={[styles.backText, themeStyles.text]}>{t("common.back")}</Text>
      </TouchableOpacity>

      {/* Cabeçalho da Tela */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, themeStyles.text]} numberOfLines={1}>{t("about.title")}</Text>
        <Text style={[styles.subtitle, themeStyles.subText]} numberOfLines={3}>
          {t("about.subtitle")}
        </Text>
      </View>

      {/* Seções de Conteúdo */}
      <View style={[styles.card, themeStyles.card, themeStyles.border]}>
        <Text style={[styles.cardTitle, themeStyles.text]} numberOfLines={2}>{t("about.missionTitle")}</Text>
        <Text style={[styles.cardBody, themeStyles.subText]}>
          {t("about.missionDescription")}
        </Text>
      </View>

      <View style={[styles.card, themeStyles.card, themeStyles.border]}>
        <Text style={[styles.cardTitle, themeStyles.text]} numberOfLines={2}>{t("about.howItWorksTitle")}</Text>
        <Text style={[styles.cardBody, themeStyles.subText]}>
          {t("about.howItWorksDescription")}
        </Text>
      </View>

      <View style={[styles.card, themeStyles.card, themeStyles.border]}>
        <Text style={[styles.cardTitle, themeStyles.text]} numberOfLines={2}>{t("about.openDataTitle")}</Text>
        <Text style={[styles.cardBody, themeStyles.subText]}>
          {t("about.openDataDescription")}
        </Text>
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
