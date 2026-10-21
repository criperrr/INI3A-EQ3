import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { SemanticTheme } from "../theme";
import { SvgChevronDownIcon } from "./SvgIcons";

interface FaqSectionProps {
    theme: SemanticTheme;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ theme }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(0); // First open by default
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const faqs = [
        {
            q: "O Presco é totalmente gratuito?",
            a: "Sim, 100% gratuito e de código aberto! Não há assinaturas, paywalls, nem compras obrigatórias. Toda a infraestrutura foi desenvolvida para empoderar consumidores e democratizar a economia no comércio local.",
        },
        {
            q: "Como o Otimizador calcula se vale a pena ir a dois mercados?",
            a: "O motor avalia o trade-off financeiro estrito: a economia total de preço (ΔP) precisa superar a soma do custo real do combustível consumido (ΔC) e o limiar de conveniência. Você pode personalizar a autonomia do seu carro (km/L) e o valor da gasolina para obter um resultado exato.",
        },
        {
            q: "O que acontece se alguém cadastrar um preço falso ou desatualizado?",
            a: "A comunidade atua como auditora em tempo real. Cada preço possui botões de confirmação e contestação. Ocorrências com saldo negativo são suspensas de imediato, e o usuário que cadastrou perde pontos de reputação.",
        },
        {
            q: "O aplicativo funciona mesmo se eu estiver sem internet no supermercado?",
            a: "Sim! O Presco possui arquitetura Offline-First. Seus itens salvos, simulações locais e produtos escaneados permanecem disponíveis no dispositivo. Assim que a conexão for restabelecida, os dados se sincronizam automaticamente.",
        },
        {
            q: "Como meus dados de GPS e Câmera são protegidos sob a LGPD?",
            a: "O GPS é acionado exclusivamente sob demanda para calcular o raio de até 15km e rotas, sem guardar histórico de trajetos. A câmera é usada puramente para a leitura óptica do código de barras EAN-13, sem envio de vídeos ou fotos para a nuvem.",
        },
        {
            q: "Como instalo o aplicativo APK no meu celular Android?",
            a: "É simples, direto e seguro! Clique no botão 'Baixar APK Gratuito' ou aponte a câmera do celular para o QR Code da página. Ao abrir o arquivo baixado, seu navegador pode exibir um aviso de segurança sobre aplicativos de fora da loja. Basta autorizar a instalação para concluir em menos de 1 minuto.",
        },
        {
            q: "Existe versão para iPhone (iOS) ou acesso pelo navegador?",
            a: "Atualmente, a versão estável está disponível para download nativo no Android (8.0+). A versão para iOS está em desenvolvimento ativo. Você pode acompanhar todas as novidades e releases pelo repositório oficial no GitHub.",
        },
        {
            q: "Como funciona o sistema comunitário de XP e recompensas?",
            a: "Cada colaboração gera pontos de experiência: registrar um novo produto na base vale +25 XP, e atualizar ou confirmar o preço na gôndola vale +15 XP. Ao subir de nível, você conquista distintivos de reputação (como 'Detetive de Ofertas') e desbloqueia temas e cosméticos visuais no seu perfil.",
        },
    ];

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <View
            nativeID="faq"
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
                                borderColor: theme.accent + "80",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: theme.accent, fontWeight: "900" }]}>
                            FAQ • DÚVIDAS FREQUENTES
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text.primary,
                                fontSize: isDesktop ? 36 : 28,
                                lineHeight: isDesktop ? 44 : 34,
                            },
                        ]}
                    >
                        Perguntas Frequentes sobre{" "}
                        <Text style={{ color: theme.accent }}>o Presco</Text>
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        Tudo o que você precisa saber sobre o funcionamento, segurança e economia no Presco.
                    </Text>
                </View>

                {/* Accordion list */}
                <View style={styles.faqList}>
                    {faqs.map((faq, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.faqCard,
                                    {
                                        backgroundColor: theme.surface.card,
                                        borderColor: isOpen ? theme.accent : theme.surface.border,
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.faqQuestionRow}
                                    activeOpacity={0.8}
                                    onPress={() => toggle(idx)}
                                >
                                    <Text
                                        style={[
                                            styles.faqQuestion,
                                            { color: theme.text.primary },
                                        ]}
                                    >
                                        {faq.q}
                                    </Text>
                                    <View
                                        style={[
                                            styles.chevronWrap,
                                            isOpen && styles.chevronWrapOpen,
                                        ]}
                                    >
                                        <SvgChevronDownIcon
                                            size={18}
                                            color={isOpen ? theme.accent : theme.text.secondary}
                                            style={isOpen ? { transform: "rotate(180deg)" } : undefined}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {isOpen && (
                                    <View
                                        style={[
                                            styles.faqAnswerBox,
                                            { borderTopColor: theme.surface.borderSubtle },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.faqAnswer,
                                                { color: theme.text.secondary },
                                            ]}
                                        >
                                            {faq.a}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 72,
    },
    inner: {
        maxWidth: 860,
        marginHorizontal: "auto",
        width: "100%",
        paddingHorizontal: 24,
    },
    headerArea: {
        alignItems: "center",
        textAlign: "center",
        marginBottom: 48,
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
        marginBottom: 16,
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
        maxWidth: 640,
        marginHorizontal: "auto",
    },
    faqList: {
        flexDirection: "column",
        gap: 16,
    },
    faqCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: "hidden",
    },
    faqQuestionRow: {
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    faqQuestion: {
        fontSize: 17,
        fontWeight: "800",
        flex: 1,
        paddingRight: 16,
        letterSpacing: -0.2,
    },
    chevronWrap: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    chevronWrapOpen: {
        transform: [{ rotate: "180deg" }],
    },
    faqAnswerBox: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    faqAnswer: {
        fontSize: 15,
        lineHeight: 23,
    },
});
