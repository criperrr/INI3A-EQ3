import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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

const COLORS = {
  accent: "#2E7D32",
  white: "#FFFFFF",
};

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

export default function RegisterUser() {
  const router = useRouter();
  const { themeStyles, accent } = useTheme();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSaveUser = async () => {
    setErrorMessage("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage("Preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
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

  const handleGoToLogin = () => {
    router.back();
  };

  const clearError = () => setErrorMessage("");

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
            Crie sua conta
          </Text>
          <Text style={[styles.subtitleText, themeStyles.subText]}>
            Preencha seus dados para começar.
          </Text>

          {errorMessage !== "" && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <AvatarPicker imageUri={DEFAULT_AVATAR} accent={accent} />

          <InputField
            icon="person-outline"
            placeholder="Nome Completo"
            value={name}
            onChangeText={(text: string) => {
              setName(text);
              clearError();
            }}
            editable={!isLoading}
          />
          <InputField
            icon="mail-outline"
            placeholder="Seu e-mail"
            value={email}
            onChangeText={(text: string) => {
              setEmail(text);
              clearError();
            }}
            keyboardType="email-address"
            editable={!isLoading}
          />

          <PasswordField
            placeholder="Crie uma senha"
            value={password}
            onChangeText={(text: string) => {
              setPassword(text);
              clearError();
            }}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            editable={!isLoading}
          />

          <PasswordField
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChangeText={(text: string) => {
              setConfirmPassword(text);
              clearError();
            }}
            showPassword={showConfirmPassword}
            toggleShowPassword={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: accent, shadowColor: accent },
              isLoading && styles.saveButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleSaveUser}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <FooterLinks onGoToLogin={handleGoToLogin} accent={accent} />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// --- Componentes Internos ---

const AvatarPicker = ({
  imageUri,
  accent,
}: {
  imageUri: string;
  accent: string;
}) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.avatarContainer}>
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.avatarImage, themeStyles.border]}
        />
        <TouchableOpacity
          style={[styles.cameraBadge, { backgroundColor: accent }]}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  editable = true,
}: any) => {
  const { themeStyles, isDark } = useTheme();
  const placeholderColor = isDark ? "#9CA3AF" : "#8E8E93";
  return (
    <View
      style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={placeholderColor}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, themeStyles.text]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        editable={editable}
      />
    </View>
  );
};

const PasswordField = ({
  placeholder,
  value,
  onChangeText,
  showPassword,
  toggleShowPassword,
  editable = true,
}: any) => {
  const { themeStyles, isDark } = useTheme();
  const placeholderColor = isDark ? "#9CA3AF" : "#8E8E93";
  return (
    <View
      style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}
    >
      <Ionicons
        name="lock-closed-outline"
        size={20}
        color={placeholderColor}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, themeStyles.text]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        editable={editable}
      />
      <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
        <Ionicons
          name={showPassword ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={placeholderColor}
        />
      </TouchableOpacity>
    </View>
  );
};

const FooterLinks = ({
  onGoToLogin,
  accent,
}: {
  onGoToLogin: () => void;
  accent: string;
}) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.footerContainer}>
      <Text style={[styles.footerText, themeStyles.subText]}>
        Já tem uma conta?{" "}
      </Text>
      <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
        <Text style={[styles.loginText, { color: accent }]}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
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
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitleText: { fontSize: 14, marginBottom: 24, textAlign: "center" },
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
  avatarContainer: { alignItems: "center", marginBottom: 24 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: "100%" },
  eyeIcon: { padding: 8 },
  saveButton: {
    backgroundColor: COLORS.accent,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
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
  footerText: { fontSize: 15 },
  loginText: { color: COLORS.accent, fontSize: 15, fontWeight: "bold" },
});
