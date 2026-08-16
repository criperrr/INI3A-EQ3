import React, { useEffect, useState, useCallback } from "react";
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
  const { user, profile, isAdmin, refreshProfile, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!profile);

  const loadData = useCallback(async () => {
    try {
      await refreshProfile();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const displayName = profile?.name || user?.name || "Usuário Presco";
  const displayEmail = profile?.email || user?.email || "";
  const displayRole =
    profile?.levelTitle ||
    (isAdmin ? "Administrador Master" : user?.roleName || "Membro Presco");
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
        />

        {isAdmin && <AdminPrivilegesBanner accent={accent} themeStyles={themeStyles} />}

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

const ProfileHeader = ({
  name,
  email,
  roleTitle,
  level,
  isAdmin,
  accent,
}: {
  name: string;
  email: string;
  roleTitle: string;
  level: number;
  isAdmin: boolean;
  accent: string;
}) => {
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
            <Text style={styles.adminBannerText}>ADMINISTRADOR</Text>
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
            {isAdmin ? "MAX" : `Nv. ${level}`}
          </Text>
        </View>
      </View>

      <Text style={[styles.userName, themeStyles.text]}>{name}</Text>
      <Text style={[styles.userRole, { color: isAdmin ? COLORS.adminGlow : accent }]}>
        {roleTitle}
      </Text>
      <Text style={[styles.userEmail, themeStyles.subText]}>{email}</Text>
    </View>
  );
};

const AdminPrivilegesBanner = ({
  accent,
  themeStyles,
}: {
  accent: string;
  themeStyles: any;
}) => (
  <View style={[styles.adminCard, themeStyles.card, { borderColor: COLORS.adminGlow }]}>
    <View style={styles.adminCardHeader}>
      <Ionicons name="shield-checkmark" size={20} color={COLORS.adminGlow} />
      <Text style={[styles.adminCardTitle, { color: COLORS.adminGlow }]}>
        Painel de Permissões Master
      </Text>
    </View>
    <Text style={[styles.adminCardDesc, themeStyles.subText]}>
      Você tem autoridade total para editar e excluir qualquer produto no catálogo global, além de moderar e auditar ocorrências de todos os usuários.
    </Text>
  </View>
);

const StatsCard = ({
  stats,
  t,
}: {
  stats: { rank: number; reportedPrices: number; points: number };
  t: (key: any) => string;
}) => {
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
};

const LevelProgress = ({
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
}) => {
  const { themeStyles } = useTheme();
  const safeMax = maxXp > 0 ? maxXp : 100;
  const progressPercentage = Math.min((currentXp / safeMax) * 100, 100);

  return (
    <View style={styles.levelSection}>
      <View style={styles.levelInfoRow}>
        <View style={styles.levelTitleCol}>
          <Text style={[styles.levelText, themeStyles.text]}>
            {t("profile.level") || "Nível"} {level} • {roleTitle}
          </Text>
          <Text style={[styles.levelSubText, themeStyles.subText]}>
            Ganhe +15 XP por preço e +25 XP por novo produto
          </Text>
        </View>
        <Text style={[styles.levelProgressNumber, { color: accent }]}>
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
};

const BadgesSection = ({
  badges,
  t,
  accent,
}: {
  badges: BadgeItem[];
  t: (key: any) => string;
  accent: string;
}) => {
  const { themeStyles } = useTheme();

  if (!badges || badges.length === 0) return null;

  return (
    <View style={styles.badgesSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          {t("profile.badges") || "Conquistas e Medalhas"}
        </Text>
        <Text style={[styles.badgeCountText, { color: accent }]}>
          {badges.filter((b) => b.isUnlocked).length}/{badges.length} Desbloqueadas
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
            <Text style={[styles.badgeName, themeStyles.text]} numberOfLines={1}>
              {b.name}
            </Text>
            <Text style={[styles.badgeMinPoints, themeStyles.subText]}>
              {b.isUnlocked ? "Conquistado" : `${b.minPoints} XP`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const ContributionHistory = ({
  contributions,
  reportedCount,
  t,
}: {
  contributions: number[][];
  reportedCount: number;
  t: (key: any) => string;
}) => {
  const { themeStyles, isDark } = useTheme();
  return (
    <View style={styles.achievementsSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>
        {t("profile.contributionStats") || "Atividade de Contribuições"}
      </Text>

      <View
        style={[styles.contributionsCard, themeStyles.card, themeStyles.border]}
      >
        <View style={styles.contributionsHeaderRow}>
          <Text style={[styles.contributionsTitle, themeStyles.text]}>
            Histórico Semanal
          </Text>
          <Text style={[styles.contributionsSubtitle, themeStyles.subText]}>
            {reportedCount} colaborações registradas
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
};

const LogoutButton = ({
  onPress,
  t,
}: {
  onPress: () => void;
  t: (key: any) => string;
}) => {
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
};

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
});
