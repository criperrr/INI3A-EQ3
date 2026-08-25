import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../content/themeContent";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import type { BadgeItem, UserProfileData } from "../services/auth";

const COLORS = {
  amber: "#FFC107",
  greenProgress: "#4CAF50",
  jungleBg: "#1F3827",
  redLogout: "#D32F2F",
  gold: "#FFD700",
  adminGlow: "#E6A100",
};

const getGridColor = (intensity: number, isDark: boolean) => {
  switch (intensity) {
    case 1:
      return "#A5D6A7";
    case 2:
      return "#4CAF50";
    case 3:
      return "#1B5E20";
    default:
      return isDark ? "#2A2A2C" : "#E2E8F0";
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();
  const { t } = useI18n();
  const { user, profile, isAdmin, isAuthenticated, refreshProfile, loginAsTestUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectingRole, setConnectingRole] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated && !user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      await refreshProfile();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshProfile, isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated || user) {
      loadData();
    }
  }, [loadData, isAuthenticated, user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleQuickConnect = async (type: "user" | "admin") => {
    setConnectingRole(type);
    try {
      await loginAsTestUser(type);
    } catch (e: any) {
      Alert.alert(
        t("common.error") || "Erro",
        e?.message || "Falha ao conectar ao usuário de teste.",
      );
    } finally {
      setConnectingRole(null);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t("auth.logout") || "Sair da Conta",
      t("auth.logoutConfirm") || "Deseja realmente encerrar a sessão?",
      [
        { text: t("common.cancel") || "Cancelar", style: "cancel" },
        {
          text: t("auth.logout") || "Sair",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    );
  };

  if (loading && !profile && !user) {
    return (
      <View style={[styles.container, styles.centerContent, themeStyles.bg]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, themeStyles.subText]}>
          {t("common.loading") || "Carregando perfil..."}
        </Text>
      </View>
    );
  }

  if (!isAuthenticated && !user && !profile) {
    return (
      <View style={[styles.container, themeStyles.bg]}>
        <UnauthenticatedProfileView
          accent={accent}
          themeStyles={themeStyles}
          isDark={isDark}
          t={t}
          connectingRole={connectingRole}
          onQuickConnect={handleQuickConnect}
          onGoToLogin={() => router.push("/login")}
          onGoToRegister={() => router.push("/registerUser")}
        />
      </View>
    );
  }

  const displayName = profile?.name || user?.name || t("common.guest");
  const displayEmail = profile?.email || user?.email || "";
  const displayRole =
    profile?.levelTitle ||
    (isAdmin ? t("profile.adminBadge") : user?.roleName || t("auth.regularUser"));
  const displayLevel = profile?.level || user?.level || (isAdmin ? 99 : 1);
  const currentXp = profile?.currentXp ?? user?.currentXp ?? (user?.points || 0);
  const maxXp = profile?.maxXp ?? user?.maxXp ?? 100;
  const stats = profile?.stats || {
    rank: 1,
    reportedPrices: 0,
    points: user?.points || 0,
    badgesCount: 0,
  };
  const badges = profile?.badges || [];
  const contributionsGrid = profile?.contributionsGrid || Array.from({ length: 18 }, () => [0, 0, 0, 0]);

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[accent]}
            tintColor={accent}
          />
        }
      >
        <ProfileHeader
          name={displayName}
          email={displayEmail}
          roleTitle={displayRole}
          level={displayLevel}
          isAdmin={isAdmin}
          accent={accent}
          t={t}
        />

        {isAdmin && <AdminPrivilegesBanner accent={accent} themeStyles={themeStyles} t={t} />}

        <StatsCard stats={stats} t={t} />

        <LevelProgress
          currentXp={currentXp}
          maxXp={maxXp}
          level={displayLevel}
          roleTitle={displayRole}
          t={t}
          accent={accent}
        />

        <BadgesSection badges={badges} t={t} accent={accent} />

        <ContributionHistory
          contributions={contributionsGrid}
          reportedCount={stats.reportedPrices}
          t={t}
        />

        <LogoutButton onPress={handleLogout} t={t} />
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const ProfileHeader = memo(function ProfileHeader({
  name,
  email,
  roleTitle,
  level,
  isAdmin,
  accent,
  t,
}: {
  name: string;
  email: string;
  roleTitle: string;
  level: number;
  isAdmin: boolean;
  accent: string;
  t: (key: any) => string;
}) {
  const { themeStyles } = useTheme();

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.profileHeaderContainer}>
      <View style={styles.jungleBanner}>
        <Ionicons
          name="leaf"
          size={120}
          color="#152E1E"
          style={styles.bannerLeafIconLeft}
        />
        <Ionicons
          name="leaf"
          size={90}
          color="#0F2417"
          style={styles.bannerLeafIconRight}
        />
        {isAdmin && (
          <View style={styles.adminBannerBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            <Text style={styles.adminBannerText} numberOfLines={1} ellipsizeMode="tail">
              {t("profile.adminBadge").toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isAdmin ? "#273462" : accent },
            isAdmin && styles.adminAvatarBorder,
          ]}
        >
          <Text style={styles.avatarInitialsText}>{getInitials(name)}</Text>
        </View>

        <View
          style={[
            styles.levelBadge,
            isAdmin ? styles.adminLevelBadge : { backgroundColor: COLORS.amber },
          ]}
        >
          {isAdmin ? (
            <Ionicons name="sparkles" size={12} color="#FFF" style={{ marginRight: 2 }} />
          ) : null}
          <Text style={styles.levelBadgeText}>
            {isAdmin ? "MAX" : `${t("common.levelShort")} ${level}`}
          </Text>
        </View>
      </View>

      <Text style={[styles.userName, themeStyles.text]} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
      <Text
        style={[styles.userRole, { color: isAdmin ? COLORS.adminGlow : accent }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {roleTitle}
      </Text>
      <Text style={[styles.userEmail, themeStyles.subText]} numberOfLines={1} ellipsizeMode="tail">
        {email}
      </Text>
    </View>
  );
});

const AdminPrivilegesBanner = memo(function AdminPrivilegesBanner({
  accent,
  themeStyles,
  t,
}: {
  accent: string;
  themeStyles: any;
  t: (key: any) => string;
}) {
  return (
    <View style={[styles.adminCard, themeStyles.card, { borderColor: COLORS.adminGlow }]}>
      <View style={styles.adminCardHeader}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.adminGlow} />
        <Text style={[styles.adminCardTitle, { color: COLORS.adminGlow }]}>
          {t("profile.adminPanelTitle")}
        </Text>
      </View>
      <Text style={[styles.adminCardDesc, themeStyles.subText]}>
        {t("profile.adminPanelDesc")}
      </Text>
    </View>
  );
});

