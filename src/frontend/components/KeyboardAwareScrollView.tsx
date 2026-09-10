import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  KeyboardEvent,
  Platform,
  View,
  StyleSheet,
} from "react-native";

interface KeyboardAwareContextType {
  scrollToInput: (targetRef: React.RefObject<View | null>, extraOffset?: number) => void;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

const KeyboardAwareContext = createContext<KeyboardAwareContextType>({
  scrollToInput: () => {},
  keyboardHeight: 0,
  isKeyboardVisible: false,
});

export const useKeyboardAware = () => useContext(KeyboardAwareContext);

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  extraScrollHeight?: number;
  bottomOffset?: number;
  children?: React.ReactNode;
}

export interface KeyboardAwareScrollViewRef {
  scrollToInput: (targetRef: React.RefObject<View | null>, extraOffset?: number) => void;
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToEnd: (options?: { animated?: boolean }) => void;
  getScrollView: () => ScrollView | null;
}

export const KeyboardAwareScrollView = forwardRef<
  KeyboardAwareScrollViewRef,
  KeyboardAwareScrollViewProps
>(
  (
    {
      children,
      contentContainerStyle,
      extraScrollHeight = 80,
      bottomOffset = 24,
      keyboardShouldPersistTaps = "handled",
      showsVerticalScrollIndicator = false,
      ...restProps
    },
    ref
  ) => {
    const scrollViewRef = useRef<ScrollView | null>(null);
    const containerRef = useRef<View | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const activeTargetRef = useRef<{ ref: React.RefObject<View | null>; offset: number } | null>(null);

    const scrollToInput = useCallback(
      (targetRef: React.RefObject<View | null>, customExtraOffset?: number) => {
        const offset = customExtraOffset ?? extraScrollHeight;
        activeTargetRef.current = { ref: targetRef, offset };

        if (!targetRef.current || !scrollViewRef.current) return;

        // Medição relativa ao ScrollView ou janela
        setTimeout(() => {
          if (!targetRef.current || !scrollViewRef.current) return;

          try {
            targetRef.current.measureLayout(
              scrollViewRef.current as any,
              (_left, top, _width, height) => {
                const targetScrollY = Math.max(0, top - offset);
                scrollViewRef.current?.scrollTo({
                  y: targetScrollY,
                  animated: true,
                });
              },
              () => {
                // Fallback via measureInWindow
                targetRef.current?.measureInWindow?.((_x, y, _w, height) => {
                  if (y > 0) {
                    scrollViewRef.current?.scrollTo({
                      y: Math.max(0, y - offset),
                      animated: true,
                    });
                  }
                });
              }
            );
          } catch {
            // Em caso de timing de desmontagem, falha silenciosa
          }
        }, 60);
      },
      [extraScrollHeight]
    );

    useImperativeHandle(ref, () => ({
      scrollToInput,
      scrollTo: (options) => scrollViewRef.current?.scrollTo(options),
      scrollToEnd: (options) => scrollViewRef.current?.scrollToEnd(options),
      getScrollView: () => scrollViewRef.current,
    }));

    useEffect(() => {
      const showSubscriptionName =
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideSubscriptionName =
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

      const onKeyboardShow = (e: KeyboardEvent) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);

        // Se há um campo aguardando foco no momento em que o teclado sobe
        if (activeTargetRef.current) {
          const { ref: target, offset } = activeTargetRef.current;
          setTimeout(() => {
            if (target.current && scrollViewRef.current) {
              scrollToInput(target, offset);
            }
          }, Platform.OS === "ios" ? 10 : 80);
        }
      };

      const onKeyboardHide = () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        activeTargetRef.current = null;
      };

      const showSub = Keyboard.addListener(showSubscriptionName, onKeyboardShow);
      const hideSub = Keyboard.addListener(hideSubscriptionName, onKeyboardHide);

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [scrollToInput]);

    // O padding inferior dinâmico garante que o conteúdo possa ser rolado acima do teclado
    const dynamicBottomPadding = isKeyboardVisible
      ? Math.max(keyboardHeight + bottomOffset, 120)
      : bottomOffset;

    return (
      <KeyboardAwareContext.Provider
        value={{
          scrollToInput,
          keyboardHeight,
          isKeyboardVisible,
        }}
      >
        <View ref={containerRef} style={styles.container} collapsable={false}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentContainerStyle={[
              contentContainerStyle,
              { paddingBottom: dynamicBottomPadding },
            ]}
            {...restProps}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAwareContext.Provider>
    );
  }
);

KeyboardAwareScrollView.displayName = "KeyboardAwareScrollView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
