import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Share,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Settings,
  Sun,
  Moon,
  Bell,
  Lock,
  User,
  Save,
  X,
  Shield,
  Download,
  Trash2,
  AlertCircle,
  Palette,
  Smartphone,
  Zap,
} from "lucide-react-native";
import { useTheme, MONET_PRESETS } from "../content/themeContent";

interface SettingsState {
  theme: "light" | "dark";
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
  privacy: "public" | "private";
  autoSave: boolean;
  twoFactorAuth: boolean;
  dataCollection: boolean;
}

const STORAGE_KEY = "app_settings";
const DEFAULT_SETTINGS: SettingsState = {
  theme: "light",
  notifications: true,
  emailNotifications: false,
  language: "pt-BR",
  privacy: "private",
  autoSave: true,
  twoFactorAuth: false,
  dataCollection: false,
};

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const {
    isDark: globalIsDark,
    themeStyles,
    setGlobalTheme,
    accent,
    amoledEnabled,
    setAmoledEnabled,
    monetEnabled,
    syncWithSystemAndroid,
    monetSeedColor,
    setMonetEnabled,
    setSyncWithSystemAndroid,
    setMonetSeedColor,
  } = useTheme();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSettingChange = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
    setPasswordError("");
  };

  const handleLanguageSelect = () => {
    Alert.alert("Selecionar Idioma", "Escolha seu idioma preferido:", [
      {
        text: "Português (Brasil)",
        onPress: () => handleSettingChange("language", "pt-BR"),
      },
      {
        text: "English (US)",
        onPress: () => handleSettingChange("language", "en-US"),
      },
      {
        text: "Español",
        onPress: () => handleSettingChange("language", "es-ES"),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setGlobalTheme(settings.theme);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    }
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.removeItem(STORAGE_KEY);
    setGlobalTheme(DEFAULT_SETTINGS.theme);
    setAmoledEnabled(false);
    setMonetEnabled(false);
    setSyncWithSystemAndroid(false);
    setIsSaved(false);
    setPasswordError("");
  };

  const handleChangePassword = () => {
    setPasswordError("");
    if (!newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem");
    } else {
      Alert.alert("Sucesso", "Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setDeleteModalOpen(false);
    Alert.alert("Conta deletada", "Sua conta foi removida.");
  };

  const handleExportSettings = async () => {
    const dataStr = JSON.stringify(settings, null, 2);
    try {
      await Share.share({
        message: dataStr,
        title: "Configurações PResco",
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
    }
  };

  const isSettingsDark = settings.theme === "dark";

  return (
    <ScrollView 
      style={[styles.container, themeStyles.bg]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={[styles.header, themeStyles.headerBg]}>
        <View style={styles.headerTitleContainer}>
          <Settings size={28} color={accent} />
          <Text style={[styles.headerTitle, themeStyles.text]}>
            Configurações
          </Text>
        </View>
        {isSaved && (
          <View style={styles.savedAlert}>
            <Text style={styles.savedAlertText}>✓ Salvo</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Appearance Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            {isSettingsDark ? (
              <Moon size={22} color={accent} />
            ) : (
              <Sun size={22} color={accent} />
            )}
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Aparência
            </Text>
          </View>

          <View style={styles.row}>
            <View>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Tema Escuro
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                {isSettingsDark ? "Ativado" : "Desativado"}
              </Text>
            </View>
            <Switch
              value={isSettingsDark}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() => {
                const newTheme = isSettingsDark ? "light" : "dark";
                handleSettingChange("theme", newTheme);
                setGlobalTheme(newTheme);
              }}
            />
          </View>

          {/* AMOLED Sub-Option (Only visible when Dark Theme is ON) */}
          {isSettingsDark && (
            <View style={[styles.row, styles.indentedRow]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Zap size={16} color={accent} />
                  <Text style={[styles.rowLabel, themeStyles.text]}>
                    Modo Economico
                  </Text>
                </View>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  Fundo 100% preto para economizar bateria em telas AMOLED
                </Text>
              </View>
              <Switch
                value={amoledEnabled}
                trackColor={{ false: "#D4DCC8", true: accent }}
                onValueChange={(val) => setAmoledEnabled(val)}
              />
            </View>
          )}

          <TouchableOpacity style={styles.row} onPress={handleLanguageSelect}>
            <View>
              <Text style={[styles.rowLabel, themeStyles.text]}>Idioma</Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                {settings.language}
              </Text>
            </View>
            <Text style={[styles.linkText, { color: accent }]}>Alterar</Text>
          </TouchableOpacity>
        </View>

        {/* Material You / Monet Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Palette size={22} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Material You
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Cores Dinâmicas
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Gera a paleta de cores a partir de cores semente
              </Text>
            </View>
            <Switch
              value={monetEnabled}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(value) => setMonetEnabled(value)}
            />
          </View>

          {monetEnabled && (
            <View style={styles.monetColorsContainer}>
              {/* Android System Sync Toggle */}
              <View
                style={[
                  styles.row,
                  { borderBottomWidth: 0, paddingVertical: 8 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Smartphone size={16} color={accent} />
                    <Text style={[styles.rowLabel, themeStyles.text]}>
                      Sincronizar com o Sistema (Android)
                    </Text>
                  </View>
                  <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                    Utiliza a paleta de cores do papel de parede do Android
                  </Text>
                </View>
                <Switch
                  value={syncWithSystemAndroid}
                  trackColor={{ false: "#D4DCC8", true: accent }}
                  onValueChange={(val) => setSyncWithSystemAndroid(val)}
                />
              </View>

              {/* Seed Color Palette Picker (Only if system sync is off or manual override) */}
              {!syncWithSystemAndroid && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[
                      styles.rowSubLabel,
                      themeStyles.subText,
                      { marginBottom: 12 },
                    ]}
                  >
                    Escolha a cor semente:
                  </Text>
                  <View style={styles.colorGrid}>
                    {MONET_PRESETS.map((preset) => {
                      const isSelected = monetSeedColor === preset.hex;
                      return (
                        <TouchableOpacity
                          key={preset.hex}
                          style={[
                            styles.colorOption,
                            {
                              borderColor: isSelected ? accent : "transparent",
                            },
                          ]}
                          onPress={() => setMonetSeedColor(preset.hex)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.colorCircle,
                              { backgroundColor: preset.hex },
                            ]}
                          >
                            {isSelected && (
                              <Text style={styles.colorCheck}>✓</Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.colorName,
                              themeStyles.subText,
                              isSelected && {
                                color: accent,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {preset.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Bell size={22} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Notificações
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Notificações Push
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() =>
                handleSettingChange("notifications", !settings.notifications)
              }
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Notificações por Email
              </Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() =>
                handleSettingChange(
                  "emailNotifications",
                  !settings.emailNotifications,
                )
              }
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Salvamento Automático
              </Text>
            </View>
            <Switch
              value={settings.autoSave}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() =>
                handleSettingChange("autoSave", !settings.autoSave)
              }
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Lock size={22} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Privacidade
            </Text>
          </View>

          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[
                styles.privacyButton,
                settings.privacy === "private"
                  ? { backgroundColor: accent }
                  : themeStyles.btnToggleOff,
              ]}
              onPress={() => handleSettingChange("privacy", "private")}
            >
              <Text
                style={
                  settings.privacy === "private"
                    ? styles.textWhite
                    : themeStyles.text
                }
              >
                {settings.privacy === "private" ? "✓ Privado" : "Privado"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyButton,
                settings.privacy === "public"
                  ? { backgroundColor: accent }
                  : themeStyles.btnToggleOff,
              ]}
              onPress={() => handleSettingChange("privacy", "public")}
            >
              <Text
                style={
                  settings.privacy === "public"
                    ? styles.textWhite
                    : themeStyles.text
                }
              >
                {settings.privacy === "public" ? "✓ Público" : "Público"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Shield size={22} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Segurança
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Autenticação de Dois Fatores
              </Text>
            </View>
            <Switch
              value={settings.twoFactorAuth}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() =>
                handleSettingChange("twoFactorAuth", !settings.twoFactorAuth)
              }
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Coleta de Dados
              </Text>
            </View>
            <Switch
              value={settings.dataCollection}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={() =>
                handleSettingChange("dataCollection", !settings.dataCollection)
              }
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <User size={22} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>Conta</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, themeStyles.btnToggleOff]}
            onPress={() => setChangePasswordOpen(true)}
          >
            <Text style={[styles.actionBtnText, themeStyles.text]}>
              Alterar Senha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnRedLight]}
            onPress={() => setDeleteModalOpen(true)}
          >
            <Text style={styles.textRed}>Deletar Conta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              themeStyles.btnToggleOff,
              styles.rowCenter,
            ]}
            onPress={handleExportSettings}
          >
            <Download
              size={16}
              color={globalIsDark ? "#FFF" : "#000"}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.actionBtnText, themeStyles.text]}>
              Exportar Configurações
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: accent }]}
            onPress={handleSave}
          >
            <Save size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.textWhite}>Salvar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, themeStyles.btnToggleOff]}
            onPress={handleReset}
          >
            <X
              size={18}
              color={globalIsDark ? "#FFF" : "#000"}
              style={{ marginRight: 6 }}
            />
            <Text style={themeStyles.text}>Resetar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal transparent visible={changePasswordOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, themeStyles.card]}>
              <Text style={[styles.modalTitle, themeStyles.text]}>
              Alterar Senha
            </Text>
            <TextInput
              secureTextEntry
              placeholder="Nova Senha"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, themeStyles.inputBg, themeStyles.text]}
            />
            <TextInput
              secureTextEntry
              placeholder="Confirmar Senha"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={[styles.input, themeStyles.inputBg, themeStyles.text]}
            />
            {passwordError ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#991B1B" />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => {
                  setChangePasswordOpen(false);
                  setPasswordError("");
                }}
              >
                <Text style={themeStyles.text}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: accent }]}
                onPress={handleChangePassword}
              >
                <Text style={styles.textWhite}>Alterar</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Account Modal */}
      <Modal transparent visible={deleteModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card]}>
            <View style={styles.rowCenter}>
              <AlertCircle size={24} color="#DC2626" />
              <Text
                style={[styles.modalTitle, { marginLeft: 8 }, themeStyles.text]}
              >
                Deletar Conta
              </Text>
            </View>
            <Text style={[styles.modalDescription, themeStyles.subText]}>
              Tem certeza que deseja deletar sua conta? Esta ação é irreversível
              e todos os seus dados serão perdidos.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => setDeleteModalOpen(false)}
              >
                <Text style={themeStyles.text}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnRed]}
                onPress={handleDeleteAccount}
              >
                <Trash2 size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.textWhite}>Deletar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", marginLeft: 10 },
  savedAlert: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savedAlertText: { color: "#065F46", fontSize: 12, fontWeight: "600" },
  content: { padding: 16 },
  section: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginLeft: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  indentedRow: {
    paddingLeft: 12,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
    marginVertical: 4,
    paddingRight: 8,
  },
  rowLabel: { fontSize: 16, fontWeight: "500" },
  rowSubLabel: { fontSize: 13, marginTop: 2 },
  linkText: { fontWeight: "600" },
  privacyContainer: { flexDirection: "row", gap: 10, marginTop: 4 },
  privacyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  actionBtnText: { fontWeight: "500" },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnRed: { backgroundColor: "#DC2626" },
  btnRedLight: { backgroundColor: "#FEE2E2" },
  textWhite: { color: "#FFFFFF", fontWeight: "600" },
  textRed: { color: "#991B1B", fontWeight: "600" },
  footerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 14 },
  modalDescription: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, marginLeft: 6 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  monetColorsContainer: {
    paddingTop: 8,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    alignItems: "center",
    width: 68,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  colorCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  colorCheck: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  colorName: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
});

export default SettingsScreen;
