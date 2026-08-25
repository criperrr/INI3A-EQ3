import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";

const LOGO_DARK = require("../components/images/logo-darkmode.png");
const LOGO_LIGHT = require("../components/images/logo-presco.png");

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();

  const handleOpenGithub = () => {
    Linking.openURL("https://github.com/criperrr/INI3A-EQ3");
  };

  const handleOpenPrivacy = () => {
    Linking.openURL("https://presco.app/privacy");
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          themeStyles.headerBg,
          themeStyles.border,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, themeStyles.inputBg]}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? "#F5F5F5" : "#1A1A1A"}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, themeStyles.text]} numberOfLines={1}>
            {t("about.title")}
          </Text>
          <Text style={[styles.headerSubtitle, themeStyles.subText]} numberOfLines={1}>
            {t("about.subtitle")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero Card */}
        <View
          style={[
            styles.heroCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <Image
            source={isDark ? LOGO_DARK : LOGO_LIGHT}
            style={styles.heroLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />
          <Text style={[styles.heroTitle, themeStyles.text]}>PResco</Text>
          <Text style={[styles.heroTagline, themeStyles.subText]}>
            {t("about.tagline")}
          </Text>

          <View style={[styles.versionPill, { backgroundColor: accent + "20" }]}>
            <Ionicons name="git-branch-outline" size={14} color={accent} />
            <Text style={[styles.versionText, { color: accent }]} numberOfLines={1}>
              {t("about.versionInfo")}
            </Text>
          </View>
        </View>

        {/* Mission Card */}
        <View
          style={[
            styles.sectionCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.cardIconBox,
                { backgroundColor: accent + "20" },
              ]}
            >
              <Ionicons name="sparkles" size={20} color={accent} />
            </View>
            <Text style={[styles.cardTitle, themeStyles.text]} numberOfLines={1}>
              {t("about.missionTitle")}
            </Text>
          </View>
          <Text style={[styles.cardBodyText, themeStyles.subText]}>
            {t("about.missionDescription")}
          </Text>
        </View>

        {/* How It Works Pills */}
        <View
          style={[
            styles.sectionCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.cardIconBox,
                { backgroundColor: accent + "20" },
              ]}
            >
              <Ionicons name="infinite-outline" size={20} color={accent} />
            </View>
            <Text style={[styles.cardTitle, themeStyles.text]} numberOfLines={1}>
              {t("about.howItWorksTitle")}
            </Text>
          </View>
          <Text style={[styles.cardBodyText, themeStyles.subText]}>
            {t("about.howItWorksDescription")}
          </Text>

          <View style={styles.stepsRow}>
            <View style={[styles.stepItem, themeStyles.inputBg]}>
              <Ionicons name="barcode-outline" size={22} color={accent} />
              <Text style={[styles.stepLabel, themeStyles.text]} numberOfLines={2}>{t("about.scanStep")}</Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={themeStyles.subText.color}
            />
            <View style={[styles.stepItem, themeStyles.inputBg]}>
              <Ionicons name="trending-up-outline" size={22} color={accent} />
              <Text style={[styles.stepLabel, themeStyles.text]} numberOfLines={1}>+15 XP</Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={themeStyles.subText.color}
            />
            <View style={[styles.stepItem, themeStyles.inputBg]}>
              <Ionicons name="wallet-outline" size={22} color={accent} />
              <Text style={[styles.stepLabel, themeStyles.text]} numberOfLines={2}>{t("about.saveStep")}</Text>
            </View>
          </View>
        </View>

        {/* Open Data & Tech Stack */}
        <View
          style={[
            styles.sectionCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.cardIconBox,
                { backgroundColor: accent + "20" },
              ]}
            >
              <Ionicons name="code-slash-outline" size={20} color={accent} />
            </View>
            <Text style={[styles.cardTitle, themeStyles.text]}>
              {t("about.openDataTitle")}
            </Text>
          </View>
          <Text style={[styles.cardBodyText, themeStyles.subText]}>
            {t("about.openDataDescription")}
          </Text>

          <View style={styles.techTagsContainer}>
            {["React Native", "Expo SDK 54", "PostGIS", "Drizzle ORM", "Redis", "OpenFoodFacts"].map(
              (tag) => (
                <View
                  key={tag}
                  style={[
                    styles.techTag,
                    themeStyles.inputBg,
                    { borderColor: accent + "30" },
                  ]}
                >
                  <Text style={[styles.techTagText, themeStyles.text]}>
                    {tag}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Links & Repository Card */}
        <View
          style={[
            styles.sectionCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <TouchableOpacity
            style={[styles.linkRow, themeStyles.border]}
            activeOpacity={0.7}
            onPress={handleOpenGithub}
          >
            <View style={styles.linkLeft}>
              <Ionicons
                name="logo-github"
                size={22}
                color={isDark ? "#F5F5F5" : "#1A1A1A"}
              />
              <Text style={[styles.linkText, themeStyles.text]}>
                {t("about.githubRepo")}
              </Text>
            </View>
            <Ionicons
              name="open-outline"
              size={18}
              color={themeStyles.subText.color}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            activeOpacity={0.7}
            onPress={handleOpenPrivacy}
          >
            <View style={styles.linkLeft}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={accent}
              />
              <Text style={[styles.linkText, themeStyles.text]}>
                {t("about.privacyPolicy")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={themeStyles.subText.color}
            />
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View style={styles.footerInfo}>
          <Text style={[styles.footerText, themeStyles.subText]}>
            {t("about.buildInfo")}
          </Text>
          <Text style={[styles.creditsText, themeStyles.subText]}>
            {t("about.creditsDescription")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBox: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroLogo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  versionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardBodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  stepItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  techTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  techTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  techTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  footerInfo: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  creditsText: {
    fontSize: 11,
    textAlign: "center",
  },
});