const StatsCard = memo(function StatsCard({
  stats,
  t,
}: {
  stats: { rank: number; reportedPrices: number; points: number };
  t: (key: any) => string;
}) {
  const { themeStyles } = useTheme();
  return (
    <View style={[styles.statsCard, themeStyles.card, themeStyles.border]}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>#{stats.rank}</Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>
          {t("profile.rank") || "Ranking"}
        </Text>
      </View>
      <View
        style={[
          styles.statDivider,
          { backgroundColor: themeStyles.border.borderColor },
        ]}
      />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>
          {stats.reportedPrices}
        </Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>
          {t("profile.reportedPrices") || "Preços"}
        </Text>
      </View>
      <View
        style={[
          styles.statDivider,
          { backgroundColor: themeStyles.border.borderColor },
        ]}
      />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>
          {stats.points} XP
        </Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>
          {t("profile.points") || "Pontos"}
        </Text>
      </View>
    </View>
  );
});

const LevelProgress = memo(function LevelProgress({
  currentXp,
  maxXp,
  level,
  roleTitle,
  t,
  accent,
}: {
  currentXp: number;
  maxXp: number;
  level: number;
  roleTitle: string;
  t: (key: any) => string;
  accent: string;
}) {
  const { themeStyles } = useTheme();
  const safeMax = maxXp > 0 ? maxXp : 100;
  const progressPercentage = Math.min((currentXp / safeMax) * 100, 100);

  return (
    <View style={styles.levelSection}>
      <View style={styles.levelInfoRow}>
        <View style={[styles.levelTitleCol, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.levelText, themeStyles.text]} numberOfLines={1} ellipsizeMode="tail">
            {t("profile.level")} {level} • {roleTitle}
          </Text>
          <Text style={[styles.levelSubText, themeStyles.subText]} numberOfLines={1} ellipsizeMode="tail">
            {t("profile.xpRewardHint")}
          </Text>
        </View>
        <Text style={[styles.levelProgressNumber, { color: accent }]} numberOfLines={1}>
          {currentXp}/{safeMax} XP
        </Text>
      </View>
      <View style={[styles.progressBarTrack, themeStyles.inputBg, themeStyles.border]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercentage}%`, backgroundColor: accent },
          ]}
        />
      </View>
    </View>
  );
});

const BadgesSection = memo(function BadgesSection({
  badges,
  t,
  accent,
}: {
  badges: BadgeItem[];
  t: (key: any) => string;
  accent: string;
}) {
  const { themeStyles } = useTheme();

  if (!badges || badges.length === 0) return null;

  return (
    <View style={styles.badgesSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, themeStyles.text, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          {t("profile.badges")}
        </Text>
        <Text style={[styles.badgeCountText, { color: accent }]} numberOfLines={1}>
          {badges.filter((b) => b.isUnlocked).length}/{badges.length} {t("profile.unlockedCount")}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgesScroll}
      >
        {badges.map((b) => (
          <View
            key={b.id}
            style={[
              styles.badgeCard,
              themeStyles.card,
              themeStyles.border,
              !b.isUnlocked && styles.badgeLocked,
            ]}
          >
            <Text style={styles.badgeIcon}>{b.icon || "🏅"}</Text>
            <Text style={[styles.badgeName, themeStyles.text]} numberOfLines={1} ellipsizeMode="tail">
              {b.name}
            </Text>
            <Text style={[styles.badgeMinPoints, themeStyles.subText]} numberOfLines={1}>
              {b.isUnlocked ? t("profile.unlocked") : `${b.minPoints} XP`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const ContributionHistory = memo(function ContributionHistory({
  contributions,
  reportedCount,
  t,
}: {
  contributions: number[][];
  reportedCount: number;
  t: (key: any, params?: any) => string;
}) {
  const { themeStyles, isDark } = useTheme();
  return (
    <View style={styles.achievementsSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]} numberOfLines={1}>
        {t("profile.contributionStats")}
      </Text>

      <View
        style={[styles.contributionsCard, themeStyles.card, themeStyles.border]}
      >
        <View style={styles.contributionsHeaderRow}>
          <Text style={[styles.contributionsTitle, themeStyles.text, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
            {t("profile.weeklyHistory")}
          </Text>
          <Text style={[styles.contributionsSubtitle, themeStyles.subText]} numberOfLines={1}>
            {t("profile.contributionsCount", { count: reportedCount })}
          </Text>
        </View>

        <View style={styles.contributionGrid}>
          {contributions.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.gridColumn}>
              {week.map((intensity, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[
                    styles.gridSquare,
                    { backgroundColor: getGridColor(intensity, isDark) },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

interface UnauthenticatedProfileViewProps {
  accent: string;
  themeStyles: any;
  isDark: boolean;
  t: (key: any) => string;
  connectingRole: string | null;
  onQuickConnect: (type: "user" | "admin") => void;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
}

const UnauthenticatedProfileView = memo(function UnauthenticatedProfileView({
  accent,
  themeStyles,
  isDark,
  t,
  connectingRole,
  onQuickConnect,
  onGoToLogin,
  onGoToRegister,
}: UnauthenticatedProfileViewProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.guestContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.guestHero}>
        <View
          style={[
            styles.guestIconCircle,
            { backgroundColor: accent + "18", borderColor: accent + "40" },
          ]}
        >
          <Ionicons name="person-circle-outline" size={76} color={accent} />
        </View>
        <Text style={[styles.guestTitle, themeStyles.text]} numberOfLines={1}>
          {t("navigation.profile")}
        </Text>
        <Text style={[styles.guestSubtitle, themeStyles.subText]} numberOfLines={2}>
          {t("profile.guestJoinHint")}
        </Text>
      </View>

      {/* Quick Test Connection Box */}
      <View
        style={[
          styles.quickConnectBox,
          themeStyles.card,
          themeStyles.border,
          { borderColor: accent + "40" },
        ]}
      >
        <View style={styles.quickConnectHeader}>
          <Ionicons name="flash" size={18} color={accent} />
          <Text style={[styles.quickConnectTitle, { color: accent }]} numberOfLines={1}>
            {t("profile.quickTestTitle")}
          </Text>
        </View>
        <Text style={[styles.quickConnectDesc, themeStyles.subText]} numberOfLines={2}>
          {t("profile.quickTestSubtitle")}
        </Text>

        <View style={styles.quickConnectButtons}>
          <TouchableOpacity
            style={[styles.quickUserBtn, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={() => onQuickConnect("user")}
            disabled={connectingRole !== null}
          >
            {connectingRole === "user" ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="person" size={18} color="#FFFFFF" />
                <View style={styles.btnTextCol}>
                  <Text style={styles.quickBtnText} numberOfLines={1} ellipsizeMode="tail">
                    {t("profile.loginAsRegular")}
                  </Text>
                  <Text style={styles.quickBtnSubText} numberOfLines={1} ellipsizeMode="tail">
                    usuario@presco.com • {t("common.levelShort")} 2 (150 XP)
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickAdminBtn,
              themeStyles.inputBg,
              themeStyles.border,
              { borderColor: COLORS.gold },
            ]}
            activeOpacity={0.8}
            onPress={() => onQuickConnect("admin")}
            disabled={connectingRole !== null}
          >
            {connectingRole === "admin" ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
                <View style={styles.btnTextCol}>
                  <Text style={[styles.quickAdminBtnText, { color: COLORS.gold }]} numberOfLines={1} ellipsizeMode="tail">
                    {t("profile.loginAsAdmin")}
                  </Text>
                  <Text style={[styles.quickAdminBtnSubText, themeStyles.subText]} numberOfLines={1} ellipsizeMode="tail">
                    admin@admin.org • {t("profile.level")} MAX
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Standard Actions */}
      <View style={styles.standardActions}>
        <TouchableOpacity
          style={[styles.loginBtn, themeStyles.inputBg, themeStyles.border]}
          activeOpacity={0.8}
          onPress={onGoToLogin}
        >
          <Ionicons name="log-in-outline" size={20} color={themeStyles.text.color} />
          <Text style={[styles.loginBtnText, themeStyles.text]}>
            {t("profile.loginWithOther")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          activeOpacity={0.7}
          onPress={onGoToRegister}
        >
          <Text style={[styles.registerBtnText, { color: accent }]}>
            {t("auth.signUp") || "Não tem uma conta? Cadastre-se"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});

const LogoutButton = memo(function LogoutButton({
  onPress,
  t,
}: {
  onPress: () => void;
  t: (key: any) => string;
}) {
  const { themeStyles, isDark } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.logoutButton,
        themeStyles.card,
        { borderColor: isDark ? "#451A1A" : "#FFEBEB" },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Ionicons name="log-out-outline" size={20} color={COLORS.redLogout} />
      <Text style={styles.logoutText}>{t("auth.logout") || "Sair da Conta"}</Text>
    </TouchableOpacity>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  content: { flexGrow: 1, paddingBottom: 40 },
  profileHeaderContainer: { alignItems: "center", marginBottom: 16 },
  jungleBanner: {
    width: "100%",
    height: 150,
    backgroundColor: COLORS.jungleBg,
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  bannerLeafIconLeft: {
    position: "absolute",
    left: -20,
    bottom: -20,
    opacity: 0.2,
  },
  bannerLeafIconRight: {
    position: "absolute",
    right: -10,
    top: -10,
    opacity: 0.15,
  },
  adminBannerBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(230, 161, 0, 0.9)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  adminBannerText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  avatarWrapper: {
    marginTop: 80,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  adminAvatarBorder: {
    borderColor: COLORS.gold,
    borderWidth: 4,
  },
  avatarInitialsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  adminLevelBadge: {
    backgroundColor: COLORS.adminGlow,
  },
  levelBadgeText: { fontSize: 11, fontWeight: "bold", color: "#273462" },
  userName: { fontSize: 20, fontWeight: "bold", marginTop: 12 },
  userRole: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  userEmail: { fontSize: 12, marginTop: 2 },
  adminCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: COLORS.adminGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  adminCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  adminCardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 20,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 16, fontWeight: "bold" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  levelSection: { marginHorizontal: 16, marginBottom: 20 },
  levelInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  levelTitleCol: { flex: 1 },
  levelText: { fontSize: 14, fontWeight: "bold" },
  levelSubText: { fontSize: 11, marginTop: 2 },
  levelProgressNumber: { fontSize: 12, fontWeight: "bold" },
  progressBarTrack: { height: 10, borderRadius: 5, overflow: "hidden", borderWidth: 1 },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  badgesSection: { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  badgeCountText: { fontSize: 12, fontWeight: "bold" },
  badgesScroll: { gap: 10, paddingVertical: 4 },
  badgeCard: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  badgeLocked: { opacity: 0.4 },
  badgeIcon: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 11, fontWeight: "bold", textAlign: "center" },
  badgeMinPoints: { fontSize: 10, marginTop: 2 },
  achievementsSection: { paddingHorizontal: 16 },
  contributionsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  contributionsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  contributionsTitle: { fontSize: 14, fontWeight: "600" },
  contributionsSubtitle: { fontSize: 11 },
  contributionGrid: { flexDirection: "row", gap: 4 },
  gridColumn: { flex: 1, flexDirection: "column", gap: 4 },
  gridSquare: { width: "100%", borderRadius: 2, aspectRatio: 1 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "bold", color: COLORS.redLogout },
  guestContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
    alignItems: "center",
  },
  guestHero: {
    alignItems: "center",
    marginBottom: 24,
  },
  guestIconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  quickConnectBox: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  quickConnectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  quickConnectTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  quickConnectDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  quickConnectButtons: {
    gap: 10,
  },
  quickUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 12,
  },
  btnTextCol: {
    flex: 1,
  },
  quickBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  quickBtnSubText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
  },
  quickAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  quickAdminBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  quickAdminBtnSubText: {
    fontSize: 11,
  },
  standardActions: {
    width: "100%",
    gap: 10,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  registerBtn: {
    paddingVertical: 8,
    alignItems: "center",
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
