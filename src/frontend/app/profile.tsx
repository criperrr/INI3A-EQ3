import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../content/themeContent";
import { useAuth } from "../context/AuthContext";
import { getMe, type UserProfile } from "../services/meService";

const COLORS = {
  amber: "#FFC107",
  greenProgress: "#4CAF50",
  jungleBg: "#2D4A36",
  redLogout: "#D32F2F",
  vibrantBlue: "#0062CC",
};

const MOCK_CONTRIBUTIONS = Array.from({ length: 18 }, () =>
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)),
);

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
  const { themeStyles } = useTheme();
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getMe();
        setProfile(data);
      } catch {
        // Fallback: usa dados do contexto de autenticação
        if (authUser) {
          setProfile({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            roleId: authUser.roleId,
          });
        } else {
          setError("Não foi possível carregar o perfil.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [authUser]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, themeStyles.bg]}>
        <ActivityIndicator size="large" color={COLORS.vibrantBlue} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centeredContainer, themeStyles.bg]}>
        <Text style={[{ color: COLORS.redLogout, marginBottom: 16 }]}>
          {error || "Perfil não encontrado."}
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: COLORS.vibrantBlue }}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const points = profile.points ?? 0;
  const maxPoints = Math.max(points + 100, 500);
  const progressPercentage = Math.min((points / maxPoints) * 100, 100);
  const level = Math.floor(points / 100) + 1;

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader user={profile} level={level} />
        <StatsCard points={points} email={profile.email} />
        <LevelProgress
          currentPoints={points}
          maxPoints={maxPoints}
          level={level}
          progressPercentage={progressPercentage}
        />
        <ContributionHistory contributions={MOCK_CONTRIBUTIONS} />
        <LogoutButton onPress={handleLogout} />
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const ProfileHeader = ({
  user,
  level,
}: {
  user: UserProfile;
  level: number;
}) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.profileHeaderContainer}>
      <View style={styles.jungleBanner}>
        <Ionicons
          name="leaf"
          size={120}
          color="#1E3A27"
          style={styles.bannerLeafIconLeft}
        />
        <Ionicons
          name="leaf"
          size={90}
          color="#152E1E"
          style={styles.bannerLeafIconRight}
        />
      </View>

      <View style={styles.avatarWrapper}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={50} color="#FFFFFF" />
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{level}</Text>
        </View>
      </View>

      <Text style={[styles.userName, themeStyles.text]}>{user.name}</Text>
      <Text style={[styles.userRole, themeStyles.subText]}>{user.email}</Text>
    </View>
  );
};

const StatsCard = ({
  points,
  email,
}: {
  points: number;
  email: string;
}) => {
  const { themeStyles } = useTheme();
  return (
    <View style={[styles.statsCard, themeStyles.card, themeStyles.border]}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>{points}</Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>Pontos</Text>
      </View>
      <View
        style={[
          styles.statDivider,
          { backgroundColor: themeStyles.border.borderColor },
        ]}
      />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>0</Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>Preços</Text>
      </View>
      <View
        style={[
          styles.statDivider,
          { backgroundColor: themeStyles.border.borderColor },
        ]}
      />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, themeStyles.text]}>0</Text>
        <Text style={[styles.statLabel, themeStyles.subText]}>Badges</Text>
      </View>
    </View>
  );
};

const LevelProgress = ({
  currentPoints,
  maxPoints,
  level,
  progressPercentage,
}: {
  currentPoints: number;
  maxPoints: number;
  level: number;
  progressPercentage: number;
}) => {
  const { themeStyles } = useTheme();

  return (
    <View style={styles.levelSection}>
      <View style={styles.levelInfoRow}>
        <Text style={[styles.levelText, themeStyles.text]}>
          Nível {level}
        </Text>
        <Text style={[styles.levelProgressNumber, themeStyles.subText]}>
          {currentPoints}/{maxPoints} pts
        </Text>
      </View>
      <View style={[styles.progressBarTrack, themeStyles.inputBg]}>
        <View
          style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
        />
      </View>
    </View>
  );
};

const ContributionHistory = ({
  contributions,
}: {
  contributions: number[][];
}) => {
  const { themeStyles, isDark } = useTheme();
  return (
    <View style={styles.achievementsSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>
        Minhas Conquistas
      </Text>

      <View
        style={[styles.contributionsCard, themeStyles.card, themeStyles.border]}
      >
        <Text style={[styles.contributionsTitle, themeStyles.text]}>
          Histórico de contribuições
        </Text>
        <Text style={[styles.contributionsSubtitle, themeStyles.subText]}>
          Últimos 75 dias
        </Text>

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

const LogoutButton = ({ onPress }: { onPress: () => void }) => {
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
      <Text style={styles.logoutText}>Sair da Conta</Text>
    </TouchableOpacity>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: { flexGrow: 1 },
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
  avatarWrapper: {
    marginTop: 80,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: COLORS.amber,
    backgroundColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    backgroundColor: COLORS.amber,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  levelBadgeText: { fontSize: 12, fontWeight: "bold", color: "#273462" },
  userName: { fontSize: 20, fontWeight: "bold", marginTop: 12 },
  userRole: { fontSize: 14, marginTop: 2 },
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
  levelSection: { marginHorizontal: 16, marginBottom: 24 },
  levelInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  levelText: { fontSize: 14, fontWeight: "600" },
  levelProgressNumber: { fontSize: 12 },
  progressBarTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.greenProgress,
    borderRadius: 5,
  },
  achievementsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  contributionsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  contributionsTitle: { fontSize: 14, fontWeight: "600" },
  contributionsSubtitle: { fontSize: 11, marginBottom: 14 },
  contributionGrid: { flexDirection: "row", gap: 4 },
  gridColumn: { flex: 1, flexDirection: "column", gap: 4 },
  gridSquare: { width: "100%", borderRadius: 2, aspectRatio: 1 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
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
