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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { useAuth } from "../context/AuthContext";
import { ApiRequestError } from "../services/api";

const COLORS = {
  vibrantBlue: "#0062CC",
  white: "#FFFFFF",
  error: "#DC2626",
};

export default function LoginScreen() {
  const router = useRouter();
  const { themeStyles, isDark } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (
          err.textCode === "INVALID_CREDENTIALS" ||
          err.status === 401
        ) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError(err.message || "Erro ao fazer login. Tente novamente.");
        }
      } else {
        setError("Erro de conexão. Verifique sua internet.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToRegister = () => {
    router.push("/registerUser");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, themeStyles.bg]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

          <InputField
            icon="mail-outline"
            placeholder="Seu e-mail"
            value={email}
            onChangeText={(t: string) => {
              setEmail(t);
              setError(null);
            }}
            keyboardType="email-address"
            themeStyles={themeStyles}
            isDark={isDark}
          />

          <PasswordField
            value={password}
            onChangeText={(t: string) => {
              setPassword(t);
              setError(null);
            }}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            themeStyles={themeStyles}
            isDark={isDark}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={COLORS.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <FooterLinks
          onGoToRegister={handleGoToRegister}
          themeStyles={themeStyles}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
    />
    <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
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
}: {
  onGoToRegister: () => void;
  themeStyles: any;
}) => (
  <View style={styles.footerContainer}>
    <Text style={[styles.footerText, themeStyles.subText]}>
      Não tem uma conta?{" "}
    </Text>
    <TouchableOpacity onPress={onGoToRegister} activeOpacity={0.7}>
      <Text style={styles.registerText}>Cadastre-se</Text>
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: COLORS.vibrantBlue,
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: COLORS.vibrantBlue,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.vibrantBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
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
    color: COLORS.vibrantBlue,
    fontSize: 15,
    fontWeight: "bold",
  },
});
