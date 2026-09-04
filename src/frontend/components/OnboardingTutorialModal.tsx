import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { markTutorialAsSeen } from "../utils/tutorialStorage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 50;

interface OnboardingTutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingTutorialModal({
  visible,
  onClose,
}: OnboardingTutorialModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark, amoledEnabled, accent } = useTheme();
  const { t } = useI18n();

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 6;

  // Animation values for gesture swipe
  const translateX = useSharedValue(0);

  // Paleta tátil de supermercado adaptada ao tema ativo
  const isAmoled = isDark && amoledEnabled;

  const colors = {
    backdrop: isAmoled ? "rgba(0,0,0,0.95)" : isDark ? "rgba(10,15,22,0.92)" : "rgba(244,241,235,0.96)",
    surfaceCard: isAmoled ? "#0D1117" : isDark ? "#161F2E" : "#FFFFFF",
    cardBorder: isAmoled ? "#2A3649" : isDark ? "#2A3649" : "#D4DBC9",
    craftPaper: isAmoled ? "#000000" : isDark ? "#0D1117" : "#F7F5EE",
    textPrimary: isAmoled || isDark ? "#F1F5F9" : "#1A2E1A",
    textSecondary: isAmoled || isDark ? "#94A3B8" : "#526B52",
    emerald: "#10B981",
    emeraldDark: "#047857",
    emeraldLight: isDark ? "#064E3B" : "#D1FAE5",
    forestGreen: "#1A2E1A",
    amber: "#F59E0B",
    amberDark: "#B45309",
    amberLight: isDark ? "#78350F" : "#FEF3C7",
    postItBg: isDark ? "#854D0E" : "#FEF08A",
    postItBorder: isDark ? "#B45309" : "#FACC15",
    postItText: isDark ? "#FEF9C3" : "#713F12",
    chalkWhite: isDark ? "#E2E8F0" : "#4A5568",
    chalkYellow: "#FBBF24",
    chalkGreen: "#34D399",
    washiTape: isDark ? "rgba(255,255,255,0.15)" : "rgba(203,213,225,0.65)",
    stampRed: isDark ? "#F87171" : "#DC2626",
  };

  const triggerHaptic = useCallback((type: "selection" | "success" = "selection") => {
    if (Platform.OS !== "web") {
      try {
        if (type === "success") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.selectionAsync();
        }
      } catch {}
    }
  }, []);

  const handleFinish = useCallback(async () => {
    triggerHaptic("success");
    await markTutorialAsSeen();
    onClose();
  }, [triggerHaptic, onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      triggerHaptic("selection");
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  }, [currentStep, totalSteps, triggerHaptic, handleFinish]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      triggerHaptic("selection");
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, triggerHaptic]);

  const handleSkip = useCallback(async () => {
    triggerHaptic("selection");
    await markTutorialAsSeen();
    onClose();
  }, [triggerHaptic, onClose]);

  // Swipe gesture configuration
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && currentStep < totalSteps - 1) {
        runOnJS(handleNext)();
      } else if (event.translationX > SWIPE_THRESHOLD && currentStep > 0) {
        runOnJS(handleBack)();
      }
      translateX.value = withSpring(0);
    });

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  // --- Renderizadores dos Mockups com Doodles Hand-Drawn por Tela ---

  const renderScreenMockup = () => {
    switch (currentStep) {
      case 0:
        // Tela 1: Buscar & Comparar
        return (
          <View style={styles.mockupContainer}>
            {/* Washi tape decorativa */}
            <View style={[styles.washiTape, { backgroundColor: colors.washiTape }]} />

            {/* Barra de busca desenhada com lupa */}
            <View style={[styles.sketchSearchBar, { borderColor: colors.chalkYellow, backgroundColor: colors.surfaceCard }]}>
              <View style={styles.sketchMagnifier}>
                <Ionicons name="search" size={20} color={colors.amber} />
                <View style={[styles.scribbledCircle, { borderColor: colors.chalkYellow }]} />
              </View>
              <Text style={[styles.sketchSearchText, { color: colors.textPrimary }]}>
                Café Torrado 500g
              </Text>
              <Ionicons name="barcode-outline" size={20} color={colors.textSecondary} />
            </View>

            {/* Chips de categorias desenhados */}
            <View style={styles.chipsRow}>
              <View style={[styles.sketchChip, { borderColor: colors.emerald, backgroundColor: colors.emeraldLight }]}>
                <Text style={[styles.sketchChipText, { color: colors.emeraldDark }]}>🥖 Padaria</Text>
              </View>
              <View style={[styles.sketchChip, { borderColor: colors.amber, backgroundColor: colors.amberLight }]}>
                <Text style={[styles.sketchChipText, { color: colors.amberDark }]}>🥩 Carnes</Text>
              </View>
              <View style={[styles.sketchChip, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceCard }]}>
                <Text style={[styles.sketchChipText, { color: colors.textSecondary }]}>🥛 Laticínios</Text>
              </View>
            </View>

            {/* Card comparativo de preço */}
            <View style={[styles.sketchCompareCard, { backgroundColor: colors.surfaceCard, borderColor: colors.cardBorder }]}>
              <View style={styles.compareRow}>
                <View>
                  <Text style={[styles.marketName, { color: colors.textSecondary }]}>Mercado Central</Text>
                  <Text style={[styles.marketPrice, { color: colors.emerald }]}>R$ 14,90</Text>
                </View>
                <View style={styles.vsBadge}>
                  <Text style={[styles.vsText, { color: colors.textSecondary }]}>vs</Text>
                </View>
                <View>
                  <Text style={[styles.marketName, { color: colors.textSecondary }]}>Atacadão</Text>
                  <Text style={[styles.marketPriceOld, { color: colors.textSecondary }]}>R$ 22,50</Text>
                </View>
              </View>

              {/* Seta rabiscada em giz apontando a economia */}
              <View style={styles.arrowRow}>
                <Ionicons name="arrow-back" size={18} color={colors.emerald} style={{ transform: [{ rotate: "-20deg" }] }} />
                <Text style={[styles.arrowAnnotation, { color: colors.emerald }]}>
                  Economia de 34% comprovada!
                </Text>
              </View>
            </View>

            {/* Post-it amarelo inclinado */}
            <View style={[styles.postItNote, { backgroundColor: colors.postItBg, borderColor: colors.postItBorder, transform: [{ rotate: "-2deg" }] }]}>
              <Text style={[styles.postItText, { color: colors.postItText }]}>
                📌 Compare preços antes de sair de casa!
              </Text>
            </View>
          </View>
        );

      case 1:
        // Tela 2: Leitor de Gôndola EAN
        return (
          <View style={styles.mockupContainer}>
            {/* Visor de câmera com cantoneiras de giz */}
            <View style={[styles.cameraViewport, { borderColor: colors.cardBorder, backgroundColor: isDark ? "#080C14" : "#1A2518" }]}>
              <View style={[styles.bracketTL, { borderColor: colors.chalkWhite }]} />
              <View style={[styles.bracketTR, { borderColor: colors.chalkWhite }]} />
              <View style={[styles.bracketBL, { borderColor: colors.chalkWhite }]} />
              <View style={[styles.bracketBR, { borderColor: colors.chalkWhite }]} />

              {/* Feixe laser esmeralda */}
              <View style={[styles.laserBeam, { backgroundColor: colors.emerald }]} />

              {/* Código de barras desenhado */}
              <View style={styles.barcodeWrapper}>
                <Ionicons name="barcode" size={90} color={isDark ? "#FFFFFF" : "#E2E8F0"} />
                <Text style={styles.barcodeEan}>7891000315507</Text>
              </View>

              {/* Balão de fala doodle */}
              <View style={[styles.speechBubble, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
                <Text style={[styles.speechText, { color: colors.amberDark }]}>
                  Aponte na gôndola! 🎯
                </Text>
              </View>
            </View>

            {/* Washi tape com selo OpenFoodFacts */}
            <View style={[styles.washiTapeWide, { backgroundColor: colors.emeraldLight, borderColor: colors.emerald }]}>
              <Ionicons name="cloud-done-outline" size={16} color={colors.emeraldDark} />
              <Text style={[styles.washiText, { color: colors.emeraldDark }]}>
                OpenFoodFacts + Base Local Integrada
              </Text>
            </View>
          </View>
        );

      case 2:
        // Tela 3: Mapa de Mercados
        return (
          <View style={styles.mockupContainer}>
            {/* Mapa ilustrado com ruas e pinos orgânicos */}
            <View style={[styles.mapContainer, { backgroundColor: isDark ? "#111827" : "#E8F0E4", borderColor: colors.cardBorder }]}>
              {/* Ruas desenhadas */}
              <View style={[styles.mapRoadHorizontal, { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" }]} />
              <View style={[styles.mapRoadVertical, { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" }]} />

              {/* Raio circular de 15km desenhado com compasso */}
              <View style={[styles.mapRadiusDashed, { borderColor: colors.emerald }]} />

              {/* Pin de localização do usuário */}
              <View style={[styles.userPinDot, { backgroundColor: colors.amber }]}>
                <View style={[styles.userPulseRing, { borderColor: colors.amber }]} />
              </View>

              {/* Pin de supermercado em destaque */}
              <View style={styles.marketPinTarget}>
                <View style={[styles.sketchPinBadge, { backgroundColor: colors.emerald }]}>
                  <Ionicons name="cart" size={14} color="#FFFFFF" />
                  <Text style={styles.sketchPinText}>R$ 14,90</Text>
                </View>
                <View style={[styles.pinTail, { borderTopColor: colors.emerald }]} />
              </View>

              {/* Balão explicativo */}
              <View style={[styles.mapSpeechBubble, { backgroundColor: colors.surfaceCard, borderColor: colors.cardBorder }]}>
                <Ionicons name="navigate" size={14} color={colors.emerald} />
                <Text style={[styles.mapSpeechText, { color: colors.textPrimary }]}>
                  1.2 km • Mais barato da região
                </Text>
              </View>
            </View>

            {/* Post-it de geolocalização PostGIS */}
            <View style={[styles.postItNote, { backgroundColor: colors.emeraldLight, borderColor: colors.emerald, transform: [{ rotate: "1.5deg" }] }]}>
              <Text style={[styles.postItText, { color: colors.emeraldDark }]}>
                📍 Raio inteligente: economize combustível e tempo!
              </Text>
            </View>
          </View>
        );

      case 3:
        // Tela 4: Registrar Preços (+15 XP / +25 XP)
        return (
          <View style={styles.mockupContainer}>
            {/* Card com formulário e anotação a lápis */}
            <View style={[styles.sketchFormCard, { backgroundColor: colors.surfaceCard, borderColor: colors.cardBorder }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Preço na Gôndola</Text>
              <View style={[styles.formPriceInput, { borderColor: colors.emerald, backgroundColor: colors.craftPaper }]}>
                <Text style={[styles.formPriceCurrency, { color: colors.emerald }]}>R$</Text>
                <Text style={[styles.formPriceValue, { color: colors.textPrimary }]}>14,90</Text>
                <Ionicons name="pencil" size={18} color={colors.amber} style={styles.pencilIcon} />
              </View>

              {/* Carimbo de bônus de novo produto */}
              <View style={[styles.stampBox, { borderColor: colors.stampRed }]}>
                <Text style={[styles.stampText, { color: colors.stampRed }]}>
                  ★ +25 XP SE O PRODUTO FOR NOVO ★
                </Text>
              </View>
            </View>

            {/* Post-it amarelo vibrante com +15 XP */}
            <View style={[styles.postItNoteLarge, { backgroundColor: colors.postItBg, borderColor: colors.postItBorder, transform: [{ rotate: "-2.5deg" }] }]}>
              <View style={styles.postItTape} />
              <Text style={[styles.postItTitle, { color: colors.postItText }]}>
                🎉 +15 XP Garantidos!
              </Text>
              <Text style={[styles.postItSubtitle, { color: colors.postItText }]}>
                Toda oferta informada ajuda quem mais precisa e sobe seu nível no ranking.
              </Text>
            </View>
          </View>
        );

      case 4:
        // Tela 5: Auditoria Comunitária (+5 XP)
        return (
          <View style={styles.mockupContainer}>
            {/* Card de verificação com botões Upvote e Downvote */}
            <View style={[styles.sketchAuditCard, { backgroundColor: colors.surfaceCard, borderColor: colors.cardBorder }]}>
              <Text style={[styles.auditQuestion, { color: colors.textPrimary }]}>
                O preço de R$ 14,90 está correto na loja?
              </Text>

              {/* Botões de voto desenhados */}
              <View style={styles.voteButtonsRow}>
                <View style={[styles.sketchVoteBtn, { borderColor: colors.emerald, backgroundColor: colors.emeraldLight }]}>
                  <Ionicons name="thumbs-up" size={26} color={colors.emerald} />
                  <Text style={[styles.voteCount, { color: colors.emeraldDark }]}>+18 Sim</Text>
                  <View style={[styles.voteCircleHandDrawn, { borderColor: colors.emerald }]} />
                </View>

                <View style={[styles.sketchVoteBtn, { borderColor: colors.cardBorder, backgroundColor: colors.craftPaper }]}>
                  <Ionicons name="thumbs-down-outline" size={26} color={colors.textSecondary} />
                  <Text style={[styles.voteCount, { color: colors.textSecondary }]}>0 Não</Text>
                </View>
              </View>

              {/* Carimbo de confiabilidade */}
              <View style={[styles.trustStamp, { borderColor: colors.emerald }]}>
                <Ionicons name="shield-checkmark" size={16} color={colors.emerald} />
                <Text style={[styles.trustStampText, { color: colors.emerald }]}>
                  AUDITADO PELA COMUNIDADE • 100%
                </Text>
              </View>
            </View>

            {/* Post-it com recompensa por voto */}
            <View style={[styles.postItNote, { backgroundColor: colors.amberLight, borderColor: colors.amber, transform: [{ rotate: "2deg" }] }]}>
              <Text style={[styles.postItText, { color: colors.amberDark }]}>
                ⭐ Ganhe +5 XP por cada auditoria justa!
              </Text>
            </View>
          </View>
        );

      case 5:
        // Tela 6: Subir de Nível, Loja & Mascote
        return (
          <View style={styles.mockupContainer}>
            {/* Card com barra de XP e Mascote */}
            <View style={[styles.sketchProfileCard, { backgroundColor: colors.surfaceCard, borderColor: colors.cardBorder }]}>
              <View style={styles.profileHeaderMini}>
                <View style={styles.mascotAvatarMini}>
                  <Image
                    source={require("./images/mascot-doodle.jpg")}
                    style={styles.mascotImage}
                    contentFit="contain"
                  />
                  <View style={[styles.laurelWreath, { borderColor: colors.amber }]} />
                </View>

                <View style={styles.profileInfoMini}>
                  <Text style={[styles.profileRankTitle, { color: colors.textPrimary }]}>
                    Nível 2 • Caçador de Ofertas
                  </Text>
                  <Text style={[styles.profilePoints, { color: colors.emerald }]}>
                    120 XP acumulados
                  </Text>
                </View>
              </View>

              {/* Barra de XP estilo lápis de cor */}
              <View style={[styles.xpBarTrack, { backgroundColor: colors.craftPaper, borderColor: colors.cardBorder }]}>
                <View style={[styles.xpBarFill, { backgroundColor: colors.emerald, width: "70%" }]}>
                  <View style={styles.pencilHatching} />
                </View>
              </View>

              {/* Badges de conquistas rabiscadas */}
              <View style={styles.badgesRowMini}>
                <View style={[styles.badgeMiniPill, { borderColor: colors.amber, backgroundColor: colors.amberLight }]}>
                  <Ionicons name="star" size={14} color={colors.amber} />
                  <Text style={[styles.badgeMiniText, { color: colors.amberDark }]}>Pioneiro</Text>
                </View>
                <View style={[styles.badgeMiniPill, { borderColor: colors.emerald, backgroundColor: colors.emeraldLight }]}>
                  <Ionicons name="ribbon" size={14} color={colors.emerald} />
                  <Text style={[styles.badgeMiniText, { color: colors.emeraldDark }]}>Mestre da Gôndola</Text>
                </View>
              </View>
            </View>

            {/* Post-it final motivacional */}
            <View style={[styles.postItNote, { backgroundColor: colors.postItBg, borderColor: colors.postItBorder, transform: [{ rotate: "-1deg" }] }]}>
              <Text style={[styles.postItText, { color: colors.postItText }]}>
                🛍️ Desbloqueie molduras épicas e banners na Loja!
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Textos dinâmicos do passo atual
  const stepTitles = [
    t("onboarding.screen1Title") || "Buscar & Comparar",
    t("onboarding.screen2Title") || "Leitor de Gôndola EAN",
    t("onboarding.screen3Title") || "Mapa de Mercados",
    t("onboarding.screen4Title") || "Registrar Preços",
    t("onboarding.screen5Title") || "Auditoria Comunitária",
    t("onboarding.screen6Title") || "Níveis & Customização",
  ];

  const stepSubtitles = [
    t("onboarding.screen1Subtitle") || "Encontre qualquer produto pelo nome ou categorias para comparar preços.",
    t("onboarding.screen2Subtitle") || "Aponte a câmera para o código de barras na prateleira e consulte preços.",
    t("onboarding.screen3Subtitle") || "Descubra supermercados próximos no raio de 15 km com as melhores ofertas.",
    t("onboarding.screen4Subtitle") || "Colabore reportando preços que você encontra e fature experiência.",
    t("onboarding.screen5Subtitle") || "Vote com upvote ou downvote nas ofertas para manter a base confiável.",
    t("onboarding.screen6Subtitle") || "Acumule XP, suba de nível, desbloqueie insígnias e resgate molduras.",
  ];

  const stepBadges = [
    t("onboarding.screen1Badge") || "Economia Real",
    t("onboarding.screen2Badge") || "Leitura Rápida",
    t("onboarding.screen3Badge") || "Geolocalização",
    t("onboarding.screen4Badge") || "+15 XP por Oferta",
    t("onboarding.screen5Badge") || "+5 XP por Voto",
    t("onboarding.screen6Badge") || "Gamificação",
  ];

  const stepTips = [
    t("onboarding.screen1Tip") || "Dica: Veja o histórico de preços para saber se o desconto é real!",
    t("onboarding.screen2Tip") || "Funciona integrado com base local e OpenFoodFacts.",
    t("onboarding.screen3Tip") || "Filtre por proximidade para economizar tempo e combustível.",
    t("onboarding.screen4Tip") || "Cadastre produtos novos para faturar +25 XP bônus!",
    t("onboarding.screen5Tip") || "Sua avaliação garante preços atualizados para todos.",
    t("onboarding.screen6Tip") || "Equipe molduras épicas e mostre sua relevância!",
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
        <View
          style={[
            styles.modalContainer,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header com indicador e botão Pular */}
          <View style={styles.headerRow}>
            <View style={[styles.stepPill, { backgroundColor: colors.emeraldLight, borderColor: colors.emerald }]}>
              <Ionicons name="book-outline" size={14} color={colors.emeraldDark} />
              <Text style={[styles.stepPillText, { color: colors.emeraldDark }]}>
                {currentStep + 1} de {totalSteps}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.skipButton}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {t("onboarding.skip") || "Pular"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Área Interativa com Reconhecimento de Gesto Swipe */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.carouselCard, animatedSlideStyle]}>
              {/* Mockup Hand-Drawn renderizado com doodles nativos */}
              {renderScreenMockup()}

              {/* Textos explicativos */}
              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                    {stepTitles[currentStep]}
                  </Text>
                  <View style={[styles.badgeChip, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
                    <Text style={[styles.badgeChipText, { color: colors.amberDark }]}>
                      {stepBadges[currentStep]}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                  {stepSubtitles[currentStep]}
                </Text>

                {/* Nota tátil de dica */}
                <View style={[styles.tipBanner, { backgroundColor: colors.craftPaper, borderColor: colors.cardBorder }]}>
                  <Ionicons name="bulb-outline" size={16} color={colors.amber} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    {stepTips[currentStep]}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </GestureDetector>

          {/* Barra de Navegação Inferior */}
          <View style={styles.bottomBar}>
            {/* Dots de Paginação */}
            <View style={styles.dotsRow}>
              {Array.from({ length: totalSteps }).map((_, index) => {
                const isActive = index === currentStep;
                return (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isActive
                          ? colors.emerald
                          : isDark
                          ? "#334155"
                          : "#CBD5E1",
                        width: isActive ? 22 : 8,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Ações de navegação */}
            <View style={styles.actionButtonsRow}>
              {currentStep > 0 ? (
                <TouchableOpacity
                  onPress={handleBack}
                  activeOpacity={0.7}
                  style={[styles.backBtn, { borderColor: colors.cardBorder }]}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                  <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
                    {t("onboarding.back") || "Voltar"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.backBtnSpacer} />
              )}

              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: currentStep === totalSteps - 1 ? colors.emerald : (typeof accent === "string" ? accent : colors.emerald),
                  },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {currentStep === totalSteps - 1
                    ? t("onboarding.finish") || "Começar a Economizar"
                    : t("onboarding.next") || "Avançar"}
                </Text>
                <Ionicons
                  name={currentStep === totalSteps - 1 ? "rocket" : "arrow-forward"}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  carouselCard: {
    flex: 1,
    justifyContent: "center",
  },
  mockupContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
    marginVertical: 10,
  },
  washiTape: {
    width: 90,
    height: 18,
    borderRadius: 3,
    marginBottom: -8,
    zIndex: 2,
    transform: [{ rotate: "-3deg" }],
  },
  washiTapeWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
  },
  washiText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sketchSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sketchMagnifier: {
    position: "relative",
    marginRight: 8,
  },
  scribbledCircle: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  sketchSearchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  sketchChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  sketchChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sketchCompareCard: {
    width: "92%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marketName: {
    fontSize: 12,
    fontWeight: "500",
  },
  marketPrice: {
    fontSize: 18,
    fontWeight: "800",
  },
  marketPriceOld: {
    fontSize: 16,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  arrowAnnotation: {
    fontSize: 12,
    fontWeight: "700",
    fontStyle: "italic",
  },
  postItNote: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    maxWidth: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  postItNoteLarge: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    maxWidth: "92%",
    position: "relative",
  },
  postItTape: {
    position: "absolute",
    top: -6,
    left: "40%",
    width: 45,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
  },
  postItTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  postItSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  postItText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  cameraViewport: {
    width: "88%",
    height: 190,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bracketTL: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 2,
  },
  bracketTR: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 2,
  },
  bracketBL: {
    position: "absolute",
    bottom: 14,
    left: 14,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 2,
  },
  bracketBR: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderRadius: 2,
  },
  laserBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },
  barcodeWrapper: {
    alignItems: "center",
  },
  barcodeEan: {
    color: "#94A3B8",
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  speechBubble: {
    position: "absolute",
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  speechText: {
    fontSize: 11,
    fontWeight: "700",
  },
  mapContainer: {
    width: "90%",
    height: 190,
    borderRadius: 20,
    borderWidth: 1.5,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mapRoadHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 85,
    height: 26,
  },
  mapRoadVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 110,
    width: 26,
  },
  mapRadiusDashed: {
    width: 140,
    height: 140,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.6,
  },
  userPinDot: {
    position: "absolute",
    left: 118,
    top: 93,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  userPulseRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  marketPinTarget: {
    position: "absolute",
    top: 40,
    right: 45,
    alignItems: "center",
  },
  sketchPinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sketchPinText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  mapSpeechBubble: {
    position: "absolute",
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  mapSpeechText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sketchFormCard: {
    width: "92%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  formPriceInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  formPriceCurrency: {
    fontSize: 18,
    fontWeight: "700",
    marginRight: 6,
  },
  formPriceValue: {
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },
  pencilIcon: {
    transform: [{ rotate: "-45deg" }],
  },
  stampBox: {
    marginTop: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  stampText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sketchAuditCard: {
    width: "92%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
  },
  auditQuestion: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  voteButtonsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  sketchVoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    position: "relative",
  },
  voteCircleHandDrawn: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  voteCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  trustStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  trustStampText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sketchProfileCard: {
    width: "92%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  profileHeaderMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  mascotAvatarMini: {
    width: 68,
    height: 68,
    borderRadius: 34,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  mascotImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  laurelWreath: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  profileInfoMini: {
    flex: 1,
  },
  profileRankTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  profilePoints: {
    fontSize: 12,
    fontWeight: "700",
  },
  xpBarTrack: {
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  pencilHatching: {
    width: "100%",
    height: "100%",
    opacity: 0.2,
  },
  badgesRowMini: {
    flexDirection: "row",
    gap: 8,
  },
  badgeMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeMiniText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textContainer: {
    marginTop: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 10,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    flex: 1,
  },
  bottomBar: {
    marginTop: 14,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  backBtnSpacer: {
    width: 0,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
