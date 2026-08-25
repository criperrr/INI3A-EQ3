import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";
import { useAuth, ApiError } from "../content/authContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants.executionEnvironment as string) === "storeClient" ||
    __DEV__;

  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const targetEmail = overrideEmail || email;
    const targetPassword = overridePass || password;
    setErrorMessage("");

    if (!targetEmail.trim() || !targetPassword) {
      setErrorMessage(t("auth.nameRequired") || "Preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      await login(targetEmail.trim(), targetPassword);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("errors.networkError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    handleLogin(quickEmail, quickPass);
  };

  const handleGoToRegister = () => {
    router.push("/registerUser");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={[styles.container, themeStyles.bg]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 16, 24),
              paddingBottom: Math.max(insets.bottom + 24, 32),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isExpoGo && (
            <View style={[styles.devBox, themeStyles.card, themeStyles.border]}>
              <View style={styles.devHeader}>
                <Ionicons name="flash" size={16} color={accent} />
                <Text style={[styles.devTitle, { color: accent }]}>{t("auth.devMode")}</Text>
              </View>
              <Text style={[styles.devDesc, themeStyles.subText]}>
                {t("auth.devModeDesc")}
              </Text>
              <View style={styles.devButtonsRow}>
                <TouchableOpacity
                  style={[styles.quickLoginBtn, { backgroundColor: accent }]}
                  activeOpacity={0.8}
                  onPress={() => handleQuickLogin("admin@admin.org", "admin")}
                  disabled={isLoading}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                  <Text style={styles.quickLoginBtnText}>{t("auth.adminUser")} (admin@admin.org)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickLoginBtnSecondary, themeStyles.inputBg, themeStyles.border]}
                  activeOpacity={0.8}
                  onPress={() => handleQuickLogin("usuario@presco.com", "user123")}
                  disabled={isLoading}
                >
                  <Ionicons name="person-outline" size={16} color={themeStyles.text.color} />
                  <Text style={[styles.quickLoginBtnTextSecondary, themeStyles.text]}>{t("auth.regularUser")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View
            style={[styles.formContainer, themeStyles.card, themeStyles.border]}
          >
            <Text style={[styles.welcomeText, themeStyles.text]}>
              {t("auth.loginTitle")}
            </Text>
            <Text style={[styles.subtitleText, themeStyles.subText]}>
              {t("auth.loginSubtitle")}
            </Text>

            {errorMessage !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <InputField
              icon="mail-outline"
              placeholder={t("auth.email")}
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                setErrorMessage("");
              }}
              keyboardType="email-address"
              themeStyles={themeStyles}
              isDark={isDark}
              editable={!isLoading}
            />

            <PasswordField
              placeholder={t("auth.password")}
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                setErrorMessage("");
              }}
              showPassword={showPassword}
              toggleShowPassword={() => setShowPassword(!showPassword)}
              themeStyles={themeStyles}
              isDark={isDark}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("auth.forgotPassword")}
            >
              <Text style={[styles.forgotPasswordText, { color: accent }]} maxFontSizeMultiplier={2}>
                {t("auth.forgotPassword")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: accent, shadowColor: accent },
                isLoading && styles.loginButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={() => handleLogin()}
              disabled={isLoading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("auth.loginButton")}
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{t("auth.loginButton")}</Text>
              )}
            </TouchableOpacity>
          </View>

          <FooterLinks
            onGoToRegister={handleGoToRegister}
            themeStyles={themeStyles}
            accent={accent}
            t={t}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}


// --- Componentes Internos ---

const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  themeStyles,
  isDark,
  editable = true,
}: any) => (
  <View style={[styles.inputContainer, themeStyles.inputBg]}>
    <Ionicons
      name={icon}
      size={20}
      color={isDark ? "#9CA3AF" : "#8E8E93"}
      style={styles.inputIcon}
    />
    <TextInput
      style={[styles.input, themeStyles.text]}
      placeholder={placeholder}
      placeholderTextColor={isDark ? "#9CA3AF" : "#8E8E93"}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize="none"
      editable={editable}
      accessible={true}
      accessibilityLabel={placeholder}
      maxFontSizeMultiplier={2}
    />
  </View>
);

const PasswordField = ({
  value,
  onChangeText,
  showPassword,
  toggleShowPassword,
  themeStyles,
  isDark,
  editable = true,
}: any) => (
  <View style={[styles.inputContainer, themeStyles.inputBg]}>
    <Ionicons
      name="lock-closed-outline"
      size={20}
      color={isDark ? "#9CA3AF" : "#8E8E93"}
      style={styles.inputIcon}
    />
    <TextInput
      style={[styles.input, themeStyles.text]}
      placeholder="••••••••"
      placeholderTextColor={isDark ? "#9CA3AF" : "#8E8E93"}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!showPassword}
      editable={editable}
      accessible={true}
      accessibilityLabel="Password"
      maxFontSizeMultiplier={2}
    />
    <TouchableOpacity
      onPress={toggleShowPassword}
      style={styles.eyeIcon}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Toggle password visibility"
    >
      <Ionicons
        name={showPassword ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={isDark ? "#9CA3AF" : "#8E8E93"}
      />
    </TouchableOpacity>
  </View>
);

const FooterLinks = ({
  onGoToRegister,
  themeStyles,
  accent,
  t,
}: {
  onGoToRegister: () => void;
  themeStyles: any;
  accent: string;
  t: (key: any) => string;
}) => (
  <View style={styles.footerContainer}>
    <Text style={[styles.footerText, themeStyles.subText]}>
      {t("auth.noAccount")}{" "}
    </Text>
    <TouchableOpacity onPress={onGoToRegister} activeOpacity={0.7}>
      <Text style={[styles.registerText, { color: accent }]}>{t("auth.signUp")}</Text>
    </TouchableOpacity>
  </View>
);

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  formContainer: {
    width: "100%",
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
  },
  registerText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  devBox: {
    width: "100%",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  devHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  devDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  devButtonsRow: {
    flexDirection: "column",
    gap: 8,
  },
  quickLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickLoginBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    flexShrink: 1,
  },
  quickLoginBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickLoginBtnTextSecondary: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
});

