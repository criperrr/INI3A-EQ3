import React, { useState, useEffect, useCallback, useRef } from "react";
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Settings,
  Sun,
  Moon,
  Bell,
  Lock,
  User,
  X,
  Shield,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  Palette,
  Smartphone,
  Zap,
  Check,
  RefreshCw,
  Info,
  Vibrate,
  KeyRound,
  Database,
  Globe,
  Share2,
  Code2,
} from "lucide-react-native";
import { useTheme, MONET_PRESETS } from "../content/themeContent";
import { changePassword, deleteAccount } from "../services/auth";
import { BASE_URL } from "../services/api";

interface SettingsState {
  theme: "light" | "dark";
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
  privacy: "public" | "private";
  twoFactorAuth: boolean;
  dataCollection: boolean;
  hapticsEnabled: boolean;
  autoConfirmScan: boolean;
}

const STORAGE_KEY = "app_settings";

const DEFAULT_SETTINGS: SettingsState = {
  theme: "light",
  notifications: true,
  emailNotifications: false,
  language: "pt-BR",
  privacy: "private",
  twoFactorAuth: false,
  dataCollection: false,
  hapticsEnabled: true,
  autoConfirmScan: false,
};

// ─── Base64 Code Serialization Helpers ───────────────────────────
function encodeSettingsToCode(obj: any): string {
  const jsonStr = JSON.stringify(obj);
  let base64 = "";
  try {
    if (typeof btoa !== "undefined") {
      base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    } else if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(jsonStr, "utf-8").toString("base64");
    } else {
      base64 = encodeURIComponent(jsonStr);
    }
  } catch {
    base64 = encodeURIComponent(jsonStr);
  }
  return `PRESCO-CONFIG-${base64}`;
}

