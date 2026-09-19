import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";
import { useKeyboardAware } from "./KeyboardAwareScrollView";
import { useTheme } from "../theme";

export interface FocusedInputWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  extraOffset?: number;
  highlightBorder?: boolean;
  activeBorderColor?: string;
  borderRadius?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const FocusedInputWrapper: React.FC<FocusedInputWrapperProps> = ({
  children,
  style,
  focusedStyle,
  extraOffset = 90,
  highlightBorder = true,
  activeBorderColor,
  borderRadius = 12,
  onFocus,
  onBlur,
}) => {
  const containerRef = useRef<View | null>(null);
  const { scrollToInput } = useKeyboardAware();
  const { accent } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const effectiveBorderColor = activeBorderColor || accent;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (containerRef.current) {
      scrollToInput(containerRef, extraOffset);
    }
    onFocus?.();
  }, [scrollToInput, extraOffset, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const borderHighlightStyle: ViewStyle = isFocused && highlightBorder
    ? {
        borderColor: effectiveBorderColor,
        borderWidth: 1.5,
        ...Platform.select({
          ios: {
            shadowColor: effectiveBorderColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
        }),
      }
    : {};

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[
        styles.defaultWrapper,
        { borderRadius },
        style,
        borderHighlightStyle,
        isFocused && focusedStyle,
      ]}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const originalOnFocus = (child.props as any).onFocus;
          const originalOnBlur = (child.props as any).onBlur;

          return React.cloneElement(child, {
            onFocus: (e: any) => {
              handleFocus();
              originalOnFocus?.(e);
            },
            onBlur: (e: any) => {
              handleBlur();
              originalOnBlur?.(e);
            },
          } as any);
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultWrapper: {
    width: "100%",
  },
});
