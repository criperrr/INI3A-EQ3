import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
};

export default function ProfileScreen() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Mock para gerar os quadradinhos do gráfico de contribuição
    const contributionWeeks = Array.from({ length: 18 }, () =>
        Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))
    );

    // Define a cor do quadrinho baseado na intensidade (0 a 3)
    const getGridColor = (intensity: number) => {
        switch (intensity) {
            case 1: return "#A5D6A7";
            case 2: return "#4CAF50";
            case 3: return "#1B5E20";
            default: return "#E2E8F0";
        }
    };

    return (
        <View style={styles.container}>
            {/* Header e Sidebar */}
            <Header onPressMenu={() => setIsMenuOpen(true)} />
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Banner de fundo e Avatar */}
                <View style={styles.profileHeaderContainer}>
                    {/* Banner estilizado da selva/folhas */}
                    <View style={styles.jungleBanner}>
                        <Ionicons name="leaf" size={120} color="#1E3A27" style={styles.bannerLeafIconLeft} />
                        <Ionicons name="leaf" size={90} color="#152E1E" style={styles.bannerLeafIconRight} />
                    </View>

                    {/* Container do Avatar com borda dourada */}
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
                            style={styles.avatarImage}
                        />
                        {/* Badge de Nível */}
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelBadgeText}>20</Text>
                        </View>
                    </View>

                    {/* Nome e Cargo */}
                    <Text style={styles.userName}>Caleb Jensen</Text>
                    <Text style={styles.userRole}>Product Analyst</Text>
                </View>

                {/* Card de Estatísticas */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>173</Text>
                        <Text style={styles.statLabel}>Seguindo</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>994</Text>
                        <Text style={styles.statLabel}>Produtos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>213</Text>
                        <Text style={styles.statLabel}>Seguidores</Text>
                    </View>
                </View>

                {/* Seção de Progresso do Nível */}
                <View style={styles.levelSection}>
                    <View style={styles.levelInfoRow}>
                        <Text style={styles.levelText}>Levl. 20</Text>
                        <Text style={styles.levelProgressNumber}>268/320</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${(268 / 320) * 100}%` }]} />
                    </View>
                </View>

                {/* Seção de Conquistas e Contribuições */}
                <View style={styles.achievementsSection}>
                    <Text style={styles.sectionTitle}>Minhas Conquistas</Text>

                    <View style={styles.contributionsCard}>
                        <Text style={styles.contributionsTitle}>Histórico de contribuições</Text>
                        <Text style={styles.contributionsSubtitle}>Últimos 75 dias</Text>

                        {/* Grade estilo GitHub */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
                            <View style={styles.contributionGrid}>
                                {contributionWeeks.map((week, weekIndex) => (
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

            </ScrollView>

            {/* Footer com a aba profile ativa */}
            <Footer activeTab="profile" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flexGrow: 1,
        paddingTop: 80, // Ajustado para integrar com o fundo do banner
        paddingBottom: 110,
    },

    // Cabeçalho do Perfil e Banner
    profileHeaderContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    jungleBanner: {
        width: "100%",
        height: 150,
        backgroundColor: "#2D4A36", // Tom verde escuro floresta do mockup
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
        marginTop: 80, // Faz o avatar sobrepor o banner
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
        borderColor: COLORS.amber, // Borda dourada/amarela
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

    // Card de Estatísticas
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

    // Barra de Progresso de Nível
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

    // Seção de Conquistas e Histórico
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
});