function decodeCodeToSettings(codeStr: string): any {
  const trimmed = codeStr.trim();
  let payload = trimmed;

  if (trimmed.startsWith("PRESCO-CONFIG-")) {
    payload = trimmed.replace("PRESCO-CONFIG-", "");
  } else if (trimmed.startsWith("PRESCO-")) {
    payload = trimmed.replace("PRESCO-", "");
  }

  // Direct JSON compatibility fallback
  if (payload.startsWith("{")) {
    return JSON.parse(payload);
  }

  let jsonStr = "";
  try {
    if (typeof atob !== "undefined") {
      jsonStr = decodeURIComponent(escape(atob(payload)));
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(payload, "base64").toString("utf-8");
    } else {
      jsonStr = decodeURIComponent(payload);
    }
  } catch {
    jsonStr = decodeURIComponent(payload);
  }

  return JSON.parse(jsonStr);
}

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clearCacheModalOpen, setClearCacheModalOpen] = useState(false);

  // Export Settings state
  const [generatedCode, setGeneratedCode] = useState("");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Import Settings state
  const [importCodeText, setImportCodeText] = useState("");
  const [importError, setImportError] = useState("");

  // Loading states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

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
    applyThemeSettingsBatch,
  } = useTheme();

  const showSavedIndicator = useCallback(() => {
    setIsSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  }, []);

  const triggerHaptic = useCallback(async () => {
    if (settings.hapticsEnabled && Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Silently ignore if unsupported
      }
    }
  }, [settings.hapticsEnabled]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    };
    loadSettings();

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkApiHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${BASE_URL}/products/barcode/ping`, {
          signal: controller.signal,
          headers: { "Bypass-Tunnel-Reminder": "true" },
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (isMounted) {
          setApiStatus(res ? "online" : "offline");
        }
      } catch {
        if (isMounted) setApiStatus("offline");
      }
    };
    checkApiHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persists settings immediately on any change
  const persistSettingImmediate = useCallback(
    async <K extends keyof SettingsState>(
      key: K,
      value: SettingsState[K],
      overrideSettings?: SettingsState,
    ) => {
      try {
        const currentStored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsedStored = currentStored ? JSON.parse(currentStored) : {};
        const base = overrideSettings || settings;
        const updated = {
          ...parsedStored,
          ...base,
          [key]: value,
          amoledEnabled,
          monetEnabled,
          syncWithSystemAndroid,
          monetSeedColor,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        showSavedIndicator();
      } catch (error) {
        console.error("Erro ao salvar automaticamente:", error);
      }
    },
    [settings, amoledEnabled, monetEnabled, syncWithSystemAndroid, monetSeedColor, showSavedIndicator],
  );

  const handleSettingChange = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    triggerHaptic();
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettingImmediate(key, value, next);
      return next;
    });
    setPasswordError("");
  };

  const handleLanguageSelect = () => {
    triggerHaptic();
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

  const handleReset = async () => {
    triggerHaptic();
    Alert.alert(
      "Redefinir Configurações",
      "Deseja restaurar todas as configurações para o padrão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Redefinir",
          style: "destructive",
          onPress: async () => {
            setSettings(DEFAULT_SETTINGS);
            await applyThemeSettingsBatch({
              theme: DEFAULT_SETTINGS.theme,
              amoledEnabled: false,
              monetEnabled: false,
              syncWithSystemAndroid: false,
              monetSeedColor: MONET_PRESETS[0].hex,
            });
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(DEFAULT_SETTINGS),
            );
            showSavedIndicator();
          },
        },
      ],
    );
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("A nova senha e confirmação não coincidem.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      triggerHaptic();
      Alert.alert("Sucesso", "Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOpen(false);
    } catch (err: any) {
      setPasswordError(
        err?.message || "Erro ao alterar a senha. Verifique sua senha atual.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      triggerHaptic();
      await deleteAccount();
      await AsyncStorage.removeItem(STORAGE_KEY);
      setDeleteModalOpen(false);
      Alert.alert("Conta Removida", "Sua conta foi excluída com sucesso.", [
        {
          text: "OK",
          onPress: () => router.replace("/login" as any),
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.message || "Não foi possível excluir a conta no momento.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Generate & Open Export Code Modal
  const handleOpenExportModal = () => {
    triggerHaptic();
    const exportBundle = {
      app: "PResco",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      settings: {
        ...settings,
        amoledEnabled,
        monetEnabled,
        syncWithSystemAndroid,
        monetSeedColor,
      },
    };

    const code = encodeSettingsToCode(exportBundle);
    setGeneratedCode(code);
    setExportModalOpen(true);
  };

  // Share Export Code
  const handleShareExportCode = async () => {
    triggerHaptic();
    try {
      await Share.share({
        message: generatedCode,
        title: "Código de Configuração - PResco",
      });
    } catch (error) {
      console.error("Erro ao compartilhar código:", error);
    }
  };

  // Import Settings from Code
  const handleImportSettings = async () => {
    setImportError("");
    if (!importCodeText.trim()) {
      setImportError("Cole o código de configuração antes de importar.");
      return;
    }

    try {
      const parsed = decodeCodeToSettings(importCodeText);
      const incoming = parsed.settings || parsed;

      if (typeof incoming !== "object" || incoming === null) {
        throw new Error("Formato inválido.");
      }

      const mergedSettings: SettingsState = {
        theme: incoming.theme === "dark" ? "dark" : "light",
        notifications: Boolean(incoming.notifications ?? settings.notifications),
        emailNotifications: Boolean(
          incoming.emailNotifications ?? settings.emailNotifications,
        ),
        language: incoming.language || settings.language,
        privacy: incoming.privacy === "public" ? "public" : "private",
        twoFactorAuth: Boolean(
          incoming.twoFactorAuth ?? settings.twoFactorAuth,
        ),
        dataCollection: Boolean(
          incoming.dataCollection ?? settings.dataCollection,
        ),
        hapticsEnabled: Boolean(
          incoming.hapticsEnabled ?? settings.hapticsEnabled,
        ),
        autoConfirmScan: Boolean(
          incoming.autoConfirmScan ?? settings.autoConfirmScan,
        ),
      };

      setSettings(mergedSettings);

      await applyThemeSettingsBatch({
        theme: mergedSettings.theme,
        amoledEnabled: incoming.amoledEnabled ?? amoledEnabled,
        monetEnabled: incoming.monetEnabled ?? monetEnabled,
        syncWithSystemAndroid:
          incoming.syncWithSystemAndroid ?? syncWithSystemAndroid,
        monetSeedColor: incoming.monetSeedColor ?? monetSeedColor,
      });

      triggerHaptic();
      showSavedIndicator();
      setImportModalOpen(false);
      setImportCodeText("");
      Alert.alert("Sucesso", "Configurações importadas e aplicadas!");
    } catch (err: any) {
      setImportError(
        "Código de configuração inválido ou corrompido. Verifique o código e tente novamente.",
      );
    }
  };

  // Clear Cache
  const handleClearCache = async () => {
    try {
      setIsClearingCache(true);
      triggerHaptic();
      const allKeys = await AsyncStorage.getAllKeys();
      const nonEssentialKeys = allKeys.filter(
        (k) => !k.startsWith("@presco:") && k !== STORAGE_KEY,
      );
      if (nonEssentialKeys.length > 0) {
        await AsyncStorage.multiRemove(nonEssentialKeys);
      }
      setClearCacheModalOpen(false);
      Alert.alert("Cache Limpo", "Os dados temporários e cache local foram limpos.");
    } catch (error) {
      Alert.alert("Erro", "Falha ao limpar o cache.");
    } finally {
      setIsClearingCache(false);
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
          <Settings size={26} color={accent} />
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
              <Moon size={20} color={accent} />
            ) : (
              <Sun size={20} color={accent} />
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
                showSavedIndicator();
              }}
            />
          </View>

          {/* AMOLED Sub-Option */}
          {isSettingsDark && (
            <View style={[styles.row, styles.indentedRow]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Zap size={16} color={accent} />
                  <Text style={[styles.rowLabel, themeStyles.text]}>
                    Modo AMOLED
                  </Text>
                </View>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  Preto absoluto (economiza bateria em telas OLED)
                </Text>
              </View>
              <Switch
                value={amoledEnabled}
                trackColor={{ false: "#D4DCC8", true: accent }}
                onValueChange={(val) => {
                  triggerHaptic();
                  setAmoledEnabled(val);
                  showSavedIndicator();
                }}
              />
            </View>
          )}

          <TouchableOpacity style={styles.row} onPress={handleLanguageSelect}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Globe size={18} color={accent} />
              <View>
                <Text style={[styles.rowLabel, themeStyles.text]}>Idioma</Text>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  {settings.language}
                </Text>
              </View>
            </View>
            <Text style={[styles.linkText, { color: accent }]}>Alterar</Text>
          </TouchableOpacity>
        </View>

        {/* Material You / Monet Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Cores e Material You
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Cores Dinâmicas
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Gera a paleta a partir de tons harmônicos
              </Text>
            </View>
            <Switch
              value={monetEnabled}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(value) => {
                triggerHaptic();
                setMonetEnabled(value);
                showSavedIndicator();
              }}
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
                    Utiliza as cores do papel de parede do dispositivo
                  </Text>
                </View>
                <Switch
                  value={syncWithSystemAndroid}
                  trackColor={{ false: "#D4DCC8", true: accent }}
                  onValueChange={(val) => {
                    triggerHaptic();
                    setSyncWithSystemAndroid(val);
                    showSavedIndicator();
                  }}
                />
              </View>

              {/* Seed Color Palette Picker */}
              {!syncWithSystemAndroid && (
                <View style={{ marginTop: 10 }}>
                  <Text
                    style={[
                      styles.rowSubLabel,
                      themeStyles.subText,
                      { marginBottom: 10 },
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
                          onPress={() => {
                            triggerHaptic();
                            setMonetSeedColor(preset.hex);
                            showSavedIndicator();
                          }}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.colorCircle,
                              { backgroundColor: preset.hex },
                            ]}
                          >
                            {isSelected && (
                              <Check size={18} color="#FFFFFF" />
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

        {/* Scanner & Interaction Preferences */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Vibrate size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Scanner & Interatividade
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Vibração / Resposta Tátil
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Feedback háptico ao escanear códigos de barras
              </Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) => handleSettingChange("hapticsEnabled", val)}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Confirmação Direta de Scan
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Avança automaticamente ao detectar código com alta precisão
              </Text>
            </View>
            <Switch
              value={settings.autoConfirmScan}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) =>
                handleSettingChange("autoConfirmScan", val)
              }
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Notificações
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Notificações Push
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Alertas de quedas de preço e ofertas
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) => handleSettingChange("notifications", val)}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Notificações por E-mail
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Resumo semanal de preços e relatórios
              </Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) =>
                handleSettingChange("emailNotifications", val)
              }
            />
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Privacidade & Segurança
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Perfil Privado
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Ocultar informações de contribuições no ranking público
              </Text>
            </View>
            <Switch
              value={settings.privacy === "private"}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) =>
                handleSettingChange("privacy", val ? "private" : "public")
              }
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Autenticação de Dois Fatores (2FA)
              </Text>
            </View>
            <Switch
              value={settings.twoFactorAuth}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) => handleSettingChange("twoFactorAuth", val)}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                Coleta Anônima de Telemetria
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                Ajuda a melhorar o desempenho do scanner
              </Text>
            </View>
            <Switch
              value={settings.dataCollection}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={(val) =>
                handleSettingChange("dataCollection", val)
              }
            />
          </View>
        </View>

        {/* Backup & Code Transfer Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Code2 size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Código de Configuração & Backup
            </Text>
          </View>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
              onPress={handleOpenExportModal}
            >
              <Download
                size={16}
                color={globalIsDark ? "#FFF" : "#000"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionBtnText, themeStyles.text]}>
                Exportar (Gerar Código)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
              onPress={() => {
                triggerHaptic();
                setImportError("");
                setImportModalOpen(true);
              }}
            >
              <Upload
                size={16}
                color={globalIsDark ? "#FFF" : "#000"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionBtnText, themeStyles.text]}>
                Importar por Código
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
              onPress={() => {
                triggerHaptic();
                setClearCacheModalOpen(true);
              }}
            >
              <RefreshCw
                size={16}
                color={globalIsDark ? "#FFF" : "#000"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionBtnText, themeStyles.text]}>
                Limpar Cache Local do App
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Management Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <User size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>Conta</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
            onPress={() => {
              triggerHaptic();
              setPasswordError("");
              setChangePasswordOpen(true);
            }}
          >
            <KeyRound
              size={16}
              color={globalIsDark ? "#FFF" : "#000"}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.actionBtnText, themeStyles.text]}>
              Alterar Senha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnRedLight, styles.rowCenter]}
            onPress={() => {
              triggerHaptic();
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.textRed}>Deletar Minha Conta</Text>
          </TouchableOpacity>
        </View>

        {/* System & About Section */}
        <View style={[styles.section, themeStyles.card, themeStyles.border]}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={accent} />
            <Text style={[styles.sectionTitle, themeStyles.text]}>
              Sobre o Aplicativo
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, themeStyles.subText]}>Versão</Text>
            <Text style={[styles.infoValue, themeStyles.text]}>1.0.0 (Build 42)</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, themeStyles.subText]}>Ambiente</Text>
            <Text style={[styles.infoValue, themeStyles.text]}>
              {Platform.OS.toUpperCase()} • Expo SDK 54
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, themeStyles.subText]}>Status da API</Text>
            <View style={styles.badgeContainer}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      apiStatus === "online"
                        ? "#10B981"
                        : apiStatus === "offline"
                        ? "#EF4444"
                        : "#F59E0B",
                  },
                ]}
              />
              <Text style={[styles.infoValue, themeStyles.text]}>
                {apiStatus === "online"
                  ? "Conectado"
                  : apiStatus === "offline"
                  ? "Offline"
                  : "Verificando..."}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Restore Defaults Action */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.resetOnlyBtn, themeStyles.btnToggleOff]}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <X
              size={18}
              color={globalIsDark ? "#FFF" : "#000"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.resetBtnText, themeStyles.text]}>
              Restaurar Padrões de Fábrica
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Export Code Modal */}
      <Modal transparent visible={exportModalOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, themeStyles.card]}>
              <View style={styles.rowCenter}>
                <Code2 size={22} color={accent} />
                <Text
                  style={[
                    styles.modalTitle,
                    { marginLeft: 8, marginBottom: 0 },
                    themeStyles.text,
                  ]}
                >
                  Código de Configuração
                </Text>
              </View>

              <Text
                style={[
                  styles.modalDescription,
                  themeStyles.subText,
                  { marginTop: 10 },
                ]}
              >
                Copie o código abaixo ou compartilhe para transferir suas preferências
                para outro dispositivo:
              </Text>

              <TextInput
                multiline
                numberOfLines={3}
                editable={false}
                selectTextOnFocus
                value={generatedCode}
                style={[
                  styles.input,
                  styles.codeDisplayBox,
                  themeStyles.inputBg,
                  themeStyles.text,
                ]}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, themeStyles.btnToggleOff]}
                  onPress={() => setExportModalOpen(false)}
                >
                  <Text style={themeStyles.text}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleShareExportCode}
                >
                  <Share2 size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textWhite}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Import Code Modal */}
      <Modal transparent visible={importModalOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, themeStyles.card]}>
              <Text style={[styles.modalTitle, themeStyles.text]}>
                Importar por Código
              </Text>
              <Text style={[styles.modalDescription, themeStyles.subText]}>
                Cole abaixo o código de configuração gerado (ex: PRESCO-CONFIG-...):
              </Text>

              <TextInput
                multiline
                numberOfLines={4}
                placeholder="PRESCO-CONFIG-..."
                placeholderTextColor="#9CA3AF"
                value={importCodeText}
                onChangeText={setImportCodeText}
                style={[
                  styles.input,
                  styles.textArea,
                  themeStyles.inputBg,
                  themeStyles.text,
                ]}
              />

              {importError ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#991B1B" />
                  <Text style={styles.errorText}>{importError}</Text>
                </View>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, themeStyles.btnToggleOff]}
                  onPress={() => {
                    setImportModalOpen(false);
                    setImportError("");
                  }}
                >
                  <Text style={themeStyles.text}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleImportSettings}
                >
                  <Text style={styles.textWhite}>Importar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
                placeholder="Senha Atual"
                placeholderTextColor="#9CA3AF"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={[styles.input, themeStyles.inputBg, themeStyles.text]}
              />

              <TextInput
                secureTextEntry
                placeholder="Nova Senha (mínimo 6 caracteres)"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.input, themeStyles.inputBg, themeStyles.text]}
              />

              <TextInput
                secureTextEntry
                placeholder="Confirmar Nova Senha"
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
                  disabled={isChangingPassword}
                >
                  <Text style={themeStyles.text}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.textWhite}>Atualizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Clear Cache Confirmation Modal */}
      <Modal transparent visible={clearCacheModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card]}>
            <View style={styles.rowCenter}>
              <RefreshCw size={22} color={accent} />
              <Text
                style={[styles.modalTitle, { marginLeft: 8 }, themeStyles.text]}
              >
                Limpar Cache Local
              </Text>
            </View>
            <Text style={[styles.modalDescription, themeStyles.subText]}>
              Isso limpará os dados temporários e o histórico armazenado
              localmente. Sua conta continuará conectada. Deseja continuar?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => setClearCacheModalOpen(false)}
                disabled={isClearingCache}
              >
                <Text style={themeStyles.text}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: accent }]}
                onPress={handleClearCache}
                disabled={isClearingCache}
              >
                {isClearingCache ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.textWhite}>Limpar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
              e todos os seus dados e contribuições serão removidos do sistema.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => setDeleteModalOpen(false)}
                disabled={isDeletingAccount}
              >
                <Text style={themeStyles.text}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnRed]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.textWhite}>Deletar</Text>
                )}
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
    paddingVertical: 18,
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
  section: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "bold", marginLeft: 8 },
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
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowSubLabel: { fontSize: 12, marginTop: 2 },
  linkText: { fontWeight: "600", fontSize: 14 },
  actionButtonGroup: { marginTop: 4 },
  actionBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  actionBtnText: { fontWeight: "500", fontSize: 14 },
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
    marginTop: 8,
    marginBottom: 36,
  },
  resetOnlyBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnText: {
    fontWeight: "600",
    fontSize: 15,
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
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  modalDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    fontSize: 15,
  },
  codeDisplayBox: {
    height: 80,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    textAlignVertical: "top",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, marginLeft: 6, flex: 1 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  monetColorsContainer: {
    paddingTop: 6,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorOption: {
    alignItems: "center",
    width: 66,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  colorName: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default SettingsScreen;
