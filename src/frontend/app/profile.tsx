import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { useAuth } from "../content/authContext";
import type { BadgeItem } from "../services/auth";
import {
  fetchCustomizationCatalog,
  buyCustomizationItem,
  equipCustomizationItem,
  unequipCustomizationCategory,
  type CustomizationItem,
  type EquippedCustomizations,
  type ShopCatalogData,
} from "../services/customizationService";

const COLORS = {
  amber: "#FFC107",
  greenProgress: "#4CAF50",
  jungleBg: "#1F3827",
  redLogout: "#D32F2F",
  gold: "#FFD700",
  adminGlow: "#E6A100",
  cyberCyan: "#00F0FF",
  cyberMagenta: "#FF007F",
  obsidian: "#0F0C20",
  sunset: "#FF6F59",
  aurora: "#02C39A",
};

const BANNER_IMAGES: Record<string, any> = {
  jungle: require("../components/images/banners/banner-jungle.jpg"),
  cyberpunk: require("../components/images/banners/banner-cyberpunk.jpg"),
  sunset: require("../components/images/banners/banner-sunset.jpg"),
  obsidian: require("../components/images/banners/banner-obsidian.jpg"),
  aurora: require("../components/images/banners/banner-aurora.jpg"),
  gold: require("../components/images/banners/banner-gold.jpg"),
  nebula: require("../components/images/banners/banner-nebula.jpg"),
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

  // Customization Shop State
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [catalog, setCatalog] = useState<ShopCatalogData | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

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

  const openShop = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setShopModalVisible(true);
    setLoadingShop(true);
    try {
      const data = await fetchCustomizationCatalog();
      setCatalog(data);
    } catch (e: any) {
      Alert.alert(
        t("common.error") || "Erro",
        e?.message || "Não foi possível carregar a loja de personalizações.",
      );
    } finally {
      setLoadingShop(false);
    }
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
  const userPoints = profile?.points ?? user?.points ?? 0;
  const stats = profile?.stats || {
    rank: 1,
    reportedPrices: 0,
    points: userPoints,
    badgesCount: 0,
  };
  const badges = profile?.badges || [];
  const contributionsGrid = profile?.contributionsGrid || Array.from({ length: 18 }, () => [0, 0, 0, 0]);
  const equippedCustomizations = profile?.equippedCustomizations || catalog?.equipped;

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
          equipped={equippedCustomizations}
          t={t}
        />

        {isAdmin && <AdminPrivilegesBanner accent={accent} themeStyles={themeStyles} t={t} />}

        {/* Customization Store & Points Action Button */}
        <CustomizationBar
          points={userPoints}
          accent={accent}
          themeStyles={themeStyles}
          onPress={openShop}
          t={t}
        />

        <StatsCard stats={stats} t={t} />

        <LevelProgress
          currentXp={currentXp}
          maxXp={maxXp}
          level={displayLevel}
          roleTitle={displayRole}
          t={t}
          accent={accent}
        />

        <BadgesSection
          badges={badges}
          userPoints={userPoints}
          t={t}
          accent={accent}
        />

        <ContributionHistory
          contributions={contributionsGrid}
          reportedCount={stats.reportedPrices}
          t={t}
        />

        <LogoutButton onPress={handleLogout} t={t} />
      </ScrollView>

      {/* Interactive Customization Shop Modal */}
      <CustomizationShopModal
        visible={shopModalVisible}
        onClose={() => setShopModalVisible(false)}
        catalog={catalog}
        loading={loadingShop}
        userPoints={userPoints}
        userLevel={displayLevel}
        displayName={displayName}
        isAdmin={isAdmin}
        accent={accent}
        onRefreshProfile={refreshProfile}
        setCatalog={setCatalog}
        t={t}
      />
    </View>
  );
}

// --- Componentes Visuais do Perfil ---

const ProfileBanner = memo(function ProfileBanner({
  banner,
  isAdmin,
  height = 150,
  t,
}: {
  banner?: CustomizationItem | null;
  isAdmin: boolean;
  height?: number;
  t: (key: any) => string;
}) {
  const preview = banner?.previewValue || "jungle";
  const imageSource = BANNER_IMAGES[preview] || BANNER_IMAGES.jungle;

  return (
    <View style={[styles.bannerContainer, { height }]}>
      <Image
        source={imageSource}
        style={styles.bannerImage}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.bannerDarkOverlay} />
      <AdminBadge isAdmin={isAdmin} t={t} />
    </View>
  );
});

const AdminBadge = memo(function AdminBadge({
  isAdmin,
  t,
}: {
  isAdmin: boolean;
  t: (key: any) => string;
}) {
  if (!isAdmin) return null;
  return (
    <View style={styles.adminBannerBadge}>
      <Ionicons name="shield-checkmark" size={14} color="#FFF" />
      <Text style={styles.adminBannerText} numberOfLines={1} ellipsizeMode="tail">
        {t("profile.adminBadge").toUpperCase()}
      </Text>
    </View>
  );
});

