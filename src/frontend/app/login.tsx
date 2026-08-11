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
import { useTheme } from "../content/themeContent";
import { useAuth, ApiError } from "../content/authContext";

export default function LoginScreen() {
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Erro ao conectar com o servidor.");
      }
    } finally {
      setIsLoading(false);
    }
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
          style={[styles.formContainer, themeStyles.card, themeStyles.border]}
        >
          <Text style={[styles.welcomeText, themeStyles.text]}>
            Bem-vindo de volta!
          </Text>
          <Text style={[styles.subtitleText, themeStyles.subText]}>
            Faça login para continuar no PResco.
          </Text>

          {errorMessage !== "" && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputField
            icon="mail-outline"
            placeholder="Seu e-mail"
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
            accessibilityLabel="Esqueceu a senha?"
          >
            <Text style={[styles.forgotPasswordText, { color: accent }]} maxFontSizeMultiplier={2}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: accent, shadowColor: accent },
              isLoading && styles.loginButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <FooterLinks
          onGoToRegister={handleGoToRegister}
          themeStyles={themeStyles}
          accent={accent}
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
      placeholder="Sua senha"
      placeholderTextColor={isDark ? "#9CA3AF" : "#8E8E93"}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!showPassword}
      editable={editable}
      accessible={true}
      accessibilityLabel="Sua senha"
      maxFontSizeMultiplier={2}
    />
    <TouchableOpacity
      onPress={toggleShowPassword}
      style={styles.eyeIcon}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
}: {
  onGoToRegister: () => void;
  themeStyles: any;
  accent: string;
}) => (
  <View style={styles.footerContainer}>
    <Text style={[styles.footerText, themeStyles.subText]}>
      Não tem uma conta?{" "}
    </Text>
    <TouchableOpacity onPress={onGoToRegister} activeOpacity={0.7}>
      <Text style={[styles.registerText, { color: accent }]}>Cadastre-se</Text>
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
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  registerText: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
