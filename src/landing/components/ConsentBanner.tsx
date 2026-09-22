import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface ConsentBannerProps {
    theme: SemanticTheme;
    onOpenPolicies: (tab?: "terms" | "privacy" | "guidelines" | "cookies") => void;
}

const STORAGE_KEY = "@presco:landing_consent";

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
    theme,
    onOpenPolicies,
}) => {
    const [accepted, setAccepted] = useState(true); // default true to avoid flash
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const stored = window.localStorage.getItem(STORAGE_KEY);
                if (!stored) {
                    setAccepted(false);
                }
            }
        } catch {
            setAccepted(false);
        }
    }, []);

    const handleAccept = () => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, "true");
            }
        } catch {}
        setAccepted(true);
    };

    if (accepted) return null;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.accent + "40",
                    shadowColor: "#000",
                },
                isDesktop && styles.containerDesktop,
            ]}
        >
            <View style={styles.textColumn}>
                <View style={styles.badgeRow}>
                    <Text style={[styles.badgeText, { color: theme.accent }]}>
                        🛡️ PRIVACIDADE & ARMAZENAMENTO LOCAL (LGPD)
                    </Text>
                </View>
                <Text style={[styles.message, { color: theme.text.primary }]}>
                    Utilizamos armazenamento local estritamente essencial para guardar sua sessão segura e
                    suas preferências de tema visual. Sem venda de dados ou rastreadores invasivos de terceiros.
                </Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.learnBtn, { borderColor: theme.surface.border }]}
                    onPress={() => onOpenPolicies("privacy")}
                >
                    <Text style={[styles.learnBtnText, { color: theme.text.secondary }]}>
                        Ver Políticas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: theme.accent }]}
                    onPress={handleAccept}
                >
                    <Text style={styles.acceptBtnText}>Aceitar & Continuar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        zIndex: 90,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
        flexDirection: "column",
        gap: 16,
    },
    containerDesktop: {
        left: 32,
        right: 32,
        maxWidth: 1100,
        marginHorizontal: "auto",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    textColumn: {
        flex: 1,
        gap: 4,
    },
    badgeRow: {
        marginBottom: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    learnBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    learnBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
    acceptBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 10,
    },
    acceptBtnText: {
        color: "#030712",
        fontSize: 12,
        fontWeight: "800",
    },
});
