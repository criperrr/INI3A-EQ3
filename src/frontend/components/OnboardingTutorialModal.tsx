import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { markTutorialAsSeen } from "../utils/tutorialStorage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 45;

interface OnboardingTutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingTutorialModal({
  visible,
  onClose,
}: OnboardingTutorialModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark, amoledEnabled } = useTheme();
  const { t } = useI18n();

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 6;
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 40);

  // Animação horizontal contínua de trilha de carrossel
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const isAmoled = isDark && amoledEnabled;

  const colors = {
    backdrop: isAmoled ? "rgba(0,0,0,0.96)" : isDark ? "rgba(10,15,22,0.94)" : "rgba(244,241,235,0.97)",
    surfaceCard: isAmoled ? "#0D1117" : isDark ? "#161F2E" : "#FFFFFF",
    cardBorder: isAmoled ? "#2A3649" : isDark ? "#2A3649" : "#D4DBC9",
    craftPaper: isAmoled ? "#000000" : isDark ? "#0D1117" : "#F7F5EE",
    textPrimary: isAmoled || isDark ? "#F1F5F9" : "#1A2E1A",
    textSecondary: isAmoled || isDark ? "#94A3B8" : "#526B52",
    emerald: "#10B981",
    emeraldDark: "#047857",
    emeraldLight: isDark ? "#064E3B" : "#D1FAE5",
    amber: "#F59E0B",
    amberDark: "#B45309",
    amberLight: isDark ? "#78350F" : "#FEF3C7",
    postItBg: isDark ? "#854D0E" : "#FEF08A",
    postItBorder: isDark ? "#B45309" : "#FACC15",
    postItText: isDark ? "#FEF9C3" : "#713F12",
    chalkWhite: isDark ? "#E2E8F0" : "#4A5568",
    chalkYellow: "#FBBF24",
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

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      translateX.value = -currentStep * width;
    }
  };

  const handleFinish = useCallback(async () => {
    triggerHaptic("success");
    await markTutorialAsSeen();
    onClose();
  }, [triggerHaptic, onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const next = currentStep + 1;
      triggerHaptic("selection");
      setCurrentStep(next);
      translateX.value = withTiming(-next * containerWidth, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      handleFinish();
    }
  }, [currentStep, totalSteps, containerWidth, triggerHaptic, handleFinish, translateX]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      triggerHaptic("selection");
      setCurrentStep(prev);
      translateX.value = withTiming(-prev * containerWidth, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [currentStep, containerWidth, triggerHaptic, translateX]);

  const handleSkip = useCallback(async () => {
    triggerHaptic("selection");
    await markTutorialAsSeen();
    onClose();
  }, [triggerHaptic, onClose]);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      translateX.value = 0;
    }
  }, [visible, translateX]);

  // Gestos de Pan com rastreamento contínuo 1:1 e deslizamento horizontal suave
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const rawX = startX.value + event.translationX;
      const minX = -(totalSteps - 1) * containerWidth;
      const maxX = 0;
      if (rawX > maxX) {
        translateX.value = rawX * 0.25;
      } else if (rawX < minX) {
        translateX.value = minX + (rawX - minX) * 0.25;
      } else {
        translateX.value = rawX;
      }
    })
    .onEnd((event) => {
      let targetStep = currentStep;
      if (event.translationX < -SWIPE_THRESHOLD && currentStep < totalSteps - 1) {
        targetStep = currentStep + 1;
      } else if (event.translationX > SWIPE_THRESHOLD && currentStep > 0) {
        targetStep = currentStep - 1;
      } else {
        targetStep = Math.max(0, Math.min(totalSteps - 1, Math.round(-translateX.value / containerWidth)));
      }

      runOnJS(setCurrentStep)(targetStep);
      translateX.value = withTiming(-targetStep * containerWidth, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    });

  const animatedTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  // --- Mockups Ricos com Estética Artesanal (Hand-Drawn / Craft Paper) ---
  const renderScreenMockup = (stepIndex: number) => {
    switch (stepIndex) {
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
                  <Text style={[styles.marketName, { color: colors.textSecondary }]}>Outros Mercados</Text>
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
                <Ionicons name="barcode" size={88} color={isDark ? "#FFFFFF" : "#E2E8F0"} />
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
                Base Local + OpenFoodFacts Integrada
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
                📍 Raio inteligente: economize tempo e combustível!
              </Text>
            </View>
          </View>
        );

      case 3:
        // Tela 4: Registrar Preços (+15 XP / +25 XP)
        return (
          <View style={styles.mockupContainer}>
            {/* Card com formulário e anotação */}
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
                Toda oferta informada ajuda quem mais precisa e sobe seu ranking.
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
                  <Ionicons name="thumbs-up" size={24} color={colors.emerald} />
                  <Text style={[styles.voteCount, { color: colors.emeraldDark }]}>+18 Sim</Text>
                  <View style={[styles.voteCircleHandDrawn, { borderColor: colors.emerald }]} />
                </View>

                <View style={[styles.sketchVoteBtn, { borderColor: colors.cardBorder, backgroundColor: colors.craftPaper }]}>
                  <Ionicons name="thumbs-down-outline" size={24} color={colors.textSecondary} />
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
                <View style={[styles.mascotAvatarMini, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                  <Image
                    source={
                      isDark
                        ? require("./images/logo-darkmode.png")
                        : require("./images/logo-presco.png")
                    }
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

              {/* Badges de conquistas */}
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

  // Textos Simplificados & Diretos (sem excesso de palavras)
  const stepTitles = [
    t("onboarding.screen1Title") || "Buscar & Comparar",
    t("onboarding.screen2Title") || "Leitor de Gôndola EAN",
    t("onboarding.screen3Title") || "Mapa de Mercados",
    t("onboarding.screen4Title") || "Registrar Preços",
    t("onboarding.screen5Title") || "Auditoria Comunitária",
    t("onboarding.screen6Title") || "Níveis & Customização",
  ];

  const stepSubtitles = [
    t("onboarding.screen1Subtitle") || "Encontre qualquer produto pelo nome ou categorias para comparar preços entre mercados.",
    t("onboarding.screen2Subtitle") || "Aponte a câmera para o código de barras na prateleira e descubra se há preços menores.",
    t("onboarding.screen3Subtitle") || "Localize supermercados em até 15 km com as melhores ofertas e trajetos rápidos.",
    t("onboarding.screen4Subtitle") || "Reporte os preços que encontrar nas lojas e acumule experiência para subir de nível.",
    t("onboarding.screen5Subtitle") || "Vote com upvote ou downvote nas ofertas registradas para manter os dados 100% confiáveis.",
    t("onboarding.screen6Subtitle") || "Acumule XP, ganhe insígnias exclusivas e resgate molduras e banners personalizados na Loja.",
  ];

  const stepBadges = [
    t("onboarding.screen1Badge") || "Economia",
    t("onboarding.screen2Badge") || "Leitura Rápida",
    t("onboarding.screen3Badge") || "15 km GPS",
    t("onboarding.screen4Badge") || "+15 XP",
    t("onboarding.screen5Badge") || "+5 XP",
    t("onboarding.screen6Badge") || "Gamificação",
  ];

  const stepTips = [
    t("onboarding.screen1Tip") || "Dica: Veja o histórico de preços para checar se a promoção é real.",
    t("onboarding.screen2Tip") || "Dica: Funciona integrado com a base local e OpenFoodFacts.",
    t("onboarding.screen3Tip") || "Dica: Filtre por menor preço e distância para economizar combustível.",
    t("onboarding.screen4Tip") || "Dica: Cadastre produtos novos para faturar +25 XP bônus!",
    t("onboarding.screen5Tip") || "Dica: Sua avaliação ajuda milhares de pessoas a economizarem.",
    t("onboarding.screen6Tip") || "Dica: Equipe molduras raras no seu perfil para se destacar no ranking.",
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
          {/* Header com indicador de passo */}
          <View style={styles.headerRow}>
            <View style={[styles.stepPill, { backgroundColor: colors.emeraldLight, borderColor: colors.emerald }]}>
              <Ionicons name="book-outline" size={13} color={colors.emeraldDark} />
              <Text style={[styles.stepPillText, { color: colors.emeraldDark }]}>
                Passo {currentStep + 1} de {totalSteps}
              </Text>
            </View>
          </View>

          {/* Área Interativa com Carrossel Contínuo e Deslizamento Horizontal Suave */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.carouselViewport} onLayout={handleContainerLayout}>
              <Animated.View
                style={[
                  styles.carouselTrack,
                  { width: containerWidth * totalSteps },
                  animatedTrackStyle,
                ]}
              >
                {Array.from({ length: totalSteps }).map((_, stepIndex) => (
                  <View
                    key={`slide-${stepIndex}`}
                    style={[styles.carouselSlide, { width: containerWidth }]}
                  >
                    {/* Mockup Hand-Drawn Artesanal */}
                    {renderScreenMockup(stepIndex)}

                    {/* Textos explicativos */}
                    <View style={styles.textContainer}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                          {stepTitles[stepIndex]}
                        </Text>
                        <View style={[styles.badgeChip, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
                          <Text style={[styles.badgeChipText, { color: colors.amberDark }]}>
                            {stepBadges[stepIndex]}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                        {stepSubtitles[stepIndex]}
                      </Text>

                      {/* Nota tátil de dica */}
                      <View style={[styles.tipBanner, { backgroundColor: colors.craftPaper, borderColor: colors.cardBorder }]}>
                        <Ionicons name="bulb-outline" size={16} color={colors.amber} />
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                          {stepTips[stepIndex]}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Barra de Navegação Inferior com Pular e Próximo (Branco) no Canto Inferior Direito */}
          <View style={styles.bottomBar}>
            {/* Canto Inferior Esquerdo: Voltar (se > 0) e Dots de Paginação */}
            <View style={styles.bottomLeftContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  onPress={handleBack}
                  activeOpacity={0.7}
                  style={[styles.miniBackBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceCard }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              )}

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
                          width: isActive ? 18 : 6,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Canto Inferior Direito: Escrito de Pular + Botão Branco de Próximo */}
            <View style={styles.bottomRightContainer}>
              {currentStep < totalSteps - 1 && (
                <TouchableOpacity
                  onPress={handleSkip}
                  activeOpacity={0.6}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.skipTextButton}
                >
                  <Text style={[styles.skipTextBottom, { color: colors.textSecondary }]}>
                    {t("onboarding.skip") || "Pular"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={styles.whiteNextButton}
              >
                <Text style={styles.whiteNextButtonText} numberOfLines={1}>
                  {currentStep === totalSteps - 1
                    ? t("onboarding.finish") || "Começar"
                    : t("onboarding.next") || "Próximo"}
                </Text>
                <Ionicons
                  name={currentStep === totalSteps - 1 ? "rocket" : "arrow-forward"}
                  size={16}
                  color="#0F172A"
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
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 6,
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
  carouselViewport: {
    flex: 1,
    overflow: "hidden",
    width: "100%",
    justifyContent: "center",
  },
  carouselTrack: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },
  carouselSlide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  mockupContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 210,
    marginVertical: 4,
  },
  washiTape: {
    width: 90,
    height: 16,
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
    marginTop: 8,
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
    paddingVertical: 9,
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
    marginTop: 10,
  },
  sketchChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sketchChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sketchCompareCard: {
    width: "92%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontSize: 17,
    fontWeight: "800",
  },
  marketPriceOld: {
    fontSize: 15,
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
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  arrowAnnotation: {
    fontSize: 11,
    fontWeight: "700",
    fontStyle: "italic",
  },
  postItNote: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    maxWidth: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  postItNoteLarge: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    maxWidth: "92%",
    position: "relative",
  },
  postItTape: {
    position: "absolute",
    top: -6,
    left: "40%",
    width: 50,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    transform: [{ rotate: "-2deg" }],
  },
  postItTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  postItSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  postItText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  cameraViewport: {
    width: "88%",
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  bracketTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRadius: 3,
  },
  bracketTR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderRadius: 3,
  },
  bracketBL: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRadius: 3,
  },
  bracketBR: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderRadius: 3,
  },
  laserBeam: {
    position: "absolute",
    top: "50%",
    left: 14,
    right: 14,
    height: 2,
    shadowColor: "#10B981",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  barcodeWrapper: {
    alignItems: "center",
  },
  barcodeEan: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
  },
  speechBubble: {
    position: "absolute",
    top: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  speechText: {
    fontSize: 11,
    fontWeight: "700",
  },
  mapContainer: {
    width: "88%",
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  mapRoadHorizontal: {
    position: "absolute",
    width: "100%",
    height: 16,
    top: "45%",
    opacity: 0.7,
  },
  mapRoadVertical: {
    position: "absolute",
    height: "100%",
    width: 16,
    left: "40%",
    opacity: 0.7,
  },
  mapRadiusDashed: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.8,
  },
  userPinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: "absolute",
  },
  userPulseRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 10,
    borderWidth: 1,
    opacity: 0.5,
  },
  marketPinTarget: {
    position: "absolute",
    top: 18,
    right: 32,
    alignItems: "center",
  },
  sketchPinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sketchPinText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  mapSpeechBubble: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  mapSpeechText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sketchFormCard: {
    width: "88%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  formPriceInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  formPriceCurrency: {
    fontSize: 16,
    fontWeight: "800",
  },
  formPriceValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  pencilIcon: {
    marginLeft: 6,
  },
  stampBox: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  stampText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sketchAuditCard: {
    width: "88%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  auditQuestion: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  voteButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  sketchVoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    position: "relative",
  },
  voteCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  voteCircleHandDrawn: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  trustStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  trustStampText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sketchProfileCard: {
    width: "88%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileHeaderMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  mascotAvatarMini: {
    width: 50,
    height: 50,
    borderRadius: 25,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  mascotImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  laurelWreath: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  profileInfoMini: {
    flex: 1,
  },
  profileRankTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  profilePoints: {
    fontSize: 11,
    fontWeight: "700",
  },
  xpBarTrack: {
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 5,
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
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeMiniText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textContainer: {
    marginTop: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  badgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  stepSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "500",
    marginBottom: 8,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingTop: 6,
  },
  bottomLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  miniBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  bottomRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    justifyContent: "flex-end",
  },
  skipTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  skipTextBottom: {
    fontSize: 14,
    fontWeight: "700",
  },
  whiteNextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
    flexShrink: 0,
  },
  whiteNextButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