const AvatarWithFrame = memo(function AvatarWithFrame({
  initials,
  isAdmin,
  accent,
  frame,
}: {
  initials: string;
  isAdmin: boolean;
  accent: string;
  frame?: CustomizationItem | null;
}) {
  const framePreset = frame?.previewValue || "classic";
  const frameConfig = frame?.config || {};

  let borderColor = frameConfig.borderColor || (isAdmin ? COLORS.gold : "#FFFFFF");
  let borderWidth = frameConfig.borderWidth || (isAdmin ? 4 : 3);
  let glowStyle = {};
  let topBadgeIcon = frameConfig.topBadge || (isAdmin ? "shield-checkmark" : null);

  if (framePreset === "emerald_ring") {
    borderColor = "#00E676";
    borderWidth = 4;
    glowStyle = { shadowColor: "#00E676", shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 };
  } else if (framePreset === "crimson_flame") {
    borderColor = "#FF3366";
    borderWidth = 4;
    topBadgeIcon = "flame";
    glowStyle = { shadowColor: "#FF3366", shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 };
  } else if (framePreset === "golden_aura") {
    borderColor = "#FFD700";
    borderWidth = 4;
    topBadgeIcon = "sparkles";
    glowStyle = { shadowColor: "#FFD700", shadowOpacity: 0.7, shadowRadius: 9, elevation: 9 };
  } else if (framePreset === "diamond_prism") {
    borderColor = "#00F0FF";
    borderWidth = 4;
    topBadgeIcon = "diamond";
    glowStyle = { shadowColor: "#00F0FF", shadowOpacity: 0.7, shadowRadius: 9, elevation: 9 };
  } else if (framePreset === "cyber_shield") {
    borderColor = "#7928CA";
    borderWidth = 4;
    topBadgeIcon = "shield";
    glowStyle = { shadowColor: "#7928CA", shadowOpacity: 0.7, shadowRadius: 9, elevation: 9 };
  } else if (framePreset === "mythic_crown") {
    borderColor = "#FF9900";
    borderWidth = 5;
    topBadgeIcon = "ribbon";
    glowStyle = { shadowColor: "#FF9900", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  } else if (framePreset === "atomic_heart") {
    borderColor = "#ff0095ff";
    borderWidth = 5;
    topBadgeIcon = "heart";
    glowStyle = { shadowColor: "#ff0095ff", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  } else if (framePreset === "code_laptop") {
    borderColor = "#003cffff";
    borderWidth = 5;
    topBadgeIcon = "laptop";
    glowStyle = { shadowColor: "#003cffff", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  } else if (framePreset === "dark_moon") {
    borderColor = "#cc00ffff";
    borderWidth = 5;
    topBadgeIcon = "moon";
    glowStyle = { shadowColor: "#cc00ffff", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  } else if (framePreset === "harmonic-note") {
    borderColor = "#af5f03ff";
    borderWidth = 5;
    topBadgeIcon = "note";
    glowStyle = { shadowColor: "#af5f03ff", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  } else if (framePreset === "little_star") {
    borderColor = "#070991ff";
    borderWidth = 5;
    topBadgeIcon = "star";
    glowStyle = { shadowColor: "#070991ff", shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 };
  }

  return (
    <View style={[styles.avatarCircleWrapper, glowStyle]}>
      {topBadgeIcon && (
        <View style={[styles.avatarTopBadge, { backgroundColor: borderColor }]}>
          <Ionicons name={topBadgeIcon as any} size={12} color="#FFFFFF" />
        </View>
      )}
      <View
        style={[
          styles.avatarCircle,
          {
            backgroundColor: isAdmin ? "#273462" : accent,
            borderColor,
            borderWidth,
          },
        ]}
      >
        <Text style={styles.avatarInitialsText}>{initials}</Text>
      </View>
    </View>
  );
});

const LevelCustomBadge = memo(function LevelCustomBadge({
  level,
  isAdmin,
  levelFrame,
  t,
}: {
  level: number;
  isAdmin: boolean;
  levelFrame?: CustomizationItem | null;
  t: (key: any) => string;
}) {
  const preset = levelFrame?.previewValue || "classic_pill";
  const config = levelFrame?.config || {};

  let badgeBg = config.bg || (isAdmin ? COLORS.adminGlow : COLORS.amber);
  let textColor = config.textColor || (isAdmin ? "#FFFFFF" : "#273462");
  let icon = config.icon || (isAdmin ? "sparkles" : null);

  if (preset === "steampunk_gear") {
    badgeBg = "#B87333";
    textColor = "#FFFFFF";
    icon = "settings";
  } else if (preset === "guardian_shield") {
    badgeBg = "#4A90E2";
    textColor = "#FFFFFF";
    icon = "shield-checkmark";
  } else if (preset === "celestial_wings") {
    badgeBg = "#FF9F1C";
    textColor = "#FFFFFF";
    icon = "airplane";
  } else if (preset === "galactic_star") {
    badgeBg = "#8338EC";
    textColor = "#FFFFFF";
    icon = "sparkles";
  } else if (preset === "sovereign_crest") {
    badgeBg = "#E6A100";
    textColor = "#FFFFFF";
    icon = "trophy";
  }

  return (
    <View style={[styles.levelBadge, { backgroundColor: badgeBg }]}>
      {icon && <Ionicons name={icon as any} size={12} color={textColor} style={{ marginRight: 3 }} />}
      <Text style={[styles.levelBadgeText, { color: textColor }]}>
        {isAdmin ? "MAX" : `${t("common.levelShort")} ${level}`}
      </Text>
    </View>
  );
});

const ProfileHeader = memo(function ProfileHeader({
  name,
  email,
  roleTitle,
  level,
  isAdmin,
  accent,
  equipped,
  t,
}: {
  name: string;
  email: string;
  roleTitle: string;
  level: number;
  isAdmin: boolean;
  accent: string;
  equipped?: EquippedCustomizations | null;
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
      <ProfileBanner banner={equipped?.banner} isAdmin={isAdmin} t={t} />

      <View style={styles.avatarWrapper}>
        <AvatarWithFrame
          initials={getInitials(name)}
          isAdmin={isAdmin}
          accent={accent}
          frame={equipped?.avatarFrame}
        />
        <LevelCustomBadge
          level={level}
          isAdmin={isAdmin}
          levelFrame={equipped?.levelFrame}
          t={t}
        />
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

const CustomizationBar = memo(function CustomizationBar({
  points,
  accent,
  themeStyles,
  onPress,
  t,
}: {
  points: number;
  accent: string;
  themeStyles: any;
  onPress: () => void;
  t: (key: any) => string;
}) {
  return (
    <TouchableOpacity
      style={[styles.customizationBar, themeStyles.card, { borderColor: accent + "50" }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.customizationBarLeft}>
        <View style={[styles.shopIconBubble, { backgroundColor: accent + "20" }]}>
          <Ionicons name="color-palette" size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customizationBarTitle, themeStyles.text]} numberOfLines={1}>
            {t("profile.customizationShop")}
          </Text>
          <Text style={[styles.customizationBarDesc, themeStyles.subText]} numberOfLines={1}>
            {t("profile.customizeProfile")}
          </Text>
        </View>
      </View>

      <View style={[styles.pointsBadgePill, { backgroundColor: COLORS.gold + "20", borderColor: COLORS.gold + "60" }]}>
        <Ionicons name="sparkles" size={13} color={COLORS.gold} />
        <Text style={[styles.pointsBadgePillText, { color: COLORS.gold }]}>
          {points} XP
        </Text>
      </View>
    </TouchableOpacity>
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
  userPoints = 0,
  t,
  accent,
}: {
  badges: BadgeItem[];
  userPoints?: number;
  t: (key: any, params?: any) => string;
  accent: string;
}) {
  const { themeStyles, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  if (!badges || badges.length === 0) return null;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const lockedCount = badges.length - unlockedCount;

  const filteredBadges = badges.filter((b) => {
    if (activeFilter === "unlocked") return b.isUnlocked;
    if (activeFilter === "locked") return !b.isUnlocked;
    return true;
  });

  const visibleBadges = isExpanded ? filteredBadges : filteredBadges.slice(0, 6);

  const handleSelectBadge = (b: BadgeItem) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedBadge(b);
  };

  return (
    <View style={[styles.badgesContainerCard, themeStyles.card, themeStyles.border]}>
      {/* Header with Title & Unlocked Badge Pill */}
      <View style={styles.badgesCardHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.sectionTitle, themeStyles.text]} numberOfLines={1}>
            {t("profile.badges")}
          </Text>
          <Text style={[styles.badgesCardSubtitle, themeStyles.subText]} numberOfLines={1}>
            {t("profile.xpRewardHint")}
          </Text>
        </View>
        <View style={[styles.badgeCountBadge, { backgroundColor: `${accent}20`, borderColor: `${accent}50` }]}>
          <Text style={[styles.badgeCountText, { color: accent }]} numberOfLines={1}>
            {unlockedCount}/{badges.length} {t("profile.unlockedCount")}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.badgeFilterRow}>
        <TouchableOpacity
          style={[
            styles.badgeFilterChip,
            activeFilter === "all"
              ? { backgroundColor: accent, borderColor: accent }
              : [themeStyles.card, themeStyles.border],
          ]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setActiveFilter("all");
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.badgeFilterText,
              activeFilter === "all" ? { color: "#FFFFFF", fontWeight: "700" } : themeStyles.subText,
            ]}
          >
            {t("profile.allBadgesFilter")} ({badges.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.badgeFilterChip,
            activeFilter === "unlocked"
              ? { backgroundColor: accent, borderColor: accent }
              : [themeStyles.card, themeStyles.border],
          ]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setActiveFilter("unlocked");
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.badgeFilterText,
              activeFilter === "unlocked" ? { color: "#FFFFFF", fontWeight: "700" } : themeStyles.subText,
            ]}
          >
            {t("profile.unlockedBadgesFilter")} ({unlockedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.badgeFilterChip,
            activeFilter === "locked"
              ? { backgroundColor: accent, borderColor: accent }
              : [themeStyles.card, themeStyles.border],
          ]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setActiveFilter("locked");
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.badgeFilterText,
              activeFilter === "locked" ? { color: "#FFFFFF", fontWeight: "700" } : themeStyles.subText,
            ]}
          >
            {t("profile.lockedBadgesFilter")} ({lockedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contained Responsive Grid (3 columns, zero overflow) */}
      <View style={styles.badgesGrid}>
        {visibleBadges.map((b) => {
          const isUnlocked = b.isUnlocked;
          return (
            <TouchableOpacity
              key={b.id}
              style={[
                styles.badgeGridCard,
                themeStyles.card,
                themeStyles.border,
                !isUnlocked && styles.badgeGridCardLocked,
                isUnlocked && { borderColor: `${accent}50` },
              ]}
              onPress={() => handleSelectBadge(b)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.badgeIconCircle,
                  isUnlocked
                    ? { backgroundColor: `${accent}18`, borderColor: `${accent}35` }
                    : { backgroundColor: isDark ? "#23272F" : "#E2E8F0", borderColor: "transparent" },
                ]}
              >
                <Text style={styles.badgeEmoji}>{b.icon || "🏅"}</Text>
                {!isUnlocked && (
                  <View style={styles.badgeLockOverlay}>
                    <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text
                style={[styles.badgeGridName, themeStyles.text]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {b.name}
              </Text>

              <View
                style={[
                  styles.badgeStatusTag,
                  isUnlocked
                    ? { backgroundColor: `${accent}20` }
                    : { backgroundColor: isDark ? "#1C2028" : "#EEF2F6" },
                ]}
              >
                <Text
                  style={[
                    styles.badgeStatusText,
                    isUnlocked ? { color: accent, fontWeight: "700" } : themeStyles.subText,
                  ]}
                  numberOfLines={1}
                >
                  {isUnlocked ? t("profile.unlocked") : `${b.minPoints} XP`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expand / Collapse Button */}
      {filteredBadges.length > 6 && (
        <TouchableOpacity
          style={[styles.badgeExpandBtn, themeStyles.border]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setIsExpanded(!isExpanded);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.badgeExpandText, { color: accent }]}>
            {isExpanded
              ? t("profile.hideBadges")
              : t("profile.viewAllBadges", { count: filteredBadges.length })}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={accent}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      )}

      {/* Interactive Achievement Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <View style={styles.badgeModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedBadge(null)}
          />
          {selectedBadge && (
            <View style={[styles.badgeModalCard, themeStyles.card, themeStyles.border]}>
              <View
                style={[
                  styles.badgeModalIconWrapper,
                  selectedBadge.isUnlocked
                    ? { backgroundColor: `${accent}20`, borderColor: accent }
                    : { backgroundColor: isDark ? "#23272F" : "#E2E8F0", borderColor: themeStyles.border.borderColor },
                ]}
              >
                <Text style={styles.badgeModalEmoji}>{selectedBadge.icon || "🏅"}</Text>
              </View>

              <Text style={[styles.badgeModalTitle, themeStyles.text]} numberOfLines={2}>
                {selectedBadge.name}
              </Text>

              {/* Status Pill */}
              <View
                style={[
                  styles.badgeModalStatusPill,
                  selectedBadge.isUnlocked
                    ? { backgroundColor: `${accent}20` }
                    : { backgroundColor: isDark ? "#2C313D" : "#E2E8F0" },
                ]}
              >
                <Ionicons
                  name={selectedBadge.isUnlocked ? "checkmark-circle" : "lock-closed"}
                  size={14}
                  color={selectedBadge.isUnlocked ? accent : themeStyles.subText.color}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.badgeModalStatusText,
                    selectedBadge.isUnlocked ? { color: accent } : themeStyles.subText,
                  ]}
                >
                  {selectedBadge.isUnlocked
                    ? selectedBadge.awardedAt
                      ? t("profile.badgeEarnedOn", {
                          date: new Date(selectedBadge.awardedAt).toLocaleDateString(),
                        })
                      : t("profile.unlocked")
                    : t("profile.locked")}
                </Text>
              </View>

              {/* Description */}
              <Text style={[styles.badgeModalDesc, themeStyles.subText]}>
                {selectedBadge.description || t("profile.xpRewardHint")}
              </Text>

              {/* Requirement & Progress Bar */}
              <View style={[styles.badgeModalReqBox, { backgroundColor: isDark ? "#121720" : "#F4F6F8" }]}>
                <View style={styles.badgeModalReqRow}>
                  <Text style={[styles.badgeModalReqLabel, themeStyles.subText]}>
                    {t("profile.badgeRequirement", { points: selectedBadge.minPoints })}
                  </Text>
                  <Text style={[styles.badgeModalReqValue, { color: accent }]}>
                    {userPoints} / {selectedBadge.minPoints} XP
                  </Text>
                </View>

                <View style={styles.badgeModalProgressBarBg}>
                  <View
                    style={[
                      styles.badgeModalProgressBarFill,
                      {
                        backgroundColor: accent,
                        width: `${Math.min(100, Math.max(0, (userPoints / Math.max(1, selectedBadge.minPoints)) * 100))}%`,
                      },
                    ]}
                  />
                </View>

                {!selectedBadge.isUnlocked && userPoints < selectedBadge.minPoints && (
                  <Text style={[styles.badgeModalRemainingText, { color: accent }]}>
                    {t("profile.badgeRemainingXp", {
                      points: selectedBadge.minPoints - userPoints,
                    })}
                  </Text>
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.badgeModalCloseBtn, { backgroundColor: accent }]}
                onPress={() => setSelectedBadge(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.badgeModalCloseBtnText}>{t("profile.badgeClose")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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

// --- Modal Interativo da Loja & Customização ---

interface CustomizationShopModalProps {
  visible: boolean;
  onClose: () => void;
  catalog: ShopCatalogData | null;
  loading: boolean;
  userPoints: number;
  userLevel: number;
  displayName: string;
  isAdmin: boolean;
  accent: string;
  onRefreshProfile: () => Promise<any>;
  setCatalog: React.Dispatch<React.SetStateAction<ShopCatalogData | null>>;
  t: (key: any, params?: any) => string;
}

function CustomizationShopModal({
  visible,
  onClose,
  catalog,
  loading,
  userPoints,
  userLevel,
  displayName,
  isAdmin,
  accent,
  onRefreshProfile,
  setCatalog,
  t,
}: CustomizationShopModalProps) {
  const { themeStyles } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<"all" | "banner" | "avatar_frame" | "level_frame" | "title">("all");
  const [previewCustomizations, setPreviewCustomizations] = useState<EquippedCustomizations | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Sync preview with current equipped items when opening
  useEffect(() => {
    if (catalog?.equipped) {
      setPreviewCustomizations(catalog.equipped);
    }
  }, [catalog]);

  const initials = useMemo(() => {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  const isPreviewDifferent = useMemo(() => {
    if (!catalog?.equipped || !previewCustomizations) return false;
    return (
      previewCustomizations.banner?.id !== catalog.equipped.banner?.id ||
      previewCustomizations.avatarFrame?.id !== catalog.equipped.avatarFrame?.id ||
      previewCustomizations.levelFrame?.id !== catalog.equipped.levelFrame?.id ||
      previewCustomizations.title?.id !== catalog.equipped.title?.id
    );
  }, [catalog, previewCustomizations]);

  const previewingItemName = useMemo(() => {
    if (!isPreviewDifferent || !catalog?.equipped || !previewCustomizations) return null;
    if (previewCustomizations.title?.id !== catalog.equipped.title?.id) {
      return previewCustomizations.title?.name;
    }
    if (previewCustomizations.avatarFrame?.id !== catalog.equipped.avatarFrame?.id) {
      return previewCustomizations.avatarFrame?.name;
    }
    if (previewCustomizations.levelFrame?.id !== catalog.equipped.levelFrame?.id) {
      return previewCustomizations.levelFrame?.name;
    }
    if (previewCustomizations.banner?.id !== catalog.equipped.banner?.id) {
      return previewCustomizations.banner?.name;
    }
    return null;
  }, [isPreviewDifferent, catalog, previewCustomizations]);

  const categorizedSections = useMemo(() => {
    if (!catalog?.items) return [];

    const categories: {
      key: "banner" | "avatar_frame" | "level_frame" | "title";
      title: string;
      subtitle: string;
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
      items: CustomizationItem[];
    }[] = [
      {
        key: "title",
        title: t("profile.tabTitles"),
        subtitle: t("profile.customTitle"),
        icon: "medal",
        color: "#FF9900",
        items: catalog.items.filter((i) => i.category === "title"),
      },
      {
        key: "banner",
        title: t("profile.tabBanners"),
        subtitle: t("profile.customBanner"),
        icon: "color-palette",
        color: "#9B5DE5",
        items: catalog.items.filter((i) => i.category === "banner"),
      },
      {
        key: "avatar_frame",
        title: t("profile.tabAvatarFrames"),
        subtitle: t("profile.customAvatarFrame"),
        icon: "scan-circle",
        color: "#00F0FF",
        items: catalog.items.filter((i) => i.category === "avatar_frame"),
      },
      {
        key: "level_frame",
        title: t("profile.tabLevelFrames"),
        subtitle: t("profile.customLevelBadge"),
        icon: "ribbon",
        color: COLORS.gold,
        items: catalog.items.filter((i) => i.category === "level_frame"),
      },
    ];

    if (selectedCategory === "all") {
      return categories.filter((c) => c.items.length > 0);
    }
    return categories.filter((c) => c.key === selectedCategory && c.items.length > 0);
  }, [catalog, selectedCategory, t]);

  const handlePreviewItem = (item: CustomizationItem) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setPreviewCustomizations((prev) => {
      if (!prev) return null;
      if (item.category === "banner") {
        return { ...prev, banner: item };
      }
      if (item.category === "avatar_frame") {
        return { ...prev, avatarFrame: item };
      }
      if (item.category === "level_frame") {
        return { ...prev, levelFrame: item };
      }
      if (item.category === "title") {
        return { ...prev, title: item };
      }
      return prev;
    });
  };

  const handleBuy = async (item: CustomizationItem) => {
    setActionLoadingId(item.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      const res = await buyCustomizationItem(item.id);
      setCatalog(res.catalog);
      setPreviewCustomizations(res.catalog.equipped);
      await onRefreshProfile();
      Alert.alert(t("profile.customizationShop"), t("profile.itemPurchasedSuccess"));
    } catch (e: any) {
      Alert.alert(t("common.error") || "Erro", e?.message || "Falha ao comprar item.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEquip = async (item: CustomizationItem) => {
    setActionLoadingId(item.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await equipCustomizationItem(item.id);
      setCatalog(res.catalog);
      setPreviewCustomizations(res.catalog.equipped);
      await onRefreshProfile();
      Alert.alert(t("profile.customizationShop"), t("profile.itemEquippedSuccess"));
    } catch (e: any) {
      Alert.alert(t("common.error") || "Erro", e?.message || "Falha ao equipar item.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnequip = async (
    category: "banner" | "avatar_frame" | "level_frame" | "title",
  ) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const res = await unequipCustomizationCategory(category);
      setCatalog(res.catalog);
      setPreviewCustomizations(res.catalog.equipped);
      await onRefreshProfile();
    } catch (e: any) {
      Alert.alert(t("common.error") || "Erro", e?.message || "Falha ao desequipar item.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, themeStyles.bg]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, themeStyles.border]}>
          <View style={styles.modalHeaderTitleCol}>
            <Text style={[styles.modalHeaderTitle, themeStyles.text]} numberOfLines={1}>
              {t("profile.customizationShop")}
            </Text>
            <Text style={[styles.modalHeaderSubtitle, themeStyles.subText]} numberOfLines={1}>
              {t("profile.shopSubtitle")}
            </Text>
          </View>

          <View style={styles.modalHeaderRight}>
            <View style={[styles.pointsBadgePill, { backgroundColor: COLORS.gold + "20", borderColor: COLORS.gold + "60" }]}>
              <Ionicons name="sparkles" size={14} color={COLORS.gold} />
              <Text style={[styles.pointsBadgePillText, { color: COLORS.gold }]}>
                {catalog?.userPoints ?? userPoints} XP
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={themeStyles.text.color} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !catalog ? (
          <View style={[styles.container, styles.centerContent]}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, themeStyles.subText]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : (
          <View style={styles.shopBodyContainer}>
            {/* Live Preview Sticky Top Section */}
            <View style={[styles.stickyPreviewContainer, themeStyles.card, themeStyles.border]}>
              <View style={styles.previewStageHeader}>
                <View style={styles.previewStageHeaderLeft}>
                  <Ionicons name="eye" size={15} color={accent} />
                  <Text style={[styles.previewStageTitle, { color: accent }]}>
                    {t("profile.livePreviewTitle")}
                  </Text>
                </View>

                {isPreviewDifferent && (
                  <TouchableOpacity
                    style={[styles.previewResetBadge, { backgroundColor: accent + "18", borderColor: accent + "40" }]}
                    onPress={() => {
                      if (catalog?.equipped) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setPreviewCustomizations(catalog.equipped);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={12} color={accent} />
                    <Text style={[styles.previewResetText, { color: accent }]} numberOfLines={1}>
                      {t("profile.previewingItem")}: {previewingItemName || ""}
                    </Text>
                    <Ionicons name="close-circle" size={14} color={accent} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Mini-Stage with Banner + Avatar + Level Badge + Name & Title */}
              <View style={[styles.previewMiniStage, themeStyles.card, themeStyles.border]}>
                <ProfileBanner banner={previewCustomizations?.banner} isAdmin={isAdmin} height={96} t={t} />
                <View style={styles.previewAvatarWrapper}>
                  <AvatarWithFrame
                    initials={initials}
                    isAdmin={isAdmin}
                    accent={accent}
                    frame={previewCustomizations?.avatarFrame}
                  />
                  <LevelCustomBadge
                    level={catalog?.userLevel ?? userLevel}
                    isAdmin={isAdmin}
                    levelFrame={previewCustomizations?.levelFrame}
                    t={t}
                  />
                </View>

                <View style={styles.previewUserInfoCol}>
                  <Text style={[styles.previewUserName, themeStyles.text]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View
                    style={[
                      styles.previewTitlePill,
                      {
                        backgroundColor:
                          (previewCustomizations?.title?.config as any)?.badgeColor
                            ? (previewCustomizations?.title?.config as any).badgeColor + "20"
                            : accent + "20",
                        borderColor:
                          (previewCustomizations?.title?.config as any)?.badgeColor || accent,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        ((previewCustomizations?.title?.config as any)?.icon || "medal") as any
                      }
                      size={12}
                      color={
                        (previewCustomizations?.title?.config as any)?.badgeColor || accent
                      }
                    />
                    <Text
                      style={[
                        styles.previewTitlePillText,
                        {
                          color:
                            (previewCustomizations?.title?.config as any)?.badgeColor || accent,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {previewCustomizations?.title?.name || "Iniciante"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Category Switcher Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryTabsScroll}
              >
                {[
                  { key: "all", label: t("profile.tabAll"), icon: "apps" },
                  { key: "title", label: t("profile.tabTitles"), icon: "medal" },
                  { key: "banner", label: t("profile.tabBanners"), icon: "color-palette" },
                  { key: "avatar_frame", label: t("profile.tabAvatarFrames"), icon: "scan-circle" },
                  { key: "level_frame", label: t("profile.tabLevelFrames"), icon: "ribbon" },
                ].map((tab) => {
                  const isSelected = selectedCategory === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.categoryTabChip,
                        themeStyles.inputBg,
                        themeStyles.border,
                        isSelected && { backgroundColor: accent, borderColor: accent },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setSelectedCategory(tab.key as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={tab.icon as any}
                        size={13}
                        color={isSelected ? "#FFFFFF" : themeStyles.subText.color}
                      />
                      <Text
                        style={[
                          styles.categoryTabChipText,
                          themeStyles.text,
                          isSelected && { color: "#FFFFFF", fontWeight: "bold" },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Scrollable Catalog Items List */}
            <ScrollView
              contentContainerStyle={styles.shopScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.catalogItemsList}>
                {categorizedSections.map((section) => (
                  <View key={section.key} style={styles.categorySectionContainer}>
                    {/* Category Header Card */}
                    <View style={styles.categorySectionHeader}>
                      <View style={styles.categorySectionHeaderLeft}>
                        <View style={[styles.categorySectionIconBadge, { backgroundColor: section.color + "20" }]}>
                          <Ionicons name={section.icon as any} size={16} color={section.color} />
                        </View>
                        <View style={styles.categorySectionTitleCol}>
                          <Text style={[styles.categorySectionTitle, themeStyles.text]} numberOfLines={1}>
                            {section.title}
                          </Text>
                          <Text style={[styles.categorySectionSubtitle, themeStyles.subText]} numberOfLines={1}>
                            {section.subtitle}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryCountBadge}>
                        <Text style={[styles.categoryCountText, themeStyles.subText]}>
                          {section.items.length}
                        </Text>
                      </View>
                    </View>

                    {/* Category Items List */}
                    <View style={styles.categoryItemsStack}>
                      {section.items.map((item) => {
                        const isCurrentlyPreviewed =
                          (item.category === "banner" && previewCustomizations?.banner?.id === item.id) ||
                          (item.category === "avatar_frame" && previewCustomizations?.avatarFrame?.id === item.id) ||
                          (item.category === "level_frame" && previewCustomizations?.levelFrame?.id === item.id) ||
                          (item.category === "title" && previewCustomizations?.title?.id === item.id);

                        const isActionLoading = actionLoadingId === item.id;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.itemCard,
                              themeStyles.card,
                              themeStyles.border,
                              isCurrentlyPreviewed && { borderColor: accent, borderWidth: 2 },
                            ]}
                            activeOpacity={0.85}
                            onPress={() => handlePreviewItem(item)}
                          >
                            {/* Item Card Header / Swatch */}
                            <View style={styles.itemCardTopRow}>
                              <View style={styles.itemSwatchCircle}>
                                <ItemCategoryIcon item={item} accent={accent} />
                              </View>

                              <View style={styles.itemInfoCol}>
                                <View style={styles.itemNameRow}>
                                  <Text style={[styles.itemCardName, themeStyles.text]} numberOfLines={1}>
                                    {item.name}
                                  </Text>
                                  {item.isEquipped && (
                                    <View style={styles.equippedCheckPill}>
                                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                                      <Text style={styles.equippedCheckText}>
                                        {t("profile.equipped")}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                <Text style={[styles.itemCardDesc, themeStyles.subText]} numberOfLines={2}>
                                  {item.description}
                                </Text>
                              </View>
                            </View>

                            {/* Item Requirements & Action Bottom Row */}
                            <View style={styles.itemCardBottomRow}>
                              <View style={styles.itemMetaLeft}>
                                <View
                                  style={[
                                    styles.itemPriceTag,
                                    {
                                      backgroundColor: item.price === 0 ? "#4CAF5015" : COLORS.gold + "18",
                                      borderColor: item.price === 0 ? "#4CAF5040" : COLORS.gold + "50",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.itemPriceTagText,
                                      { color: item.price === 0 ? "#4CAF50" : COLORS.gold },
                                    ]}
                                  >
                                    {item.price === 0 ? t("profile.free") : t("profile.pointsCost", { points: item.price })}
                                  </Text>
                                </View>

                                {item.minLevel > 1 && (
                                  <View
                                    style={[
                                      styles.itemLevelReqChip,
                                      {
                                        backgroundColor: item.meetsLevel ? "#4CAF5010" : "#FF525215",
                                        borderColor: item.meetsLevel ? "#4CAF5030" : "#FF525230",
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.itemLevelReqText,
                                        { color: item.meetsLevel ? "#4CAF50" : "#FF5252" },
                                      ]}
                                    >
                                      {t("profile.levelRequired", { level: item.minLevel })}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Action Button */}
                              <View style={styles.itemActionsRight}>
                                {isActionLoading ? (
                                  <ActivityIndicator size="small" color={accent} style={{ paddingHorizontal: 16 }} />
                                ) : item.isEquipped ? (
                                  !item.isDefault ? (
                                    <TouchableOpacity
                                      style={[styles.unequipBtn, themeStyles.inputBg]}
                                      onPress={() => handleUnequip(item.category)}
                                      activeOpacity={0.8}
                                    >
                                      <Text style={[styles.unequipBtnText, themeStyles.subText]}>
                                        {t("profile.unequip")}
                                      </Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={[styles.actionBadgePill, { backgroundColor: "#4CAF5020" }]}>
                                      <Text style={[styles.actionBadgeText, { color: "#4CAF50" }]}>
                                        {t("profile.equipped")}
                                      </Text>
                                    </View>
                                  )
                                ) : item.isOwned ? (
                                  <TouchableOpacity
                                    style={[styles.equipBtn, { backgroundColor: accent }]}
                                    onPress={() => handleEquip(item)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="shirt-outline" size={14} color="#FFFFFF" />
                                    <Text style={styles.equipBtnText}>{t("profile.equip")}</Text>
                                  </TouchableOpacity>
                                ) : !item.meetsLevel ? (
                                  <View style={[styles.actionBadgePill, { backgroundColor: "#FF525215" }]}>
                                    <Ionicons name="lock-closed" size={12} color="#FF5252" />
                                    <Text style={[styles.actionBadgeText, { color: "#FF5252" }]}>
                                      {t("profile.locked")}
                                    </Text>
                                  </View>
                                ) : !item.canAfford ? (
                                  <View style={[styles.actionBadgePill, { backgroundColor: "#88888820" }]}>
                                    <Text style={[styles.actionBadgeText, themeStyles.subText]}>
                                      {t("profile.insufficientPoints")}
                                    </Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={[styles.buyBtn, { backgroundColor: COLORS.gold }]}
                                    onPress={() => handleBuy(item)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="cart" size={14} color="#273462" />
                                    <Text style={styles.buyBtnText}>{t("profile.buy")}</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ItemCategoryIcon = memo(function ItemCategoryIcon({
  item,
  accent,
}: {
  item: CustomizationItem;
  accent: string;
}) {
  const config = item.config || {};
  if (item.category === "banner") {
    const bannerImg = BANNER_IMAGES[item.previewValue || "jungle"];
    if (bannerImg) {
      return (
        <Image
          source={bannerImg}
          style={styles.bannerThumbnailIcon}
          contentFit="cover"
          cachePolicy="disk"
        />
      );
    }
    const iconName = config.icon || "image";
    return <Ionicons name={iconName as any} size={22} color={config.accentColor || accent} />;
  }
  if (item.category === "avatar_frame") {
    const iconName = config.topBadge || "ellipse-outline";
    return <Ionicons name={iconName as any} size={22} color={config.borderColor || accent} />;
  }
  if (item.category === "level_frame") {
    const iconName = config.icon || "ribbon";
    return <Ionicons name={iconName as any} size={22} color={config.bg || accent} />;
  }
  if (item.category === "title") {
    const iconName = config.icon || "medal";
    return <Ionicons name={iconName as any} size={22} color={config.badgeColor || accent} />;
  }
  return <Ionicons name="sparkles" size={22} color={accent} />;
});

// --- Unauthenticated View ---

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
  profileHeaderContainer: { alignItems: "center", marginBottom: 14 },
  bannerContainer: {
    width: "100%",
    height: 150,
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerDarkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  bannerThumbnailIcon: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
  },
  adminBannerBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(230, 161, 0, 0.92)",
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleWrapper: {
    position: "relative",
  },
  avatarTopBadge: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    zIndex: 10,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  levelBadge: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 12,
  },
  levelBadgeText: { fontSize: 11, fontWeight: "bold" },
  userName: { fontSize: 20, fontWeight: "bold", marginTop: 14 },
  userRole: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  userEmail: { fontSize: 12, marginTop: 2 },
  customizationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
  },
  customizationBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  shopIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  customizationBarTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  customizationBarDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  pointsBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointsBadgePillText: {
    fontSize: 12,
    fontWeight: "bold",
  },
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
  badgesContainerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  badgesCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgesCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  badgeCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  badgeFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeFilterText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  badgeGridCard: {
    width: "30.8%",
    minHeight: 112,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  badgeGridCardLocked: {
    opacity: 0.6,
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeLockOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGridName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
    minHeight: 26,
    marginVertical: 4,
    paddingHorizontal: 2,
  },
  badgeStatusTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  badgeStatusText: {
    fontSize: 9.5,
  },
  badgeExpandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeExpandText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  badgeModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  badgeModalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 12,
  },
  badgeModalEmoji: {
    fontSize: 38,
  },
  badgeModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  badgeModalStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeModalStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeModalDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  badgeModalReqBox: {
    width: "100%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  badgeModalReqRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeModalReqLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  badgeModalReqValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeModalProgressBarBg: {
    height: 8,
    backgroundColor: "rgba(128,128,128,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  badgeModalProgressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  badgeModalRemainingText: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "right",
  },
  badgeModalCloseBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  badgeModalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
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

  // Modal Styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleCol: { flex: 1, marginRight: 10 },
  modalHeaderTitle: { fontSize: 18, fontWeight: "bold" },
  modalHeaderSubtitle: { fontSize: 11, marginTop: 2 },
  modalHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  closeBtn: { padding: 4 },
  shopScrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  shopBodyContainer: {
    flex: 1,
  },
  stickyPreviewContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 100,
  },
  previewStageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewStageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewStageTitle: { fontSize: 11.5, fontWeight: "bold", letterSpacing: 0.5 },
  previewResetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewResetText: {
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 160,
  },
  previewMiniStage: {
    width: "100%",
    minHeight: 200,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    position: "relative",
    marginBottom: 8,
    borderWidth: 1,
    paddingBottom: 10,
  },
  previewAvatarWrapper: {
    marginTop: 46,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  previewUserInfoCol: {
    alignItems: "center",
    marginTop: 12,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  previewUserName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  previewTitlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  previewTitlePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryTabsScroll: { gap: 8, paddingVertical: 2 },
  categoryTabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryTabChipText: { fontSize: 11.5, fontWeight: "600" },
  catalogItemsList: { gap: 16 },
  categorySectionContainer: {
    marginBottom: 16,
  },
  categorySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.25)",
  },
  categorySectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  categorySectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categorySectionTitleCol: {
    flex: 1,
  },
  categorySectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  categorySectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(150, 150, 150, 0.12)",
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  categoryItemsStack: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  itemCardTopRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  itemSwatchCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(150, 150, 150, 0.12)",
    overflow: "hidden",
  },
  itemInfoCol: { flex: 1 },
  itemNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemCardName: { fontSize: 14, fontWeight: "bold", flex: 1 },
  equippedCheckPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4CAF5018",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  equippedCheckText: { fontSize: 10, fontWeight: "bold", color: "#4CAF50" },
  itemCardDesc: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  itemCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
    paddingTop: 10,
  },
  itemMetaLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, marginRight: 8 },
  itemPriceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemPriceTagText: { fontSize: 11, fontWeight: "bold" },
  itemLevelReqChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemLevelReqText: { fontSize: 10, fontWeight: "bold" },
  itemActionsRight: { flexDirection: "row", alignItems: "center" },
  equipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  equipBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  buyBtnText: { color: "#273462", fontSize: 12, fontWeight: "bold" },
  unequipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  unequipBtnText: { fontSize: 11, fontWeight: "600" },
  actionBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBadgeText: { fontSize: 11, fontWeight: "600" },
});
