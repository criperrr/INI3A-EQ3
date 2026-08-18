import React, { useEffect } from "react";
import { StyleSheet, View, Platform, Dimensions } from "react-native";
import { usePathname } from "expo-router";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  MAIN_TABS,
  useTabNavigation,
  getTabIndex,
} from "../content/tabNavigationContext";

export { MAIN_TABS };

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SwipeTabNavigatorProps {
  children: React.ReactNode;
}

export default function SwipeTabNavigator({ children }: SwipeTabNavigatorProps) {
  const pathname = usePathname();
  const { navigateToTab } = useTabNavigation();

  const currentIndex = getTabIndex(pathname);
  const isMainTab = currentIndex !== -1;

  const translateX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isBusy = useSharedValue(false);

  // Sincroniza a entrada fluida da nova tela quando o pathname muda
  useEffect(() => {
    isBusy.value = false;
    isDragging.value = false;
    translateX.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [pathname]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handleCompleteTransition = (
    targetRoute: string,
    direction: "left" | "right"
  ) => {
    isBusy.value = true;
    // Prepara a posição inicial de entrada da próxima tela para deslizar suavemente
    translateX.value = direction === "right" ? SCREEN_WIDTH * 0.22 : -SCREEN_WIDTH * 0.22;
    navigateToTab(targetRoute, direction);
  };

  const panGesture = Gesture.Pan()
    .enabled(isMainTab)
    .activeOffsetX([-15, 15])
    .failOffsetY([-30, 30])
    .onStart(() => {
      if (isBusy.value) return;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      if (isBusy.value) return;

      const isFirst = currentIndex === 0;
      const isLast = currentIndex === MAIN_TABS.length - 1;

      // Efeito elástico (rubber-band) nas extremidades (Home à dir ou Perfil à esq)
      if ((isFirst && event.translationX > 0) || (isLast && event.translationX < 0)) {
        translateX.value = event.translationX * 0.25;
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (isBusy.value) return;
      isDragging.value = false;

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const isHorizontal = absX > absY * 1.3;
      const isDecisiveDistance = absX >= 65;
      const isDecisiveVelocity = Math.abs(event.velocityX) >= 450;

      const shouldSwitch = isHorizontal && (isDecisiveDistance || isDecisiveVelocity);

      if (shouldSwitch) {
        if (event.translationX < 0 && currentIndex < MAIN_TABS.length - 1) {
          // Arrastou para a esquerda -> Avança para a próxima tela
          runOnJS(triggerHaptic)();
          const targetRoute = MAIN_TABS[currentIndex + 1].route;
          translateX.value = withTiming(
            -SCREEN_WIDTH,
            { duration: 160, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) {
                runOnJS(handleCompleteTransition)(targetRoute, "right");
              }
            }
          );
          return;
        } else if (event.translationX > 0 && currentIndex > 0) {
          // Arrastou para a direita -> Retorna à tela anterior
          runOnJS(triggerHaptic)();
          const targetRoute = MAIN_TABS[currentIndex - 1].route;
          translateX.value = withTiming(
            SCREEN_WIDTH,
            { duration: 160, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) {
                runOnJS(handleCompleteTransition)(targetRoute, "left");
              }
            }
          );
          return;
        }
      }

      // Se cancelado ou gesto insuficiente, retorna com mola física suave
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 240,
        mass: 0.8,
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [1, 0.88],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [1, 0.97],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX: translateX.value }, { scale }],
      opacity,
    };
  });

  if (!isMainTab) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
