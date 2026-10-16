import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
} from "react-native";
import { SemanticTheme } from "../theme";

interface HowItWorksSectionProps {
    theme: SemanticTheme;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ theme }) => {
    const [windowWidth, setWindowWidth] = useState(Dimensions.get("window").width);

    useEffect(() => {
        const onChange = ({ window }: { window: { width: number } }) => {
            setWindowWidth(window.width);
        };
        const sub = Dimensions.addEventListener("change", onChange);
        return () => {
            // @ts-ignore
            if (sub?.remove) sub.remove();
        };
    }, []);

    const isDesktop = windowWidth >= 860;
    const isMobile = windowWidth < 480;

    const steps = [
        {
            stepNumber: "01",
            title: "Descubra no Radar 15km",
            desc: "Abra o app e consulte supermercados, atacados e feiras na sua região. O Presco mapeia as menores cotações registradas pela comunidade.",
            tag: "GEOPROCESSAMENTO POSTGIS",
            image: require("../assets/prints/print-home.jpg"),
        },
        {
            stepNumber: "02",
            title: "Aponte na Gôndola",
            desc: "Escaneie o código de barras EAN-13 direto pela câmera. O Presco valida o histórico e premia você com XP no ranking comunitário.",
            tag: "SCANNER ÓPTICO INSTANTÂNEO",
            image: require("../assets/prints/print-scanner.jpg"),
        },
        {
            stepNumber: "03",
            title: "Economize no Caixa & Gasolina",
            desc: "O motor matemático calcula a rota ideal e só sugere dividir a lista se o desconto total cobrir com folga o combustível gasto.",
            tag: "OTIMIZADOR MULTILOJAS",
            image: require("../assets/prints/print-cart.png"),
        },
    ];

    return (
        <View
            nativeID="how-it-works"
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface.background,
                },
            ]}
        >
            <View style={styles.inner}>
                {/* Header */}
                <View style={styles.headerArea}>
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
                            JORNADA DO CONSUMIDOR INTELIGENTE
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 26,
                                lineHeight: isDesktop ? 44 : 32,
                            },
                        ]}
                    >
                        Como o Presco funciona no dia a dia
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        Três passos simples que devolvem o controle do seu orçamento familiar e
                        combatem preços inflacionados no carrinho de supermercado.
                    </Text>
                </View>

                {/* 3 Step Cards */}
                <View style={[styles.stepsRow, isDesktop && styles.stepsRowDesktop]}>
                    {steps.map((s, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.stepCard,
                                isDesktop && styles.stepCardDesktop,
                                isMobile && styles.stepCardMobile,
                                {
                                    backgroundColor: theme.surface.card,
                                    borderColor: theme.surface.border,
                                },
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View
                                    style={[
                                        styles.stepNumCircle,
                                        { backgroundColor: theme.accent },
                                    ]}
                                >
                                    <Text style={styles.stepNumText}>{s.stepNumber}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.tagPill,
                                        { backgroundColor: theme.accent + "18" },
                                    ]}
                                >
                                    <Text style={[styles.tagPillText, { color: theme.accent }]}>
                                        {s.tag}
                                    </Text>
                                </View>
                            </View>

                            <Text
                                style={[
                                    styles.stepTitle,
                                    { color: theme.text.primary },
                                ]}
                            >
                                {s.title}
                            </Text>

                            <Text
                                style={[
                                    styles.stepDesc,
                                    { color: theme.text.secondary },
                                ]}
                            >
                                {s.desc}
                            </Text>

                            <View
                                style={[
                                    styles.stepImageWrapper,
                                    isMobile && styles.stepImageWrapperMobile,
                                    {
                                        borderColor: theme.surface.borderSubtle,
                                        backgroundColor: "#05070A",
                                    },
                                ]}
                            >
                                <Image
                                    source={s.image}
                                    style={styles.stepImage}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 56,
    },
    inner: {
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: "center",
        maxWidth: 720,
        marginHorizontal: "auto",
        marginBottom: 44,
    },
    badge: {
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
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 14,
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 23,
        textAlign: "center",
    },
    stepsRow: {
        flexDirection: "column",
        gap: 20,
    },
    stepsRowDesktop: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    stepCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        width: "100%",
        position: "relative",
    },
    stepCardDesktop: {
        width: "31.5%",
    },
    stepCardMobile: {
        padding: 18,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    stepNumCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    stepNumText: {
        color: "#000000",
        fontSize: 14,
        fontWeight: "900",
    },
    tagPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagPillText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    stepTitle: {
        fontSize: 19,
        fontWeight: "800",
        marginBottom: 8,
        letterSpacing: -0.4,
    },
    stepDesc: {
        fontSize: 13,
        lineHeight: 21,
    },
    stepImageWrapper: {
        width: "100%",
        height: 240,
        borderRadius: 18,
        overflow: "hidden",
        marginTop: 18,
        borderWidth: 1,
    },
    stepImageWrapperMobile: {
        height: 200,
    },
    stepImage: {
        width: "100%",
        height: "100%",
    },
});

