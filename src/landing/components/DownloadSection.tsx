import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import {
    SvgDownloadIcon,
    SvgGithubIcon,
    SvgBoxIcon,
    SvgLockIcon,
    SvgShieldIcon,
    SvgOfficialReleaseQrCode,
} from "./SvgIcons";

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
    const { width } = useWindowDimensions();
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
                <View
                    style={[
                        styles.card,
                        isDesktop && styles.cardDesktop,
                        {
                            backgroundColor: theme.surface.card,
                            borderColor: theme.accent + "50",
                        },
                    ]}
                >
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
                                {width < 440 ? "DISTRIBUIÇÃO OFICIAL" : "DISTRIBUIÇÃO OFICIAL • STANDALONE APK"}
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
                                style={[styles.downloadBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
                                activeOpacity={0.85}
                                onPress={onDownload}
                            >
                                <View style={styles.btnContentRow}>
                                    <SvgDownloadIcon size={18} color={theme.text.inverse} />
                                    <Text style={[styles.downloadBtnText, { color: theme.text.inverse }]}>
                                        Baixar APK Gratuito (v1.4.5)
                                    </Text>
                                </View>
                                <Text style={[styles.downloadBtnSub, { color: theme.isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.7)" }]}>
                                    Android 8.0+ • Release Oficial Standalone
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.repoBtn, { borderColor: theme.surface.border, backgroundColor: theme.surface.card }]}
                                activeOpacity={0.8}
                                onPress={onOpenRepo}
                            >
                                <View style={styles.btnContentRow}>
                                    <SvgGithubIcon size={18} color={theme.text.primary} />
                                    <Text style={[styles.repoBtnText, { color: theme.text.primary }]}>
                                        Código no GitHub
                                    </Text>
                                </View>
                                <Text style={[styles.repoBtnSub, { color: theme.text.secondary }]}>
                                    Repositório Open Source
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Integrity & Tech specs */}
                        <View style={styles.specsRow}>
                            <View style={styles.specItemWrap}>
                                <SvgBoxIcon size={13} color={theme.text.secondary} />
                                <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                    Universal APK (arm64, v7a)
                                </Text>
                            </View>
                            <Text style={[styles.specDot, { color: theme.text.secondary }]}>•</Text>
                            <View style={styles.specItemWrap}>
                                <SvgLockIcon size={13} color={theme.text.secondary} />
                                <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                    Assinado via CI/CD
                                </Text>
                            </View>
                            <Text style={[styles.specDot, { color: theme.text.secondary }]}>•</Text>
                            <View style={styles.specItemWrap}>
                                <SvgShieldIcon size={13} color={theme.text.secondary} />
                                <Text style={[styles.specItem, { color: theme.text.secondary }]}>
                                    Zero Anúncios & Sem Cartão
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: Real Valid SVG QR Code */}
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

                        {/* 100% Real, Valid, Scannable SVG QR Code (High-contrast ISO/IEC 18004) */}
                        <View
                            style={[
                                styles.qrMatrixWrapper,
                                {
                                    backgroundColor: "#FFFFFF",
                                    borderColor: theme.accent,
                                    borderWidth: 2,
                                    shadowColor: theme.accent,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 12,
                                },
                            ]}
                        >
                            <SvgOfficialReleaseQrCode
                                size={170}
                                color="#000000"
                                bgColor="#FFFFFF"
                            />
                        </View>

                        <Text style={[styles.qrFooterText, { color: theme.text.secondary }]}>
                            Aponta para github.com/criperrr/.../releases
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
        padding: 32,
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
        paddingVertical: 4,
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
        marginBottom: 12,
        letterSpacing: -0.6,
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
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        minWidth: 220,
    },
    btnContentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    downloadBtnText: {
        color: "#000000",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: -0.2,
    },
    downloadBtnSub: {
        color: "#333333",
        fontSize: 11,
        fontWeight: "600",
        marginTop: 3,
    },
    repoBtn: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        minWidth: 190,
    },
    repoBtnText: {
        fontSize: 15,
        fontWeight: "700",
    },
    repoBtnSub: {
        fontSize: 11,
        marginTop: 3,
    },
    specsRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    specItemWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    specItem: {
        fontSize: 12,
        fontWeight: "500",
    },
    specDot: {
        fontSize: 12,
    },
    qrColumn: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        alignItems: "center",
        width: 250,
    },
    qrHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    qrTitle: {
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 4,
    },
    qrSub: {
        fontSize: 11,
        textAlign: "center",
    },
    qrMatrixWrapper: {
        padding: 12,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    qrFooterText: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: 0.2,
    },
});
