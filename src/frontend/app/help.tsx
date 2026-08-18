import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";

interface FaqItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  questionKey: any;
  answerKey: any;
}

const FAQ_LIST: FaqItem[] = [
  {
    id: "1",
    icon: "barcode-outline",
    questionKey: "help.faq1Question",
    answerKey: "help.faq1Answer",
  },
  {
    id: "2",
    icon: "trophy-outline",
    questionKey: "help.faq2Question",
    answerKey: "help.faq2Answer",
  },
  {
    id: "3",
    icon: "checkmark-done-circle-outline",
    questionKey: "help.faq3Question",
    answerKey: "help.faq3Answer",
  },
  {
    id: "4",
    icon: "add-circle-outline",
    questionKey: "help.faq4Question",
    answerKey: "help.faq4Answer",
  },
  {
    id: "5",
    icon: "shield-checkmark-outline",
    questionKey: "help.faq5Question",
    answerKey: "help.faq5Answer",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("1");

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_LIST;
    const q = searchQuery.toLowerCase();
    return FAQ_LIST.filter((item) => {
      const question = t(item.questionKey).toLowerCase();
      const answer = t(item.answerKey).toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
  }, [searchQuery, t]);

  const handleContactEmail = () => {
    Linking.openURL("mailto:suporte@presco.app?subject=Suporte%20Presco");
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
          <Text style={[styles.headerTitle, themeStyles.text]}>
            {t("help.title")}
          </Text>
          <Text style={[styles.headerSubtitle, themeStyles.subText]}>
            {t("help.subtitle")}
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
        {/* Search Bar */}
        <View
          style={[
            styles.searchCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={accent}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, themeStyles.text]}
            placeholder={t("help.searchPlaceholder")}
            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={themeStyles.subText.color}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, themeStyles.card, themeStyles.border]}
            activeOpacity={0.8}
            onPress={() => router.push("/scannerProduct")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: accent + "20" }]}>
              <Ionicons name="barcode-outline" size={24} color={accent} />
            </View>
            <Text style={[styles.quickCardTitle, themeStyles.text]}>
              {t("navigation.scanner")}
            </Text>
            <Text style={[styles.quickCardSub, themeStyles.subText]}>
              +15 XP por preço
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, themeStyles.card, themeStyles.border]}
            activeOpacity={0.8}
            onPress={() => router.push("/search")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: accent + "20" }]}>
              <Ionicons name="search-outline" size={24} color={accent} />
            </View>
            <Text style={[styles.quickCardTitle, themeStyles.text]}>
              {t("navigation.search")}
            </Text>
            <Text style={[styles.quickCardSub, themeStyles.subText]}>
              Comparar mercados
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themeStyles.text]}>
            {t("help.faqSectionTitle")}
          </Text>
        </View>

        <View style={styles.faqContainer}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <View
                key={faq.id}
                style={[
                  styles.faqCard,
                  themeStyles.card,
                  themeStyles.border,
                  isExpanded && { borderColor: accent },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleFaq(faq.id)}
                >
                  <View
                    style={[
                      styles.faqIconBox,
                      themeStyles.inputBg,
                      isExpanded && { backgroundColor: accent + "20" },
                    ]}
                  >
                    <Ionicons
                      name={faq.icon}
                      size={20}
                      color={isExpanded ? accent : isDark ? "#D1D5DB" : "#4B5563"}
                    />
                  </View>
                  <Text style={[styles.faqQuestion, themeStyles.text]}>
                    {t(faq.questionKey)}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isExpanded ? accent : themeStyles.subText.color}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.faqAnswerContainer, themeStyles.border]}>
                    <Text style={[styles.faqAnswerText, themeStyles.subText]}>
                      {t(faq.answerKey)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Support Card */}
        <View
          style={[
            styles.supportCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <View
            style={[
              styles.supportIconCircle,
              { backgroundColor: accent + "20" },
            ]}
          >
            <Ionicons name="headset-outline" size={28} color={accent} />
          </View>
          <Text style={[styles.supportTitle, themeStyles.text]}>
            {t("help.supportSectionTitle")}
          </Text>
          <Text style={[styles.supportText, themeStyles.subText]}>
            {t("help.supportEmailText")}
          </Text>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={handleContactEmail}
          >
            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>
              {t("help.contactSupport")}
            </Text>
          </TouchableOpacity>
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
    gap: 18,
  },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  quickCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  faqContainer: {
    gap: 10,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  faqIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 21,
  },
  supportCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  supportIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
  },
  supportText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
