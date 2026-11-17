import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  KeyboardAvoidingView,
  InteractionManager,
} from "react-native";
import { FocusedInputWrapper } from "../components/FocusedInputWrapper";
import { AnimatedScreenContainer } from "../components/AnimatedMotion";
import { appAlert } from "../components/AppAlertProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useTheme, MONET_PRESETS, getCachedAppSettings, setCachedAppSettings } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import { changePassword, deleteAccount } from "../services/auth";
import { BASE_URL } from "../services/api";
import { resetTutorialStatus } from "../utils/tutorialStorage";
import { Image as ExpoImage } from "expo-image";
import { fetchPendingOccurrences } from "../services/ocurrencyService";
import { fetchPendingProducts } from "../services/productService";

const OpenFoodFactsStatusTab = React.lazy(
  () => import("../components/OpenFoodFactsStatusTab"),
);
const OnboardingTutorialModal = React.lazy(
  () => import("../components/OnboardingTutorialModal"),
);

interface LocalSettingsState {
  notifications: boolean;
  emailNotifications: boolean;
  privacy: "public" | "private";
  twoFactorAuth: boolean;
  dataCollection: boolean;
  hapticsEnabled: boolean;
  autoConfirmScan: boolean;
}

const STORAGE_KEY = "app_settings";

const DEFAULT_LOCAL_SETTINGS: LocalSettingsState = {
  notifications: true,
  emailNotifications: false,
  privacy: "private",
  twoFactorAuth: false,
  dataCollection: false,
  hapticsEnabled: true,
  autoConfirmScan: false,
};

function buildLocalSettingsFromCache(): LocalSettingsState {
  const cached = getCachedAppSettings();
  if (!cached) return DEFAULT_LOCAL_SETTINGS;
  return {
    notifications:
      typeof cached.notifications === "boolean"
        ? cached.notifications
        : DEFAULT_LOCAL_SETTINGS.notifications,
    emailNotifications:
      typeof cached.emailNotifications === "boolean"
        ? cached.emailNotifications
        : DEFAULT_LOCAL_SETTINGS.emailNotifications,
    privacy: cached.privacy === "public" ? "public" : "private",
    twoFactorAuth:
      typeof cached.twoFactorAuth === "boolean"
        ? cached.twoFactorAuth
        : DEFAULT_LOCAL_SETTINGS.twoFactorAuth,
    dataCollection:
      typeof cached.dataCollection === "boolean"
        ? cached.dataCollection
        : DEFAULT_LOCAL_SETTINGS.dataCollection,
    hapticsEnabled:
      typeof cached.hapticsEnabled === "boolean"
        ? cached.hapticsEnabled
        : DEFAULT_LOCAL_SETTINGS.hapticsEnabled,
    autoConfirmScan:
      typeof cached.autoConfirmScan === "boolean"
        ? cached.autoConfirmScan
        : DEFAULT_LOCAL_SETTINGS.autoConfirmScan,
  };
}

// ─── Base64 Code Serialization Helpers ───────────────────────────
declare const Buffer: any;

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

const AppearanceSection = React.memo(
  ({
    isDark,
    amoledEnabled,
    accent,
    themeStyles,
    t,
    isSystemLanguage,
    languageInfo,
    onToggleTheme,
    onToggleAmoled,
    onOpenLanguageModal,
  }: {
    isDark: boolean;
    amoledEnabled: boolean;
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    isSystemLanguage: boolean;
    languageInfo: { flag: string; nativeName: string };
    onToggleTheme: () => void;
    onToggleAmoled: (val: boolean) => void;
    onOpenLanguageModal: () => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name={isDark ? "moon-outline" : "sunny-outline"}
          size={20}
          color={accent}
        />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("settings.appearance")}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rowLabel, themeStyles.text]} numberOfLines={1}>
            {t("settings.themeDark")}
          </Text>
          <Text style={[styles.rowSubLabel, themeStyles.subText]} numberOfLines={1}>
            {isDark ? t("settings.active") : t("settings.inactive")}
          </Text>
        </View>
        <Switch
          testID="theme-dark-switch"
          value={isDark}
          trackColor={{ false: "#D4DCC8", true: accent }}
          onValueChange={onToggleTheme}
        />
      </View>

      {isDark && (
        <View style={[styles.row, styles.indentedRow]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flash-outline" size={16} color={accent} />
              <Text style={[styles.rowLabel, themeStyles.text]} numberOfLines={1}>
                {t("settings.amoledDark")}
              </Text>
            </View>
            <Text style={[styles.rowSubLabel, themeStyles.subText]} numberOfLines={2}>
              {t("settings.amoledSubtitle")}
            </Text>
          </View>
          <Switch
            testID="theme-amoled-switch"
            value={amoledEnabled}
            trackColor={{ false: "#D4DCC8", true: accent }}
            onValueChange={onToggleAmoled}
          />
        </View>
      )}

      <TouchableOpacity style={styles.row} onPress={onOpenLanguageModal}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 10 }}>
          <Ionicons name="globe-outline" size={18} color={accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, themeStyles.text]} numberOfLines={1}>
              {t("settings.language")}
            </Text>
            <Text style={[styles.rowSubLabel, themeStyles.subText]} numberOfLines={1}>
              {isSystemLanguage
                ? `${t("settings.systemDefaultLanguage")} (${languageInfo.nativeName})`
                : `[${languageInfo.flag}] ${languageInfo.nativeName}`}
            </Text>
          </View>
        </View>
        <Text style={[styles.linkText, { color: accent, flexShrink: 0 }]}>
          {t("common.edit")}
        </Text>
      </TouchableOpacity>
    </View>
  ),
);

const MonetSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    monetEnabled,
    syncWithSystemAndroid,
    monetSeedColor,
    hapticsEnabled,
    onToggleMonet,
    onToggleSystemSync,
    onSelectSeedColor,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    monetEnabled: boolean;
    syncWithSystemAndroid: boolean;
    monetSeedColor: string;
    hapticsEnabled: boolean;
    onToggleMonet: (val: boolean) => void;
    onToggleSystemSync: (val: boolean) => void;
    onSelectSeedColor: (hex: string) => void;
  }) => {
    const warnUnavailable = () => {
      if (hapticsEnabled && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {},
        );
      }
      appAlert(
        t("settings.systemSyncUnavailableTitle"),
        t("settings.systemSyncUnavailableMsg"),
        [{ text: t("common.ok") }],
      );
    };

    return (
      <View style={[styles.section, themeStyles.card, themeStyles.border]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={20} color={accent} />
          <Text style={[styles.sectionTitle, themeStyles.text]}>
            {t("settings.monetColors")}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.rowLabel, themeStyles.text]}>
              {t("settings.monetColors")}
            </Text>
            <Text style={[styles.rowSubLabel, themeStyles.subText]}>
              {t("settings.monetSubtitle")}
            </Text>
          </View>
          <Switch
            value={monetEnabled}
            trackColor={{ false: "#D4DCC8", true: accent }}
            onValueChange={onToggleMonet}
          />
        </View>

        {monetEnabled && (
          <View style={styles.monetColorsContainer}>
            <TouchableOpacity
              style={[
                styles.row,
                { borderBottomWidth: 0, paddingVertical: 8 },
              ]}
              activeOpacity={Platform.OS !== "android" ? 0.7 : 1}
              onPress={() => {
                if (Platform.OS !== "android") {
                  warnUnavailable();
                }
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="phone-portrait-outline" size={16} color={accent} />
                  <Text style={[styles.rowLabel, themeStyles.text]}>
                    {t("settings.systemSync")}
                  </Text>
                </View>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  {t("settings.systemSyncSubtitle")}
                </Text>
              </View>
              <Switch
                testID="monet-system-sync-switch"
                value={Platform.OS === "android" ? syncWithSystemAndroid : false}
                trackColor={{ false: "#D4DCC8", true: accent }}
                onValueChange={(val) => {
                  if (Platform.OS !== "android" && val) {
                    warnUnavailable();
                    onToggleSystemSync(false);
                    return;
                  }
                  onToggleSystemSync(val);
                }}
              />
            </TouchableOpacity>

            {(!syncWithSystemAndroid || Platform.OS !== "android") && (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={[
                    styles.rowSubLabel,
                    themeStyles.subText,
                    { marginBottom: 10 },
                  ]}
                >
                  {t("settings.chooseSeedColor")}
                </Text>
                <View style={styles.colorGrid}>
                  {MONET_PRESETS.map((preset) => {
                    const isSelected = monetSeedColor === preset.hex;
                    const presetLabel =
                      preset.name === "Verde"
                        ? t("settings.colorPrescoGreen")
                        : preset.name === "Azul"
                        ? t("settings.colorOceanBlue")
                        : preset.name === "Roxo"
                        ? t("settings.colorLavenderPurple")
                        : preset.name === "Rosa"
                        ? t("settings.colorCoralPink")
                        : preset.name === "Laranja"
                        ? t("settings.colorGoldenAmber")
                        : preset.name === "Teal"
                        ? t("settings.colorMintGreen")
                        : preset.name;
                    return (
                      <TouchableOpacity
                        key={preset.hex}
                        testID={`monet-seed-${preset.name.toLowerCase()}`}
                        style={[
                          styles.colorOption,
                          {
                            borderColor: isSelected ? accent : "transparent",
                          },
                        ]}
                        onPress={() => onSelectSeedColor(preset.hex)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: preset.hex },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
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
                          {presetLabel}
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
    );
  },
);

const ScannerSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    hapticsEnabled,
    autoConfirmScan,
    onToggleHaptics,
    onToggleAutoConfirm,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    hapticsEnabled: boolean;
    autoConfirmScan: boolean;
    onToggleHaptics: (val: boolean) => void;
    onToggleAutoConfirm: (val: boolean) => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pulse-outline" size={20} color={accent} />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("settings.scannerHaptics")}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rowLabel, themeStyles.text]}>
            {t("settings.scannerHaptics")}
          </Text>
          <Text style={[styles.rowSubLabel, themeStyles.subText]}>
            {t("settings.scannerHapticsSubtitle")}
          </Text>
        </View>
        <Switch
          value={hapticsEnabled}
          trackColor={{ false: "#D4DCC8", true: accent }}
          onValueChange={onToggleHaptics}
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rowLabel, themeStyles.text]}>
            {t("settings.autoConfirmScan")}
          </Text>
          <Text style={[styles.rowSubLabel, themeStyles.subText]}>
            {t("settings.autoConfirmScanSubtitle")}
          </Text>
        </View>
        <Switch
          value={autoConfirmScan}
          trackColor={{ false: "#D4DCC8", true: accent }}
          onValueChange={onToggleAutoConfirm}
        />
      </View>
    </View>
  ),
);

const NotificationsSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    isAuthenticated,
    notifications,
    emailNotifications,
    onToggleNotifications,
    onToggleEmailNotifications,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    isAuthenticated: boolean;
    notifications: boolean;
    emailNotifications: boolean;
    onToggleNotifications: (val: boolean) => void;
    onToggleEmailNotifications: (val: boolean) => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="notifications-outline" size={20} color={accent} />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("settings.notifications")}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rowLabel, themeStyles.text]}>
            {t("settings.notifications")}
          </Text>
          <Text style={[styles.rowSubLabel, themeStyles.subText]}>
            {t("settings.notificationsSubtitle")}
          </Text>
        </View>
        <Switch
          value={notifications}
          trackColor={{ false: "#D4DCC8", true: accent }}
          onValueChange={onToggleNotifications}
        />
      </View>

      {isAuthenticated && (
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.rowLabel, themeStyles.text]}>
              {t("settings.emailNotifications")}
            </Text>
            <Text style={[styles.rowSubLabel, themeStyles.subText]}>
              {t("settings.emailNotificationsSubtitle")}
            </Text>
          </View>
          <Switch
            value={emailNotifications}
            trackColor={{ false: "#D4DCC8", true: accent }}
            onValueChange={onToggleEmailNotifications}
          />
        </View>
      )}
    </View>
  ),
);

