import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

interface DownloadSectionProps {
    theme: SemanticTheme;
    onDownload: () => void;
    onOpenRepo: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
    theme,
    onDownload,
    onOpenRepo,
}) => {
    const { width } = Dimensions.get("window");
    const isDesktop = width >= 860;

    return (
        <View
            nativeID="download"
            style={[
                styles.container,
                {
                    backgroundColor: theme.isDark ? "#0A0D12" : "#F0F4EC",
                    borderTopColor: theme.surface.borderSubtle,
                    borderBottomColor: theme.surface.borderSubtle,
                },
            ]}
        >
            <View style={styles.inner}>
                <View style={[styles.card, isDesktop && styles.cardDesktop, { backgroundColor: theme.surface.card, borderColor: theme.accent + "50" }]}>
                    {/* Left Column: Download Info & CTA */}
                    <View style={styles.infoColumn}>
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: theme.surface.badgeBg,
                                    borderColor: theme.accent + "50",
                                },
                            ]}
                        >
                            <Text style={[styles.badgeText, { color: theme.accent }]}>
                                DISTRIBUIÇÃO OFICIAL • STANDALONE APK
                            </Text>
                        </View>

                        <Text style={[styles.title, { color: theme.text.primary }]}>
                            Baixe o Presco para Android
                        </Text>

                        <Text style={[styles.desc, { color: theme.text.secondary }]}>
                            Instale diretamente no seu aparelho Android sem intermediários.
                            Atualizações seguras, zero anúncios e total independência.
                        </Text>

                        {/* Buttons */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.downloadBtn, { backgroundColor: theme.accent }]}
                                activeOpacity={0.85}
                                onPress={onDownload}
                            >
                                <Text style={styles.downloadBtnText}>
                                    ⬇️ Baixar APK (v1.3.3)
                                </Text>
                                <Text style={styles.downloadBtnSub}>
                                    Android 8.0+ • ~58 MB
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.repoBtn, { borderColor: theme.surface.border }]}
                                activeOpacity={0.8}
                                onPress={onOpenRepo}
                            >
                                <Text style={[styles.repoBtnText, { color: theme.text.primary }]}>
                                    ⭐ Código no GitHub
                                </Text>
                                <Text style={[styles.repoBtnSub, { color: theme.text.secondary }]}>
                                    Repositório Open Source
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Integrity & Tech specs */}
                        <View style={styles.specsRow}>
                            <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                📦 Universal APK (arm64, v7a)
                            </Text>
                            <Text style={[styles.specDot, { color: theme.text.secondary }]}>•</Text>
                            <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                🔒 Assinado via CI/CD
                            </Text>
                            <Text style={[styles.specDot, { color: theme.text.secondary }]}>•</Text>
                            <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                🚀 Sem Custos
                            </Text>
                        </View>
                    </View>

                    {/* Right Column: QR Code Visual for Mobile Camera Scan */}
                    <View
                        style={[
                            styles.qrColumn,
                            {
                                backgroundColor: theme.isDark ? "#0D1117" : "#FFFFFF",
                                borderColor: theme.surface.border,
                            },
                        ]}
                    >
                        <View style={styles.qrHeader}>
                            <Text style={[styles.qrTitle, { color: theme.text.primary }]}>
                                Escaneie com a Câmera
                            </Text>
                            <Text style={[styles.qrSub, { color: theme.text.secondary }]}>
                                Para baixar direto no smartphone
                            </Text>
                        </View>

                        {/* Styled QR Code Matrix Simulation */}
                        <View style={styles.qrMatrixWrapper}>
                            <View style={styles.qrMatrix}>
                                <View style={[styles.qrCorner, styles.qrTL, { borderColor: theme.accent }]}>
                                    <View style={[styles.qrCornerInner, { backgroundColor: theme.accent }]} />
                                </View>
                                <View style={[styles.qrCorner, styles.qrTR, { borderColor: theme.accent }]}>
                                    <View style={[styles.qrCornerInner, { backgroundColor: theme.accent }]} />
                                </View>
                                <View style={[styles.qrCorner, styles.qrBL, { borderColor: theme.accent }]}>
                                    <View style={[styles.qrCornerInner, { backgroundColor: theme.accent }]} />
                                </View>
                                <View style={styles.qrGridPattern}>
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                    <View style={[styles.qrDot, { backgroundColor: theme.accent }]} />
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.qrFooterText, { color: theme.text.secondary }]}>
                            Aponta para github.com/.../releases
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 72,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    card: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 36,
        flexDirection: "column",
        gap: 36,
        alignItems: "center",
    },
    cardDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoColumn: {
        flex: 1,
        maxWidth: 620,
    },
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    title: {
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: -0.8,
        marginBottom: 14,
    },
    desc: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 28,
    },
    actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 24,
    },
    downloadBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        minWidth: 180,
    },
    downloadBtnText: {
        color: "#030712",
        fontSize: 15,
        fontWeight: "800",
        textAlign: "center",
    },
    downloadBtnSub: {
        color: "rgba(3, 7, 18, 0.7)",
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 2,
    },
    repoBtn: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        minWidth: 180,
    },
    repoBtnText: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
    repoBtnSub: {
        fontSize: 11,
        textAlign: "center",
        marginTop: 2,
    },
    specsRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    specItem: {
        fontSize: 12,
        fontWeight: "600",
    },
    specDot: {
        fontSize: 12,
    },
    qrColumn: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: "center",
        width: 260,
    },
    qrHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    qrTitle: {
        fontSize: 15,
        fontWeight: "800",
    },
    qrSub: {
        fontSize: 11,
        marginTop: 2,
    },
    qrMatrixWrapper: {
        width: 160,
        height: 160,
        backgroundColor: "#000000",
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    qrMatrix: {
        width: 136,
        height: 136,
        position: "relative",
    },
    qrCorner: {
        position: "absolute",
        width: 38,
        height: 38,
        borderWidth: 4,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    qrCornerInner: {
        width: 16,
        height: 16,
        borderRadius: 4,
    },
    qrTL: { top: 0, left: 0 },
    qrTR: { top: 0, right: 0 },
    qrBL: { bottom: 0, left: 0 },
    qrGridPattern: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 44,
        height: 44,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    qrDot: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    qrFooterText: {
        fontSize: 10,
        textAlign: "center",
        fontWeight: "600",
    },
});
