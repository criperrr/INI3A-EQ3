import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";
import { AnimatedModalContent, ScalePressable } from "./AnimatedMotion";

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AppAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  variant?: "info" | "success" | "warning" | "error";
}

interface AppAlertPayload {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options: AppAlertOptions;
}

interface AppAlertContextValue {
  alert: (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions
  ) => void;
}

const AppAlertContext = createContext<AppAlertContextValue | undefined>(
  undefined
);

let nextAlertId = 1;
const alertQueue: AppAlertPayload[] = [];
let queueListener: (() => void) | null = null;

function notifyQueueListener() {
  queueListener?.();
}

export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions
): void {
  const resolvedButtons: AppAlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" }];

  alertQueue.push({
    id: nextAlertId++,
    title,
    message,
    buttons: resolvedButtons,
    options: options ?? {},
  });

  notifyQueueListener();
}

export function useAppAlert(): AppAlertContextValue {
  const context = useContext(AppAlertContext);
  if (!context) {
    return { alert: appAlert };
  }
  return context;
}

type AlertVariant = NonNullable<AppAlertOptions["variant"]>;

function resolveVariant(
  options: AppAlertOptions,
  buttons: AppAlertButton[]
): AlertVariant {
  if (options.variant) return options.variant;
  if (buttons.some((btn) => btn.style === "destructive")) return "error";
  return "info";
}

function getVariantVisuals(
  variant: AlertVariant,
  accent: string,
  feedback: { success: string; warning: string; error: string; info: string }
): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (variant) {
    case "success":
      return { icon: "checkmark-circle-outline", color: feedback.success };
    case "warning":
      return { icon: "warning-outline", color: feedback.warning };
    case "error":
      return { icon: "alert-circle-outline", color: feedback.error };
    case "info":
    default:
      return { icon: "information-circle-outline", color: accent };
  }
}

function orderTwoButtons(buttons: AppAlertButton[]): AppAlertButton[] {
  const cancelIndex = buttons.findIndex((btn) => btn.style === "cancel");
  if (cancelIndex === 1) {
    return [buttons[1], buttons[0]];
  }
  return buttons;
}

function AppAlertHost() {
  const { accent, tokens } = useTheme();
  const { semantic } = tokens;
  const [currentAlert, setCurrentAlert] = useState<AppAlertPayload | null>(null);

  const advanceQueue = useCallback(() => {
    setCurrentAlert((prev) => {
      if (prev) return prev;
      return alertQueue.shift() ?? null;
    });
  }, []);

  useEffect(() => {
    queueListener = advanceQueue;
    advanceQueue();
    return () => {
      if (queueListener === advanceQueue) {
        queueListener = null;
      }
    };
  }, [advanceQueue]);

  const dismissCurrent = useCallback((invokeOnDismiss: boolean) => {
    setCurrentAlert((prev) => {
      if (invokeOnDismiss) {
        prev?.options.onDismiss?.();
      }
      return alertQueue.shift() ?? null;
    });
  }, []);

  const handleRequestClose = useCallback(() => {
    if (!currentAlert) return;
    if (currentAlert.options.cancelable === false) return;
    dismissCurrent(true);
  }, [currentAlert, dismissCurrent]);

  const handleButtonPress = useCallback(
    (button: AppAlertButton) => {
      dismissCurrent(false);
      button.onPress?.();
    },
    [dismissCurrent]
  );

  if (currentAlert === null) {
    return null;
  }

  const variant = resolveVariant(currentAlert.options, currentAlert.buttons);
  const { icon, color: variantColor } = getVariantVisuals(
    variant,
    accent,
    semantic.colors.feedback
  );

  const buttons = currentAlert.buttons;
  const isTwoButtons = buttons.length === 2;
  const isStacked = buttons.length >= 3;
  const orderedButtons = isTwoButtons ? orderTwoButtons(buttons) : buttons;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleRequestClose}
        />
        <View style={styles.cardWrapper} pointerEvents="box-none">
          <AnimatedModalContent
            key={currentAlert.id}
            style={[
              styles.modalCard,
              {
                backgroundColor: semantic.colors.surface.card,
                borderColor: semantic.colors.border.default,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${variantColor}1A` },
              ]}
            >
              <Ionicons name={icon} size={30} color={variantColor} />
            </View>

            <Text
              style={[
                styles.title,
                { color: semantic.colors.text.primary },
              ]}
            >
              {currentAlert.title}
            </Text>

            {!!currentAlert.message && (
              <Text
                style={[
                  styles.message,
                  { color: semantic.colors.text.secondary },
                ]}
              >
                {currentAlert.message}
              </Text>
            )}

            <View
              style={[
                styles.actionsContainer,
                isTwoButtons && styles.actionsRow,
                isStacked && styles.actionsColumn,
              ]}
            >
              {orderedButtons.map((btn, index) => {
                const isCancel = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";
                const bgColor = isDestructive
                  ? semantic.colors.feedback.error
                  : isCancel
                    ? semantic.colors.surface.input
                    : accent;
                const textColor = isCancel
                  ? semantic.colors.text.primary
                  : "#FFFFFF";

                return (
                  <ScalePressable
                    key={`${currentAlert.id}-btn-${index}`}
                    onPress={() => handleButtonPress(btn)}
                    style={[
                      styles.actionButton,
                      isTwoButtons && styles.actionButtonHalf,
                      (buttons.length === 1 || isStacked) &&
                        styles.actionButtonFull,
                      {
                        backgroundColor: bgColor,
                        borderColor: isCancel
                          ? semantic.colors.border.default
                          : "transparent",
                        borderWidth: isCancel ? 1 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.actionButtonText, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </AnimatedModalContent>
        </View>
      </View>
    </Modal>
  );
}

export function AppAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const contextValue = useMemo<AppAlertContextValue>(
    () => ({ alert: appAlert }),
    []
  );

  return (
    <AppAlertContext.Provider value={contextValue}>
      {children}
      <AppAlertHost />
    </AppAlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 380,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  actionsRow: {
    flexDirection: "row",
  },
  actionsColumn: {
    flexDirection: "column",
  },
  actionButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonFull: {
    width: "100%",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
