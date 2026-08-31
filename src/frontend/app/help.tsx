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
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { useI18n, TranslationKey } from "../content/i18nContext";

type FaqCategory =
  | "all"
  | "general"
  | "scanner"
  | "gamification"
  | "curation"
  | "map"
  | "account";

interface FaqItem {
  id: string;
  category: FaqCategory;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeColor?: string;
  questionKey: TranslationKey;
  answerKey: TranslationKey;
}

const CATEGORIES: { id: FaqCategory; labelKey: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "all", labelKey: "help.categoryAll", icon: "list-outline" },
  { id: "general", labelKey: "help.categoryGeneral", icon: "rocket-outline" },
  { id: "scanner", labelKey: "help.categoryScanner", icon: "barcode-outline" },
  { id: "gamification", labelKey: "help.categoryGamification", icon: "trophy-outline" },
  { id: "curation", labelKey: "help.categoryCuration", icon: "shield-checkmark-outline" },
  { id: "map", labelKey: "help.categoryMap", icon: "map-outline" },
  { id: "account", labelKey: "help.categoryAccount", icon: "person-circle-outline" },
];

const FAQ_LIST: FaqItem[] = [
  // 1. Primeiros Passos
  {
    id: "1",
    category: "general",
    icon: "information-circle-outline",
    questionKey: "help.faq1Question",
    answerKey: "help.faq1Answer",
  },
  {
    id: "2",
    category: "general",
    icon: "person-add-outline",
    questionKey: "help.faq2Question",
    answerKey: "help.faq2Answer",
  },
  {
    id: "3",
    category: "general",
    icon: "cloud-offline-outline",
    questionKey: "help.faq3Question",
    answerKey: "help.faq3Answer",
  },

  // 2. Scanner & Preços
  {
    id: "4",
    category: "scanner",
    icon: "barcode-outline",
    badge: "+15 XP",
    badgeColor: "#10B981",
    questionKey: "help.faq4Question",
    answerKey: "help.faq4Answer",
  },
  {
    id: "5",
    category: "scanner",
    icon: "search-circle-outline",
    badge: "+25 XP",
    badgeColor: "#3B82F6",
    questionKey: "help.faq5Question",
    answerKey: "help.faq5Answer",
  },
  {
    id: "6",
    category: "scanner",
    icon: "basket-outline",
    badge: "+25 XP",
    badgeColor: "#3B82F6",
    questionKey: "help.faq6Question",
    answerKey: "help.faq6Answer",
  },
  {
    id: "7",
    category: "scanner",
    icon: "location-outline",
    questionKey: "help.faq7Question",
    answerKey: "help.faq7Answer",
  },
  {
    id: "8",
    category: "scanner",
    icon: "calculator-outline",
    questionKey: "help.faq8Question",
    answerKey: "help.faq8Answer",
  },

  // 3. XP & Loja
  {
    id: "9",
    category: "gamification",
    icon: "trending-up-outline",
    badge: "XP & Níveis",
    badgeColor: "#8B5CF6",
    questionKey: "help.faq9Question",
    answerKey: "help.faq9Answer",
  },
  {
    id: "10",
    category: "gamification",
    icon: "ribbon-outline",
    badge: "15 Insígnias",
    badgeColor: "#F59E0B",
    questionKey: "help.faq10Question",
    answerKey: "help.faq10Answer",
  },
  {
    id: "11",
    category: "gamification",
    icon: "wallet-outline",
    badge: "XP Seguro",
    badgeColor: "#10B981",
    questionKey: "help.faq11Question",
    answerKey: "help.faq11Answer",
  },
  {
    id: "12",
    category: "gamification",
    icon: "shirt-outline",
    badge: "Loja & Itens",
    badgeColor: "#EC4899",
    questionKey: "help.faq12Question",
    answerKey: "help.faq12Answer",
  },

  // 4. Auditoria & Curadoria
  {
    id: "13",
    category: "curation",
    icon: "shield-checkmark-outline",
    badge: "+5 XP",
    badgeColor: "#10B981",
    questionKey: "help.faq13Question",
    answerKey: "help.faq13Answer",
  },
  {
    id: "14",
    category: "curation",
    icon: "flag-outline",
    questionKey: "help.faq14Question",
    answerKey: "help.faq14Answer",
  },
  {
    id: "15",
    category: "curation",
    icon: "pricetag-outline",
    badge: "Melhor Preço",
    badgeColor: "#EF4444",
    questionKey: "help.faq15Question",
    answerKey: "help.faq15Answer",
  },

  // 5. Mapa & Mercados
  {
    id: "16",
    category: "map",
    icon: "navigate-outline",
    badge: "GPS & Rotas",
    badgeColor: "#3B82F6",
    questionKey: "help.faq16Question",
    answerKey: "help.faq16Answer",
  },

  // 6. Conta & App
  {
    id: "17",
    category: "account",
    icon: "swap-horizontal-outline",
    badge: "Backup Seguro",
    badgeColor: "#6366F1",
    questionKey: "help.faq17Question",
    answerKey: "help.faq17Answer",
  },
  {
    id: "18",
    category: "account",
    icon: "lock-closed-outline",
    badge: "JWT & Redis",
    badgeColor: "#10B981",
    questionKey: "help.faq18Question",
    answerKey: "help.faq18Answer",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();

  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("1");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "yes" | "no">>({});

  const handleSelectCategory = (category: FaqCategory) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedCategory(category);
  };

  const toggleFaq = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleFeedback = (faqId: string, value: "yes" | "no") => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setFeedbackGiven((prev) => ({ ...prev, [faqId]: value }));
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FAQ_LIST.length };
    FAQ_LIST.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredFaqs = useMemo(() => {
    let list = FAQ_LIST;

    // Filter by category
    if (selectedCategory !== "all") {
      list = list.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const question = (t(item.questionKey) || "").toLowerCase();
        const answer = (t(item.answerKey) || "").toLowerCase();
        return question.includes(q) || answer.includes(q);
      });
    }

    return list;
  }, [selectedCategory, searchQuery, t]);

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
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? "#F5F5F5" : "#1A1A1A"}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, themeStyles.text]} numberOfLines={1}>
            {t("help.title")}
          </Text>
          <Text style={[styles.headerSubtitle, themeStyles.subText]} numberOfLines={1}>
            {t("help.subtitle")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar Card */}
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
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchQuery("");
              }}
              style={styles.clearSearchBtn}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={themeStyles.subText.color}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickSection}>
          <Text style={[styles.subSectionTitle, themeStyles.subText]}>
            {t("help.quickActionsTitle") || "Ações Rápidas"}
          </Text>
          <View style={styles.quickGrid}>
            {/* 1. Scanner */}
            <TouchableOpacity
              style={[styles.quickCard, themeStyles.card, themeStyles.border]}
              activeOpacity={0.75}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/scannerProduct");
              }}
            >
              <View style={[styles.quickIconBox, { backgroundColor: accent + "20" }]}>
                <Ionicons name="barcode-outline" size={22} color={accent} />
              </View>
              <Text style={[styles.quickCardTitle, themeStyles.text]} numberOfLines={1}>
                {t("help.quickScanner") || t("navigation.scanner")}
              </Text>
              <Text style={[styles.quickCardSub, themeStyles.subText]} numberOfLines={2}>
                {t("help.quickScannerSub") || t("products.registerPrice")}
              </Text>
            </TouchableOpacity>

            {/* 2. Search */}
            <TouchableOpacity
              style={[styles.quickCard, themeStyles.card, themeStyles.border]}
              activeOpacity={0.75}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/search");
              }}
            >
              <View style={[styles.quickIconBox, { backgroundColor: "#3B82F620" }]}>
                <Ionicons name="search-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.quickCardTitle, themeStyles.text]} numberOfLines={1}>
                {t("help.quickSearch") || t("navigation.search")}
              </Text>
              <Text style={[styles.quickCardSub, themeStyles.subText]} numberOfLines={2}>
                {t("help.quickSearchSub") || t("home.startPriceCheck")}
              </Text>
            </TouchableOpacity>

            {/* 3. Map */}
            <TouchableOpacity
              style={[styles.quickCard, themeStyles.card, themeStyles.border]}
              activeOpacity={0.75}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/map");
              }}
            >
              <View style={[styles.quickIconBox, { backgroundColor: "#10B98120" }]}>
                <Ionicons name="map-outline" size={22} color="#10B981" />
              </View>
              <Text style={[styles.quickCardTitle, themeStyles.text]} numberOfLines={1}>
                {t("help.quickMap") || t("navigation.map")}
              </Text>
              <Text style={[styles.quickCardSub, themeStyles.subText]} numberOfLines={2}>
                {t("help.quickMapSub") || "Ver lojas no mapa"}
              </Text>
            </TouchableOpacity>

            {/* 4. Profile & Badges */}
            <TouchableOpacity
              style={[styles.quickCard, themeStyles.card, themeStyles.border]}
              activeOpacity={0.75}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/profile");
              }}
            >
              <View style={[styles.quickIconBox, { backgroundColor: "#8B5CF620" }]}>
                <Ionicons name="trophy-outline" size={22} color="#8B5CF6" />
              </View>
              <Text style={[styles.quickCardTitle, themeStyles.text]} numberOfLines={1}>
                {t("help.quickProfile") || t("navigation.profile")}
              </Text>
              <Text style={[styles.quickCardSub, themeStyles.subText]} numberOfLines={2}>
                {t("help.quickProfileSub") || "Ver XP e insígnias"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Carousel */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    themeStyles.card,
                    themeStyles.border,
                    isSelected && {
                      backgroundColor: accent,
                      borderColor: accent,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={isSelected ? "#FFFFFF" : isDark ? "#D1D5DB" : "#4B5563"}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? "#FFFFFF" : themeStyles.text.color },
                    ]}
                  >
                    {t(cat.labelKey)}
                  </Text>
                  <View
                    style={[
                      styles.categoryCountBadge,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.25)"
                          : themeStyles.inputBg.backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryCountText,
                        { color: isSelected ? "#FFFFFF" : themeStyles.subText.color },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Section Header & Results Counter */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              {t("help.faqSectionTitle")}
            </Text>
            <View style={[styles.resultsPill, { backgroundColor: accent + "18" }]}>
              <Text style={[styles.resultsPillText, { color: accent }]}>
                {filteredFaqs.length}{" "}
                {filteredFaqs.length === 1 ? "pergunta" : "perguntas"}
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          <View style={[styles.emptyStateCard, themeStyles.card, themeStyles.border]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: accent + "20" }]}>
              <Ionicons name="search-outline" size={32} color={accent} />
            </View>
            <Text style={[styles.emptyTitle, themeStyles.text]}>
              {t("help.noResultsFound") || "Nenhuma pergunta encontrada"}
            </Text>
            <Text style={[styles.emptySub, themeStyles.subText]}>
              {t("help.noResultsSub") ||
                "Tente buscar com outras palavras ou selecione outra categoria."}
            </Text>
            {(searchQuery.length > 0 || selectedCategory !== "all") && (
              <TouchableOpacity
                style={[styles.resetSearchBtn, { backgroundColor: accent }]}
                activeOpacity={0.85}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.resetSearchBtnText}>
                  {t("help.clearSearch") || "Limpar filtros e busca"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.faqContainer}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              const feedback = feedbackGiven[faq.id];

              return (
                <View
                  key={faq.id}
                  style={[
                    styles.faqCard,
                    themeStyles.card,
                    themeStyles.border,
                    isExpanded && {
                      borderColor: accent,
                      shadowColor: accent,
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      elevation: 4,
                    },
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

                    <View style={styles.faqHeaderContent}>
                      <View style={styles.faqTopBadges}>
                        {faq.badge && (
                          <View
                            style={[
                              styles.rewardBadge,
                              {
                                backgroundColor:
                                  (faq.badgeColor || accent) + "20",
                                borderColor:
                                  (faq.badgeColor || accent) + "40",
                              },
                            ]}
                          >
                            <Ionicons
                              name="sparkles"
                              size={10}
                              color={faq.badgeColor || accent}
                              style={{ marginRight: 3 }}
                            />
                            <Text
                              style={[
                                styles.rewardBadgeText,
                                { color: faq.badgeColor || accent },
                              ]}
                            >
                              {faq.badge}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.faqQuestion,
                          themeStyles.text,
                          isExpanded && { color: isDark ? "#FFFFFF" : "#000000" },
                        ]}
                      >
                        {t(faq.questionKey)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.faqChevronBox,
                        isExpanded && { backgroundColor: accent + "18" },
                      ]}
                    >
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={isExpanded ? accent : themeStyles.subText.color}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.faqAnswerContainer, themeStyles.border]}>
                      <Text style={[styles.faqAnswerText, themeStyles.subText]}>
                        {t(faq.answerKey)}
                      </Text>

                      {/* Feedback Rating Box */}
                      <View
                        style={[
                          styles.feedbackBox,
                          themeStyles.inputBg,
                          themeStyles.border,
                        ]}
                      >
                        {feedback ? (
                          <View style={styles.feedbackSuccessRow}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#10B981"
                            />
                            <Text
                              style={[
                                styles.feedbackSuccessText,
                                { color: "#10B981" },
                              ]}
                            >
                              {t("help.feedbackThanks") ||
                                "Obrigado pelo feedback!"}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.feedbackInteractiveRow}>
                            <Text
                              style={[
                                styles.feedbackPromptText,
                                themeStyles.subText,
                              ]}
                            >
                              {t("help.wasHelpful") || "Esta resposta foi útil?"}
                            </Text>
                            <View style={styles.feedbackButtonsGroup}>
                              <TouchableOpacity
                                style={[
                                  styles.feedbackBtn,
                                  themeStyles.card,
                                  themeStyles.border,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => handleFeedback(faq.id, "yes")}
                              >
                                <Ionicons
                                  name="thumbs-up-outline"
                                  size={14}
                                  color="#10B981"
                                />
                                <Text
                                  style={[
                                    styles.feedbackBtnText,
                                    themeStyles.text,
                                  ]}
                                >
                                  {t("help.helpfulYes") || "Sim"}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.feedbackBtn,
                                  themeStyles.card,
                                  themeStyles.border,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => handleFeedback(faq.id, "no")}
                              >
                                <Ionicons
                                  name="thumbs-down-outline"
                                  size={14}
                                  color="#EF4444"
                                />
                                <Text
                                  style={[
                                    styles.feedbackBtnText,
                                    themeStyles.text,
                                  ]}
                                >
                                  {t("help.helpfulNo") || "Não"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Community Guidelines Card */}
        <View
          style={[
            styles.guidelinesCard,
            themeStyles.card,
            themeStyles.border,
          ]}
        >
          <View style={styles.guidelinesHeader}>
            <View
              style={[
                styles.guidelinesIconCircle,
                { backgroundColor: accent + "20" },
              ]}
            >
              <Ionicons name="shield-outline" size={22} color={accent} />
            </View>
            <View style={styles.guidelinesHeaderText}>
              <Text style={[styles.guidelinesTitle, themeStyles.text]}>
                {t("help.guidelinesTitle") || "Diretrizes da Comunidade PResco"}
              </Text>
              <Text style={[styles.guidelinesDesc, themeStyles.subText]}>
                {t("help.guidelinesDesc") ||
                  "Princípios fundamentais para manter nossa plataforma justa e confiável."}
              </Text>
            </View>
          </View>

          <View style={styles.guidelinesList}>
            <View style={styles.guidelineItem}>
              <View style={[styles.guidelineBullet, { backgroundColor: "#10B981" }]}>
                <Ionicons name="pricetag" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.guidelineItemText, themeStyles.subText]}>
                {t("help.guidelinesPoint1") ||
                  "Preços Reais: Registre sempre o valor final da etiqueta ou nota fiscal visto no estabelecimento."}
              </Text>
            </View>

            <View style={styles.guidelineItem}>
              <View style={[styles.guidelineBullet, { backgroundColor: "#3B82F6" }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.guidelineItemText, themeStyles.subText]}>
                {t("help.guidelinesPoint2") ||
                  "Auditoria Justa: Avalie as ocorrências com responsabilidade para valorizar quem colabora."}
              </Text>
            </View>

            <View style={styles.guidelineItem}>
              <View style={[styles.guidelineBullet, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="people" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.guidelineItemText, themeStyles.subText]}>
                {t("help.guidelinesPoint3") ||
                  "Espírito Comunitário: O PResco é construído diariamente por pessoas para ajudar pessoas a economizarem."}
              </Text>
            </View>
          </View>
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
    gap: 16,
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
  clearSearchBtn: {
    padding: 4,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  quickSection: {
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "48.3%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  quickCardSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  categoriesSection: {
    marginHorizontal: -16,
    marginTop: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: -4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  resultsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultsPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyStateCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  resetSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  resetSearchBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
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
    gap: 10,
  },
  faqIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  faqHeaderContent: {
    flex: 1,
    gap: 4,
  },
  faqTopBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rewardBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  faqChevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 21,
  },
  feedbackBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  feedbackInteractiveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedbackPromptText: {
    fontSize: 12,
    fontWeight: "500",
  },
  feedbackButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 2,
  },
  feedbackSuccessText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  guidelinesCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    marginTop: 4,
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guidelinesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  guidelinesHeaderText: {
    flex: 1,
  },
  guidelinesTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  guidelinesDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  guidelinesList: {
    gap: 10,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  guidelineBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  guidelineItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  supportCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  supportIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
