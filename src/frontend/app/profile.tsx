import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    amber: "#FFC107",
    white: "#FFFFFF",
    background: "#F4F6F9",
    grayText: "#64748B",
    lightGray: "#E2E8F0",
    greenProgress: "#4CAF50",
    jungleBg: "#2D4A36",
    redLogout: "#D32F2F",
};

// --- Mocks & Helpers ---

const MOCK_USER = {
    name: "Caleb Jensen",
    role: "Product Analyst",
    avatarUri: "https://randomuser.me/api/portraits/men/32.jpg",
    level: 20,
    currentXp: 268,
    maxXp: 320,
    stats: {
        following: 173,
        products: 994,
        followers: 213,
    }
};

const MOCK_CONTRIBUTIONS = Array.from({ length: 18 }, () =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))
);

const getGridColor = (intensity: number) => {
    switch (intensity) {
        case 1: return "#A5D6A7";
        case 2: return "#4CAF50";
        case 3: return "#1B5E20";
        default: return "#E2E8F0";
    }
};

export default function ProfileScreen() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogout = () => {
        // Lógica provisória de navegação: "replace" destrói o histórico da home
        // impedindo que o usuário volte para cá usando o botão de voltar do celular.
        console.log("Mock Logout efetuado!");
        router.replace("/login");
    };

    return (
        <View style={styles.container}>
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <ProfileHeader user={MOCK_USER} />
                <StatsCard stats={MOCK_USER.stats} />
                <LevelProgress currentXp={MOCK_USER.currentXp} maxXp={MOCK_USER.maxXp} level={MOCK_USER.level} />
                <ContributionHistory contributions={MOCK_CONTRIBUTIONS} />

                <LogoutButton onPress={handleLogout} />
            </ScrollView>

            <Footer activeTab="profile" />
        </View>
    );
}

// --- Componentes Internos ---

const ProfileHeader = ({ user }: { user: typeof MOCK_USER }) => (
    <View style={styles.profileHeaderContainer}>
        <View style={styles.jungleBanner}>
            <Ionicons name="leaf" size={120} color="#1E3A27" style={styles.bannerLeafIconLeft} />
            <Ionicons name="leaf" size={90} color="#152E1E" style={styles.bannerLeafIconRight} />
        </View>

        <View style={styles.avatarWrapper}>
            <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
            <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{user.level}</Text>
            </View>
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{user.role}</Text>
    </View>
);

const StatsCard = ({ stats }: { stats: typeof MOCK_USER.stats }) => (
    <View style={styles.statsCard}>
        <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.following}</Text>
            <Text style={styles.statLabel}>Seguindo</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.products}</Text>
            <Text style={styles.statLabel}>Produtos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
        </View>
    </View>
);

const LevelProgress = ({ currentXp, maxXp, level }: { currentXp: number, maxXp: number, level: number }) => {
    const progressPercentage = (currentXp / maxXp) * 100;

    return (
        <View style={styles.levelSection}>
            <View style={styles.levelInfoRow}>
                <Text style={styles.levelText}>Levl. {level}</Text>
                <Text style={styles.levelProgressNumber}>{currentXp}/{maxXp}</Text>
            </View>
            <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
        </View>
    );
};

const ContributionHistory = ({ contributions }: { contributions: number[][] }) => (
    <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Minhas Conquistas</Text>

        <View style={styles.contributionsCard}>
            <Text style={styles.contributionsTitle}>Histórico de contribuições</Text>
            <Text style={styles.contributionsSubtitle}>Últimos 75 dias</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
                <View style={styles.contributionGrid}>
                    {contributions.map((week, weekIndex) => (
                        <View key={weekIndex} style={styles.gridColumn}>
                            {week.map((intensity, dayIndex) => (
                                <View
                                    key={dayIndex}
                                    style={[styles.gridSquare, { backgroundColor: getGridColor(intensity) }]}
                                />
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    </View>
);

const LogoutButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={onPress}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.redLogout} />
        <Text style={styles.logoutText}>Sair da Conta</Text>
    </TouchableOpacity>
);

// --- Estilos ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flexGrow: 1,
        paddingTop: 80,
        paddingBottom: 110,
    },

    profileHeaderContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
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
    avatarImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: COLORS.amber,
        backgroundColor: COLORS.white,
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
        borderColor: COLORS.white,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
    userName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        marginTop: 12,
    },
    userRole: {
        fontSize: 14,
        color: COLORS.grayText,
        marginTop: 2,
    },

    statsCard: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        borderRadius: 16,
        paddingVertical: 14,
        justifyContent: "space-around",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EAEAEA",
        marginBottom: 20,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.darkBlue,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.grayText,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.lightGray,
    },

    levelSection: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    levelInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    levelText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.grayText,
    },
    levelProgressNumber: {
        fontSize: 12,
        color: "#A0AEC0",
    },
    progressBarTrack: {
        height: 10,
        backgroundColor: COLORS.lightGray,
        borderRadius: 5,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: COLORS.greenProgress,
        borderRadius: 5,
    },

    achievementsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        marginBottom: 12,
    },
    contributionsCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#EAEAEA",
    },
    contributionsTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.darkBlue,
    },
    contributionsSubtitle: {
        fontSize: 11,
        color: COLORS.grayText,
        marginBottom: 14,
    },
    gridScroll: {
        paddingVertical: 4,
    },
    contributionGrid: {
        flexDirection: "row",
        gap: 4,
    },
    gridColumn: {
        flexDirection: "column",
        gap: 4,
    },
    gridSquare: {
        width: 11,
        height: 11,
        borderRadius: 2,
    },

    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 24,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#FFEBEB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.redLogout,
    },
});