const PrivacySection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    isAuthenticated,
    isPrivate,
    twoFactorAuth,
    dataCollection,
    onTogglePrivate,
    onToggleTwoFactor,
    onToggleDataCollection,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    isAuthenticated: boolean;
    isPrivate: boolean;
    twoFactorAuth: boolean;
    dataCollection: boolean;
    onTogglePrivate: (val: boolean) => void;
    onToggleTwoFactor: (val: boolean) => void;
    onToggleDataCollection: (val: boolean) => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-outline" size={20} color={accent} />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("settings.privacy")}
        </Text>
      </View>

      {isAuthenticated && (
        <>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]}>
                {t("settings.privateProfile")}
              </Text>
              <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                {t("settings.privateProfileSubtitle")}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={onTogglePrivate}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowLabel, themeStyles.text]} numberOfLines={1}>
                {t("settings.twoFactor")}
              </Text>
            </View>
            <Switch
              value={twoFactorAuth}
              trackColor={{ false: "#D4DCC8", true: accent }}
              onValueChange={onToggleTwoFactor}
            />
          </View>
        </>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rowLabel, themeStyles.text]}>
            {t("settings.dataCollection")}
          </Text>
          <Text style={[styles.rowSubLabel, themeStyles.subText]}>
            {t("settings.dataCollectionSubtitle")}
          </Text>
        </View>
        <Switch
          value={dataCollection}
          trackColor={{ false: "#D4DCC8", true: accent }}
          onValueChange={onToggleDataCollection}
        />
      </View>
    </View>
  ),
);

const BackupSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    globalIsDark,
    isAuthenticated,
    onOpenExport,
    onOpenImport,
    onOpenClearCache,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    globalIsDark: boolean;
    isAuthenticated: boolean;
    onOpenExport: () => void;
    onOpenImport: () => void;
    onOpenClearCache: () => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="code-slash-outline" size={20} color={accent} />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {isAuthenticated ? t("settings.backupExport") : t("settings.clearCache")}
        </Text>
      </View>

      <View style={styles.actionButtonGroup}>
        {isAuthenticated && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
              onPress={onOpenExport}
            >
              <Ionicons
                name="download-outline"
                size={16}
                color={globalIsDark ? "#FFF" : "#000"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionBtnText, themeStyles.text]}>
                {t("settings.backupExport")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
              onPress={onOpenImport}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={globalIsDark ? "#FFF" : "#000"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionBtnText, themeStyles.text]}>
                {t("settings.importSettings")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          testID="btn-clear-cache"
          style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
          onPress={onOpenClearCache}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={globalIsDark ? "#FFF" : "#000"}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.actionBtnText, themeStyles.text]}>
            {t("settings.clearCache")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ),
);

const AccountSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    globalIsDark,
    onOpenChangePassword,
    onOpenDeleteAccount,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    globalIsDark: boolean;
    onOpenChangePassword: () => void;
    onOpenDeleteAccount: () => void;
  }) => (
    <View style={[styles.section, themeStyles.card, themeStyles.border]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-outline" size={20} color={accent} />
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("settings.accountSecurity")}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, themeStyles.btnToggleOff, styles.rowCenter]}
        onPress={onOpenChangePassword}
      >
        <Ionicons
          name="key-outline"
          size={16}
          color={globalIsDark ? "#FFF" : "#000"}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.actionBtnText, themeStyles.text]}>
          {t("auth.changePassword")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.btnRedLight, styles.rowCenter]}
        onPress={onOpenDeleteAccount}
      >
        <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={styles.textRed}>{t("auth.deleteAccount")}</Text>
      </TouchableOpacity>
    </View>
  ),
);

const AboutSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    apiStatus,
    onOpenAbout,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    apiStatus: "checking" | "online" | "offline";
    onOpenAbout: () => void;
  }) => {
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";
    const buildNumber =
      Constants.expoConfig?.android?.versionCode ??
      Constants.expoConfig?.ios?.buildNumber;

    return (
      <View style={[styles.section, themeStyles.card, themeStyles.border]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color={accent} />
          <Text style={[styles.sectionTitle, themeStyles.text]}>
            {t("about.title")}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text
            style={[styles.infoLabel, themeStyles.subText, { flex: 1, marginRight: 8 }]}
            numberOfLines={1}
          >
            {t("common.version")}
          </Text>
          <Text style={[styles.infoValue, themeStyles.text]} numberOfLines={1}>
            {buildNumber ? `${appVersion} (${buildNumber})` : appVersion}
          </Text>
        </View>

        {__DEV__ && (
          <>
            <View style={styles.infoRow}>
              <Text
                style={[styles.infoLabel, themeStyles.subText, { flex: 1, marginRight: 8 }]}
                numberOfLines={1}
              >
                {t("common.environment")}
              </Text>
              <Text style={[styles.infoValue, themeStyles.text]} numberOfLines={1}>
                {Platform.OS.toUpperCase()} • Expo SDK 57 (RN 0.86)
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text
                style={[styles.infoLabel, themeStyles.subText, { flex: 1, marginRight: 8 }]}
                numberOfLines={1}
              >
                {t("settings.backendStatus")}
              </Text>
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
                <Text style={[styles.infoValue, themeStyles.text]} numberOfLines={1}>
                  {apiStatus === "online"
                    ? t("settings.connected")
                    : apiStatus === "offline"
                    ? t("settings.offline")
                    : t("settings.connecting")}
                </Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          testID="btn-about"
          style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 2 }]}
          activeOpacity={0.7}
          onPress={onOpenAbout}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="book-outline" size={16} color={accent} />
            <Text style={[styles.infoLabel, themeStyles.text, { fontWeight: "500" }]}>
              {t("about.title")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeStyles.subText.color} />
        </TouchableOpacity>
      </View>
    );
  },
);

