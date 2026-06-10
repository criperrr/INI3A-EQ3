import React from "react";
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    background: "#F8FAFC",
};

export default function AboutUs() {
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Botão de Voltar Customizado (opcional, caso não use o header nativo) */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.darkBlue} />
                <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>

            {/* Cabeçalho da Tela */}
            <View style={styles.headerSection}>
                <View style={styles.logoPlaceholder}>
                    <Ionicons name="logo-foursquare" size={48} color={COLORS.vibrantBlue} />
                </View>
                <Text style={styles.title}>Sobre Nós</Text>
                <Text style={styles.subtitle}>Conheça a nossa história e o nosso propósito.</Text>
            </View>

            {/* Seções de Conteúdo */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Nossa Missão</Text>
                <Text style={styles.cardBody}>
                    Levar produtos frescos, orgânicos e artesanais de alta qualidade direto para a sua mesa,
                    fortalecendo o comércio local e incentivando uma alimentação mais saudável e consciente.
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Nossos Valores</Text>
                <View style={styles.valueItem}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.vibrantBlue} />
                    <Text style={styles.valueText}>**Qualidade Garantida:** Produtos rigorosamente selecionados.</Text>
                </View>
                <View style={styles.valueItem}>
                    <Ionicons name="leaf-outline" size={20} color={COLORS.vibrantBlue} />
                    <Text style={styles.valueText}>**Sustentabilidade:** Apoio ao pequeno produtor e práticas eco-friendly.</Text>
                </View>
                <View style={styles.valueItem}>
                    <Ionicons name="people-outline" size={20} color={COLORS.vibrantBlue} />
                    <Text style={styles.valueText}>**Transparência:** Respeito e clareza com nossos clientes.</Text>
                </View>
            </View>

            {/* Rodapé / Versão */}
            <Text style={styles.footerText}>Versão 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: COLORS.background,
        padding: 20,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        gap: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.darkBlue,
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 32,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#EAEAEA",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        marginBottom: 10,
    },
    cardBody: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
    valueItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
    },
    valueText: {
        fontSize: 14,
        color: "#475569",
        flex: 1,
        lineHeight: 20,
    },
    footerText: {
        textAlign: "center",
        color: "#94A3B8",
        fontSize: 12,
        marginTop: 20,
        marginBottom: 10,
    },
});