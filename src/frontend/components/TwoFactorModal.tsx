import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";
import { useAuth } from "../content/authContext";
import { useI18n } from "../content/i18nContext";

interface TwoFactorModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionDescription?: string;
}

export default function TwoFactorModal({
  visible,
  onClose,
  onSuccess,
  actionDescription,
}: TwoFactorModalProps) {
  const { themeStyles, accent, isDark, tokens } = useTheme();
  const { semantic } = tokens;
  const { user, profile, requestTwoFactorCode, confirmTwoFactorCode } = useAuth();
  const { t } = useI18n();

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const userEmail = user?.email || profile?.email || "";

  // Reset state when opening modal and automatically dispatch 2FA code
  useEffect(() => {
    if (visible) {
      setCode("");
      setErrorMessage("");
      setSuccessMessage("");
      handleSendCode();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    }
  }, [visible]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (countdown > 0 || isSending) return;
    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await requestTwoFactorCode();
      if (res.success) {
        setSuccessMessage(res.message || "Código enviado para seu e-mail.");
        setCountdown(60);
      } else {
        setErrorMessage(res.message || "Não foi possível enviar o código.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao solicitar código de verificação.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.trim().length !== 6) {
      setErrorMessage("Digite o código de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await confirmTwoFactorCode(code.trim());
      if (res.success) {
        setSuccessMessage("Verificação confirmada com sucesso!");
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Código incorreto ou expirado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoid}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: semantic.colors.surface.card,
                  borderColor: semantic.colors.border.default,
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={semantic.colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Header Icon */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: accent + "20" },
                ]}
              >
                <Ionicons name="shield-checkmark" size={32} color={accent} />
              </View>

              {/* Title & Subtitle */}
              <Text
                style={[
                  styles.title,
                  { color: semantic.colors.text.primary },
                ]}
              >
                Verificação em 2 Etapas
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: semantic.colors.text.secondary },
                ]}
              >
                {actionDescription ||
                  "Para publicar ofertas e interagir na comunidade, confirme o código enviado para seu e-mail."}
              </Text>

              {/* Target Email Banner */}
              {Boolean(userEmail) && (
                <View
                  style={[
                    styles.emailBanner,
                    {
                      backgroundColor: semantic.colors.surface.input,
                      borderColor: semantic.colors.border.default,
                    },
                  ]}
                >
                  <Ionicons name="mail-outline" size={16} color={accent} />
                  <Text
                    style={[
                      styles.emailText,
                      { color: semantic.colors.text.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {userEmail}
                  </Text>
                </View>
              )}

              {/* Status & Error Messages */}
              {Boolean(errorMessage) && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {Boolean(successMessage) && !errorMessage && (
                <View style={[styles.successBox, { backgroundColor: accent + "18" }]}>
                  <Ionicons name="checkmark-circle" size={16} color={accent} />
                  <Text style={[styles.successText, { color: accent }]}>
                    {successMessage}
                  </Text>
                </View>
              )}

              {/* Code Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
                    setCode(cleaned);
                    setErrorMessage("");
                    if (cleaned.length === 6) {
                      Keyboard.dismiss();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={semantic.colors.text.tertiary}
                  style={[
                    styles.codeInput,
                    {
                      backgroundColor: semantic.colors.surface.input,
                      borderColor: code.length === 6 ? accent : semantic.colors.border.default,
                      color: semantic.colors.text.primary,
                    },
                  ]}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyBtn,
                  { backgroundColor: accent },
                  (isLoading || code.length < 6) && styles.btnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleVerify}
                disabled={isLoading || code.length < 6}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.verifyBtnText}>Confirmar e Desbloquear</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Resend Code Button */}
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendCode}
                disabled={countdown > 0 || isSending}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : (
                  <Text
                    style={[
                      styles.resendText,
                      { color: countdown > 0 ? semantic.colors.text.tertiary : accent },
                    ]}
                  >
                    {countdown > 0
                      ? `Reenviar código em ${countdown}s`
                      : "Não recebeu? Reenviar código"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
  keyboardAvoid: {
    width: "100%",
    maxWidth: 380,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emailBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  emailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    width: "100%",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    width: "100%",
  },
  successText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 18,
  },
  codeInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 10,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 50,
    borderRadius: 14,
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resendBtn: {
    paddingVertical: 6,
    alignItems: "center",
  },
  resendText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