const AdminPanelSection = React.memo(
  ({
    accent,
    themeStyles,
    t,
    globalIsDark,
    pendingModerationCount,
    onOpenOffStatus,
    onOpenModeration,
    onOpenTutorial,
    onResetTutorial,
  }: {
    accent: string;
    themeStyles: any;
    t: ReturnType<typeof useI18n>["t"];
    globalIsDark: boolean;
    pendingModerationCount: number;
    onOpenOffStatus: () => void;
    onOpenModeration: () => void;
    onOpenTutorial: () => void;
    onResetTutorial: () => void;
  }) => (
    <View
      style={[
        styles.section,
        themeStyles.card,
        themeStyles.border,
        { borderColor: accent + "50" },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="flask-outline" size={20} color={accent} />
          <Text style={[styles.sectionTitle, themeStyles.text]}>
            Painel de Testes (Admin)
          </Text>
        </View>
        <View style={[styles.adminBadgePill, { backgroundColor: accent + "20" }]}>
          <Text style={[styles.adminBadgeText, { color: accent }]}>ADMIN ONLY</Text>
        </View>
      </View>

      <Text style={[styles.rowSubLabel, themeStyles.subText, { marginBottom: 12 }]}>
        Ferramentas exclusivas de depuração e validação de primeiro acesso.
      </Text>

      <TouchableOpacity
        style={[
          styles.adminActionCard,
          {
            backgroundColor: globalIsDark ? "#161F2E" : "#F8FAFC",
            borderColor: accent + "30",
            marginBottom: 10,
          },
        ]}
        activeOpacity={0.7}
        onPress={onOpenOffStatus}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={[styles.adminIconBox, { backgroundColor: accent + "20" }]}>
            <Ionicons name="pulse-outline" size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, themeStyles.text, { fontWeight: "700" }]}>
              {t("admin.offDirectStatusCard") || "Status da API OpenFoodFacts"}
            </Text>
            <Text style={[styles.rowSubLabel, themeStyles.subText]}>
              {t("admin.offDirectStatusDesc") ||
                "Consulte a disponibilidade de EAN e fotos em tempo real"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="btn-admin-moderation"
        style={[
          styles.adminActionCard,
          {
            backgroundColor: globalIsDark ? "#161F2E" : "#F8FAFC",
            borderColor: accent + "30",
            marginBottom: __DEV__ ? 10 : 0,
          },
        ]}
        activeOpacity={0.7}
        onPress={onOpenModeration}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={[styles.adminIconBox, { backgroundColor: accent + "20" }]}>
            <Ionicons name="shield-outline" size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.rowLabel, themeStyles.text, { fontWeight: "700" }]}>
                {t("admin.moderationTitle") || "Moderação de Preços"}
              </Text>
              {pendingModerationCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#EF4444",
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>
                    {pendingModerationCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.rowSubLabel, themeStyles.subText]}>
              {t("admin.moderationSub") ||
                "Auditar e aprovar preços retidos por desvio atípico"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent} />
      </TouchableOpacity>

      {__DEV__ && (
        <>
          <TouchableOpacity
            style={[
              styles.adminActionCard,
              {
                backgroundColor: globalIsDark ? "#161F2E" : "#F8FAFC",
                borderColor: accent + "30",
              },
            ]}
            activeOpacity={0.7}
            onPress={onOpenTutorial}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={[styles.adminIconBox, { backgroundColor: accent + "20" }]}>
                <Ionicons name="book-outline" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, themeStyles.text, { fontWeight: "700" }]}>
                  Testar Tutorial de Boas-Vindas
                </Text>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  Abre imediatamente o fluxo guiado simplificado
                </Text>
              </View>
            </View>
            <Text style={[styles.linkText, { color: accent, fontWeight: "700" }]}>
              Testar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.adminActionCard,
              {
                backgroundColor: globalIsDark ? "#161F2E" : "#F8FAFC",
                borderColor: "rgba(0,0,0,0.06)",
                marginTop: 8,
              },
            ]}
            activeOpacity={0.7}
            onPress={onResetTutorial}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.adminIconBox,
                  { backgroundColor: "rgba(245, 158, 11, 0.2)" },
                ]}
              >
                <Ionicons name="refresh-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, themeStyles.text, { fontWeight: "700" }]}>
                  Simular Conta Nova (Reset)
                </Text>
                <Text style={[styles.rowSubLabel, themeStyles.subText]}>
                  Limpa a flag @presco:hasSeenTutorial no armazenamento
                </Text>
              </View>
            </View>
            <Text style={[styles.linkText, { color: "#F59E0B", fontWeight: "700" }]}>
              Resetar
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  ),
);

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isAdmin, isAuthenticated } = useAuth();
  const [localSettings, setLocalSettings] = useState<LocalSettingsState>(
    buildLocalSettingsFromCache,
  );
  const [sectionsReady, setSectionsReady] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "off_status">("general");

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clearCacheModalOpen, setClearCacheModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);

  // i18n
  const {
    language: currentLanguage,
    isSystemLanguage,
    setLanguage: setI18nLanguage,
    languages,
    languageInfo,
    t,
  } = useI18n();

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
    if (localSettings.hapticsEnabled && Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Silently ignore if unsupported
      }
    }
  }, [localSettings.hapticsEnabled]);

  useEffect(() => {
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) {
        setSectionsReady(true);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!isAdmin) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      Promise.all([
        fetchPendingOccurrences().catch(() => []),
        fetchPendingProducts().catch(() => []),
      ])
        .then(([occurrences, products]) => {
          if (isMounted) {
            const occCount = Array.isArray(occurrences) ? occurrences.length : 0;
            const prodCount = Array.isArray(products) ? products.length : 0;
            setPendingModerationCount(occCount + prodCount);
          }
        })
        .catch(() => {
          if (isMounted) setPendingModerationCount(0);
        });
    });
    return () => {
      isMounted = false;
      handle.cancel();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!__DEV__) return;
    let isMounted = true;
    const checkApiHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${BASE_URL}/health`, {
          signal: controller.signal,
          headers: { "Bypass-Tunnel-Reminder": "true" },
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (isMounted) {
          setApiStatus(res && res.ok ? "online" : "offline");
        }
      } catch {
        if (isMounted) setApiStatus("offline");
      }
    };
    const handle = InteractionManager.runAfterInteractions(() => {
      checkApiHealth();
    });
    return () => {
      isMounted = false;
      handle.cancel();
    };
  }, []);

  // Persists settings immediately on any change
  const persistSettingImmediate = useCallback(
    async (nextLocal: LocalSettingsState, overrides?: { theme?: "light" | "dark"; language?: string }) => {
      try {
        const currentStored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsedStored = currentStored ? JSON.parse(currentStored) : {};
        const updated = {
          ...parsedStored,
          ...nextLocal,
          theme: overrides?.theme ?? (globalIsDark ? "dark" : "light"),
          language: overrides?.language ?? (isSystemLanguage ? "system" : currentLanguage),
          amoledEnabled,
          monetEnabled,
          syncWithSystemAndroid,
          monetSeedColor,
        };
        setCachedAppSettings(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        showSavedIndicator();
      } catch (error) {
        console.error("Erro ao salvar automaticamente:", error);
      }
    },
    [
      globalIsDark,
      isSystemLanguage,
      currentLanguage,
      amoledEnabled,
      monetEnabled,
      syncWithSystemAndroid,
      monetSeedColor,
      showSavedIndicator,
    ],
  );

  const handleSettingChange = useCallback(
    <K extends keyof LocalSettingsState>(key: K, value: LocalSettingsState[K]) => {
      triggerHaptic();
      setLocalSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistSettingImmediate(next);
        return next;
      });
      setPasswordError("");
    },
    [triggerHaptic, persistSettingImmediate],
  );

  const handleLanguageSelect = useCallback(() => {
    triggerHaptic();
    setLanguageModalOpen(true);
  }, [triggerHaptic]);

  const handleReset = useCallback(() => {
    triggerHaptic();
    appAlert(
      t("settings.resetSettings"),
      t("settings.resetConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.resetSettings"),
          style: "destructive",
          onPress: async () => {
            setLocalSettings(DEFAULT_LOCAL_SETTINGS);
            await applyThemeSettingsBatch({
              theme: "light",
              amoledEnabled: false,
              monetEnabled: false,
              syncWithSystemAndroid: false,
              monetSeedColor: MONET_PRESETS[0].hex,
            });
            const resetPayload = {
              ...DEFAULT_LOCAL_SETTINGS,
              theme: "light",
              language: "pt-BR",
            };
            setCachedAppSettings(resetPayload);
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(resetPayload),
            );
            showSavedIndicator();
          },
        },
      ],
    );
  }, [triggerHaptic, t, applyThemeSettingsBatch, showSavedIndicator]);

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t("auth.nameRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordsDoNotMatch"));
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      triggerHaptic();
      appAlert(t("common.success"), t("auth.passwordChangedSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOpen(false);
    } catch (err: any) {
      setPasswordError(err?.message || t("errors.serverError"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      triggerHaptic();
      await deleteAccount();
      setCachedAppSettings(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setDeleteModalOpen(false);
      appAlert(t("auth.deleteAccount"), t("auth.deleteAccountWarning"), [
        {
          text: t("common.ok"),
          onPress: () => router.replace("/login" as any),
        },
      ]);
    } catch (err: any) {
      appAlert(t("common.error"), err?.message || t("errors.serverError"));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Generate & Open Export Code Modal
  const handleOpenExportModal = useCallback(() => {
    triggerHaptic();
    const exportBundle = {
      app: "PResco",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      settings: {
        ...localSettings,
        theme: globalIsDark ? "dark" : "light",
        language: isSystemLanguage ? "system" : currentLanguage,
        amoledEnabled,
        monetEnabled,
        syncWithSystemAndroid,
        monetSeedColor,
      },
    };

    const code = encodeSettingsToCode(exportBundle);
    setGeneratedCode(code);
    setExportModalOpen(true);
  }, [
    triggerHaptic,
    localSettings,
    globalIsDark,
    isSystemLanguage,
    currentLanguage,
    amoledEnabled,
    monetEnabled,
    syncWithSystemAndroid,
    monetSeedColor,
  ]);

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
      setImportError(t("settings.importPlaceholder"));
      return;
    }

    try {
      const parsed = decodeCodeToSettings(importCodeText);
      const incoming = parsed.settings || parsed;

      if (typeof incoming !== "object" || incoming === null) {
        throw new Error("Formato inválido.");
      }

      const mergedLocal: LocalSettingsState = {
        notifications: Boolean(incoming.notifications ?? localSettings.notifications),
        emailNotifications: Boolean(
          incoming.emailNotifications ?? localSettings.emailNotifications,
        ),
        privacy: incoming.privacy === "public" ? "public" : "private",
        twoFactorAuth: Boolean(incoming.twoFactorAuth ?? localSettings.twoFactorAuth),
        dataCollection: Boolean(
          incoming.dataCollection ?? localSettings.dataCollection,
        ),
        hapticsEnabled: Boolean(
          incoming.hapticsEnabled ?? localSettings.hapticsEnabled,
        ),
        autoConfirmScan: Boolean(
          incoming.autoConfirmScan ?? localSettings.autoConfirmScan,
        ),
      };

      setLocalSettings(mergedLocal);

      await applyThemeSettingsBatch({
        theme: incoming.theme === "dark" ? "dark" : "light",
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
      appAlert(t("common.success"), t("settings.importSuccess"));
    } catch {
      setImportError(t("settings.importInvalidCode"));
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
      await ExpoImage.clearMemoryCache().catch(() => {});
      await ExpoImage.clearDiskCache().catch(() => {});
      setClearCacheModalOpen(false);
      appAlert(t("settings.clearCache"), t("settings.cacheCleared"));
    } catch {
      appAlert(t("common.error"), t("errors.serverError"));
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleToggleTheme = useCallback(() => {
    triggerHaptic();
    const newTheme = globalIsDark ? "light" : "dark";
    setGlobalTheme(newTheme);
    persistSettingImmediate(localSettings, { theme: newTheme });
  }, [triggerHaptic, globalIsDark, setGlobalTheme, persistSettingImmediate, localSettings]);

  const handleToggleAmoled = useCallback(
    (val: boolean) => {
      triggerHaptic();
      setAmoledEnabled(val);
      showSavedIndicator();
    },
    [triggerHaptic, setAmoledEnabled, showSavedIndicator],
  );

  const handleToggleMonet = useCallback(
    (val: boolean) => {
      triggerHaptic();
      setMonetEnabled(val);
      showSavedIndicator();
    },
    [triggerHaptic, setMonetEnabled, showSavedIndicator],
  );

  const handleToggleSystemSync = useCallback(
    (val: boolean) => {
      if (Platform.OS !== "android") {
        setSyncWithSystemAndroid(false);
        return;
      }
      triggerHaptic();
      setSyncWithSystemAndroid(val);
      showSavedIndicator();
    },
    [triggerHaptic, setSyncWithSystemAndroid, showSavedIndicator],
  );

  const handleSelectSeedColor = useCallback(
    (hex: string) => {
      triggerHaptic();
      setMonetSeedColor(hex);
      showSavedIndicator();
    },
    [triggerHaptic, setMonetSeedColor, showSavedIndicator],
  );

  const handleToggleHaptics = useCallback(
    (val: boolean) => handleSettingChange("hapticsEnabled", val),
    [handleSettingChange],
  );
  const handleToggleAutoConfirm = useCallback(
    (val: boolean) => handleSettingChange("autoConfirmScan", val),
    [handleSettingChange],
  );
  const handleToggleNotifications = useCallback(
    (val: boolean) => handleSettingChange("notifications", val),
    [handleSettingChange],
  );
  const handleToggleEmailNotifications = useCallback(
    (val: boolean) => handleSettingChange("emailNotifications", val),
    [handleSettingChange],
  );
  const handleTogglePrivate = useCallback(
    (val: boolean) => handleSettingChange("privacy", val ? "private" : "public"),
    [handleSettingChange],
  );
  const handleToggleTwoFactor = useCallback(
    (val: boolean) => handleSettingChange("twoFactorAuth", val),
    [handleSettingChange],
  );
  const handleToggleDataCollection = useCallback(
    (val: boolean) => handleSettingChange("dataCollection", val),
    [handleSettingChange],
  );

  const handleOpenImport = useCallback(() => {
    triggerHaptic();
    setImportError("");
    setImportModalOpen(true);
  }, [triggerHaptic]);

  const handleOpenClearCache = useCallback(() => {
    triggerHaptic();
    setClearCacheModalOpen(true);
  }, [triggerHaptic]);

  const handleOpenChangePassword = useCallback(() => {
    triggerHaptic();
    setPasswordError("");
    setChangePasswordOpen(true);
  }, [triggerHaptic]);

  const handleOpenDeleteAccount = useCallback(() => {
    triggerHaptic();
    setDeleteModalOpen(true);
  }, [triggerHaptic]);

  const handleOpenAbout = useCallback(() => {
    router.push("/about");
  }, [router]);

  const handleOpenOffStatus = useCallback(() => {
    triggerHaptic();
    setActiveTab("off_status");
  }, [triggerHaptic]);

  const handleOpenModeration = useCallback(() => {
    triggerHaptic();
    router.push("/adminModeration" as any);
  }, [triggerHaptic, router]);

  const handleOpenTutorial = useCallback(() => {
    triggerHaptic();
    setShowTutorialModal(true);
  }, [triggerHaptic]);

  const handleResetTutorial = useCallback(async () => {
    triggerHaptic();
    await resetTutorialStatus();
    appAlert(
      "Primeiro Acesso Resetado",
      "O status de tutorial visto foi removido. Ao acessar a tela inicial, o tutorial abrirá automaticamente como em uma conta nova.",
      [
        { text: "OK" },
        {
          text: "Abrir Tutorial Agora",
          onPress: () => setShowTutorialModal(true),
        },
      ],
    );
  }, [triggerHaptic]);

  return (
    <AnimatedScreenContainer style={[styles.container, themeStyles.bg]}>
      <ScrollView
        style={[styles.container, themeStyles.bg]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={[styles.header, themeStyles.headerBg]}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="settings-outline" size={26} color={accent} />
          <Text style={[styles.headerTitle, themeStyles.text]}>
            {t("settings.title")}
          </Text>
        </View>
        {isSaved && (
          <View style={[styles.savedAlert, { flexDirection: "row", alignItems: "center" }]}>
            <Ionicons name="checkmark" size={13} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.savedAlertText}>{t("common.saved")}</Text>
          </View>
        )}
      </View>

      {/* Exclusive Admin Navigation Tabs */}
      {isAdmin && (
        <View
          style={[
            styles.adminTabBar,
            themeStyles.card,
            { borderBottomColor: globalIsDark ? "#263238" : "#E2E8F0" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.adminTabItem,
              activeTab === "general" && [
                styles.adminTabItemActive,
                { borderBottomColor: accent },
              ],
            ]}
            onPress={() => {
              triggerHaptic();
              setActiveTab("general");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={activeTab === "general" ? accent : themeStyles.subText.color}
            />
            <Text
              style={[
                styles.adminTabText,
                activeTab === "general"
                  ? { color: accent, fontWeight: "700" }
                  : themeStyles.subText,
              ]}
            >
              {t("admin.tabGeneral") || "Geral"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.adminTabItem,
              activeTab === "off_status" && [
                styles.adminTabItemActive,
                { borderBottomColor: accent },
              ],
            ]}
            onPress={() => {
              triggerHaptic();
              setActiveTab("off_status");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="pulse-outline"
              size={16}
              color={activeTab === "off_status" ? accent : themeStyles.subText.color}
            />
            <Text
              style={[
                styles.adminTabText,
                activeTab === "off_status"
                  ? { color: accent, fontWeight: "700" }
                  : themeStyles.subText,
              ]}
            >
              {t("admin.tabOffStatus") || "Status OpenFoodFacts"}
            </Text>
            <View style={[styles.adminTabBadge, { backgroundColor: accent + "20" }]}>
              <Text style={[styles.adminTabBadgeText, { color: accent }]}>ADMIN</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {isAdmin && activeTab === "off_status" ? (
          <Suspense
            fallback={
              <ActivityIndicator
                size="small"
                color={accent}
                style={{ marginVertical: 24 }}
              />
            }
          >
            <OpenFoodFactsStatusTab
              onBackToGeneral={() => setActiveTab("general")}
            />
          </Suspense>
        ) : (
          <>
            <AppearanceSection
              isDark={globalIsDark}
              amoledEnabled={amoledEnabled}
              accent={accent}
              themeStyles={themeStyles}
              t={t}
              isSystemLanguage={isSystemLanguage}
              languageInfo={languageInfo}
              onToggleTheme={handleToggleTheme}
              onToggleAmoled={handleToggleAmoled}
              onOpenLanguageModal={handleLanguageSelect}
            />

            <MonetSection
              accent={accent}
              themeStyles={themeStyles}
              t={t}
              monetEnabled={monetEnabled}
              syncWithSystemAndroid={syncWithSystemAndroid}
              monetSeedColor={monetSeedColor}
              hapticsEnabled={localSettings.hapticsEnabled}
              onToggleMonet={handleToggleMonet}
              onToggleSystemSync={handleToggleSystemSync}
              onSelectSeedColor={handleSelectSeedColor}
            />

            {sectionsReady && (
              <>
                <ScannerSection
                  accent={accent}
                  themeStyles={themeStyles}
                  t={t}
                  hapticsEnabled={localSettings.hapticsEnabled}
                  autoConfirmScan={localSettings.autoConfirmScan}
                  onToggleHaptics={handleToggleHaptics}
                  onToggleAutoConfirm={handleToggleAutoConfirm}
                />

                <NotificationsSection
                  accent={accent}
                  themeStyles={themeStyles}
                  t={t}
                  isAuthenticated={isAuthenticated}
                  notifications={localSettings.notifications}
                  emailNotifications={localSettings.emailNotifications}
                  onToggleNotifications={handleToggleNotifications}
                  onToggleEmailNotifications={handleToggleEmailNotifications}
                />

                <PrivacySection
                  accent={accent}
                  themeStyles={themeStyles}
                  t={t}
                  isAuthenticated={isAuthenticated}
                  isPrivate={localSettings.privacy === "private"}
                  twoFactorAuth={localSettings.twoFactorAuth}
                  dataCollection={localSettings.dataCollection}
                  onTogglePrivate={handleTogglePrivate}
                  onToggleTwoFactor={handleToggleTwoFactor}
                  onToggleDataCollection={handleToggleDataCollection}
                />

                <BackupSection
                  accent={accent}
                  themeStyles={themeStyles}
                  t={t}
                  globalIsDark={globalIsDark}
                  isAuthenticated={isAuthenticated}
                  onOpenExport={handleOpenExportModal}
                  onOpenImport={handleOpenImport}
                  onOpenClearCache={handleOpenClearCache}
                />

                {isAuthenticated && (
                  <AccountSection
                    accent={accent}
                    themeStyles={themeStyles}
                    t={t}
                    globalIsDark={globalIsDark}
                    onOpenChangePassword={handleOpenChangePassword}
                    onOpenDeleteAccount={handleOpenDeleteAccount}
                  />
                )}

                <AboutSection
                  accent={accent}
                  themeStyles={themeStyles}
                  t={t}
                  apiStatus={apiStatus}
                  onOpenAbout={handleOpenAbout}
                />

                {isAdmin && (
                  <AdminPanelSection
                    accent={accent}
                    themeStyles={themeStyles}
                    t={t}
                    globalIsDark={globalIsDark}
                    pendingModerationCount={pendingModerationCount}
                    onOpenOffStatus={handleOpenOffStatus}
                    onOpenModeration={handleOpenModeration}
                    onOpenTutorial={handleOpenTutorial}
                    onResetTutorial={handleResetTutorial}
                  />
                )}

                {__DEV__ && (
                  <View style={styles.footerActions}>
                    <TouchableOpacity
                      style={[styles.resetOnlyBtn, themeStyles.btnToggleOff]}
                      onPress={handleReset}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={globalIsDark ? "#FFF" : "#000"}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.resetBtnText, themeStyles.text]}>
                        {t("settings.resetSettings")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>

      {/* Export Code Modal */}
      {exportModalOpen && (
      <Modal transparent visible={exportModalOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, themeStyles.card]}>
              <View style={styles.rowCenter}>
                <Ionicons name="code-slash-outline" size={22} color={accent} />
                <Text
                  style={[
                    styles.modalTitle,
                    { marginLeft: 8, marginBottom: 0 },
                    themeStyles.text,
                  ]}
                >
                  {t("settings.exportCodeModalTitle")}
                </Text>
              </View>

              <Text
                style={[
                  styles.modalDescription,
                  themeStyles.subText,
                  { marginTop: 10 },
                ]}
              >
                {t("settings.exportCodeSubtitle")}
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
                  <Text style={themeStyles.text}>{t("common.close")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleShareExportCode}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textWhite}>{t("settings.shareCode")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      )}

      {/* Import Code Modal */}
      {importModalOpen && (
      <Modal transparent visible={importModalOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, themeStyles.card]}>
              <Text style={[styles.modalTitle, themeStyles.text]}>
                {t("settings.importModalTitle")}
              </Text>
              <Text style={[styles.modalDescription, themeStyles.subText]}>
                {t("settings.importPlaceholder")}
              </Text>

              <FocusedInputWrapper borderRadius={10} style={{ marginBottom: 12 }}>
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
              </FocusedInputWrapper>

              {importError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#991B1B" />
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
                  <Text style={themeStyles.text}>{t("common.cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleImportSettings}
                >
                  <Text style={styles.textWhite}>{t("settings.importButton")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
      )}

      {/* Change Password Modal */}
      {changePasswordOpen && (
      <Modal transparent visible={changePasswordOpen} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, themeStyles.card]}>
              <Text style={[styles.modalTitle, themeStyles.text]}>
                {t("auth.changePassword")}
              </Text>

              <FocusedInputWrapper borderRadius={10} style={{ marginBottom: 10 }}>
                <TextInput
                  secureTextEntry
                  placeholder={t("auth.currentPassword")}
                  placeholderTextColor="#9CA3AF"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                />
              </FocusedInputWrapper>

              <FocusedInputWrapper borderRadius={10} style={{ marginBottom: 10 }}>
                <TextInput
                  secureTextEntry
                  placeholder={t("auth.newPassword")}
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                />
              </FocusedInputWrapper>

              <FocusedInputWrapper borderRadius={10} style={{ marginBottom: 10 }}>
                <TextInput
                  secureTextEntry
                  placeholder={t("auth.confirmNewPassword")}
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                />
              </FocusedInputWrapper>

              {passwordError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#991B1B" />
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
                  <Text style={themeStyles.text}>{t("common.cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: accent }]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.textWhite}>{t("common.save")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
      )}

      {/* Clear Cache Confirmation Modal */}
      {clearCacheModalOpen && (
      <Modal transparent visible={clearCacheModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card]}>
            <View style={styles.rowCenter}>
              <Ionicons name="refresh-outline" size={22} color={accent} />
              <Text
                style={[styles.modalTitle, { marginLeft: 8 }, themeStyles.text]}
              >
                {t("settings.clearCache")}
              </Text>
            </View>
            <Text style={[styles.modalDescription, themeStyles.subText]}>
              {t("settings.clearCacheSubtitle")}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => setClearCacheModalOpen(false)}
                disabled={isClearingCache}
              >
                <Text style={themeStyles.text}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="modal-confirm-clear-cache"
                style={[styles.modalBtn, { backgroundColor: accent }]}
                onPress={handleClearCache}
                disabled={isClearingCache}
              >
                {isClearingCache ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.textWhite}>{t("settings.clearCache")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* Delete Account Modal */}
      {deleteModalOpen && (
      <Modal transparent visible={deleteModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card]}>
            <View style={styles.rowCenter}>
              <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
              <Text
                style={[styles.modalTitle, { marginLeft: 8 }, themeStyles.text]}
              >
                {t("auth.deleteAccount")}
              </Text>
            </View>
            <Text style={[styles.modalDescription, themeStyles.subText]}>
              {t("auth.deleteAccountWarning")}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, themeStyles.btnToggleOff]}
                onPress={() => setDeleteModalOpen(false)}
                disabled={isDeletingAccount}
              >
                <Text style={themeStyles.text}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnRed]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.textWhite}>{t("common.delete")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* Language Selection Modal */}
      {languageModalOpen && (
      <Modal transparent visible={languageModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card, { maxHeight: 540 }]}>
            <View
              style={[
                styles.rowCenter,
                { justifyContent: "space-between", marginBottom: 14 },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="globe-outline" size={22} color={accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, themeStyles.text, { marginBottom: 0 }]}>
                  {t("settings.selectLanguage")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLanguageModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={themeStyles.subText.color} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, themeStyles.subText, { marginBottom: 14 }]}>
              {t("settings.languageSubtitle")}
            </Text>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Option 0: System Default Language */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  themeStyles.border,
                  isSystemLanguage && {
                    borderColor: accent,
                    backgroundColor: `${accent}18`,
                  },
                ]}
                onPress={async () => {
                  triggerHaptic();
                  await setI18nLanguage("system");
                  persistSettingImmediate(localSettings, { language: "system" });
                  setTimeout(() => setLanguageModalOpen(false), 200);
                }}
              >
                <View style={styles.languageRowLeft}>
                  <View style={[styles.flagBadgeBox, { backgroundColor: globalIsDark ? "#2D3748" : "#E2E8F0" }]}>
                    <Ionicons name="settings-outline" size={16} color={accent} />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.languageNativeName,
                        themeStyles.text,
                        isSystemLanguage && { color: accent, fontWeight: "bold" },
                      ]}
                    >
                      {t("settings.systemDefaultLanguage")}
                    </Text>
                    <Text style={[styles.languageEnglishName, themeStyles.subText]}>
                      {t("settings.systemLanguageSubtitle")}
                    </Text>
                  </View>
                </View>
                {isSystemLanguage && <Ionicons name="checkmark" size={20} color={accent} />}
              </TouchableOpacity>

              {languages.map((item) => {
                const isSelected = !isSystemLanguage && item.code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.languageOption,
                      themeStyles.border,
                      isSelected && {
                        borderColor: accent,
                        backgroundColor: `${accent}18`,
                      },
                    ]}
                    onPress={async () => {
                      triggerHaptic();
                      await setI18nLanguage(item.code);
                      persistSettingImmediate(localSettings, { language: item.code });
                      setTimeout(() => setLanguageModalOpen(false), 200);
                    }}
                  >
                    <View style={styles.languageRowLeft}>
                      <View style={[styles.flagBadgeBox, { backgroundColor: isSelected ? accent : (globalIsDark ? "#2D3748" : "#E2E8F0") }]}>
                        <Text style={[styles.flagBadgeText, { color: isSelected ? "#FFFFFF" : (globalIsDark ? "#E2E8F0" : "#2D3748") }]}>
                          {item.flag}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.languageNativeName,
                            themeStyles.text,
                            isSelected && { color: accent, fontWeight: "bold" },
                          ]}
                        >
                          {item.nativeName}
                        </Text>
                        <Text style={[styles.languageEnglishName, themeStyles.subText]}>
                          {item.englishName}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      )}

      {isAdmin && __DEV__ && showTutorialModal && (
        <Suspense fallback={null}>
          <OnboardingTutorialModal
            visible={showTutorialModal}
            onClose={() => setShowTutorialModal(false)}
          />
        </Suspense>
      )}
      </ScrollView>
    </AnimatedScreenContainer>
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
  headerTitleContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", marginLeft: 10 },
  savedAlert: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
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
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  languageRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flagEmoji: {
    fontSize: 24,
  },
  flagBadgeBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  flagBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  languageNativeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  languageEnglishName: {
    fontSize: 12,
    marginTop: 1,
  },
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
    width: 72,
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
    fontSize: 10,
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
  adminBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  adminActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  adminIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  adminTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
  adminTabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  adminTabItemActive: {
    borderBottomWidth: 2,
  },
  adminTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  adminTabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  adminTabBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
});

export default SettingsScreen;
