import React from "react";
import {
  View,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type AnimatedStyle,
} from "react-native-reanimated";

export const MOTION_DURATION = {
  fast: 160,
  normal: 220,
  smooth: 260,
} as const;

export const MOTION_SPRING = {
  damping: 18,
  stiffness: 300,
  mass: 0.65,
} as const;

/**
 * Computes a capped stagger delay so list entrances feel crisp without lagging
 * on long lists or during automated UI tests.
 */
export function staggerDelay(index: number, stepMs = 35, maxItems = 6): number {
  if (index <= 0) return 0;
  return Math.min(index, maxItems) * stepMs;
}

interface AnimatedContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  testID?: string;
}

/**
 * Full-screen layout container; screen transitions are handled natively by the
 * Stack navigator so back navigation never replays entrance animations.
 */
export function AnimatedScreenContainer({
  children,
  style,
  testID,
}: AnimatedContainerProps) {
  return (
    <View testID={testID} style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
}

/**
 * Section entrance with zero-delay light fade so mount never stalls Fabric.
 */
export function AnimatedSection({
  children,
  style,
  testID,
}: AnimatedContainerProps) {
  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(120)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

interface AnimatedCardProps extends AnimatedContainerProps {
  index?: number;
}

/**
 * Plain card container so list items never stall Fabric layout-animation registration on mount.
 */
export function AnimatedCard({
  children,
  style,
  testID,
}: AnimatedCardProps) {
  return (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
}

/**
 * Crisp fade entrance for modal sheets and dialog cards.
 */
export function AnimatedModalContent({
  children,
  style,
  testID,
}: AnimatedContainerProps) {
  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(120)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ScalePressableProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle>;
  scaleTo?: number;
}

/**
 * Tactile pressable with Reanimated spring scale feedback.
 * Forwards testID, accessibility props, and disabled state cleanly.
 */
export function ScalePressable({
  children,
  style,
  scaleTo = 0.96,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withSpring(scaleTo, MOTION_SPRING);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, MOTION_SPRING);
        onPressOut?.(e);
      }}
      style={[style as StyleProp<ViewStyle>, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
