import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
} from "react-native";
import { SemanticTheme } from "../theme";

export type PolicyTab = "terms" | "privacy" | "guidelines" | "cookies";

interface PolicyModalProps {
    visible: boolean;
    initialTab?: PolicyTab;
    theme: SemanticTheme;
    onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
    visible,
    initialTab = "privacy",
    theme,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);
    const { width, height } = Dimensions.get("window");
    const isDesktop = width >= 768;

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            />

            <View
                style={[
                    styles.modalContainer,
                    {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.surface.border,
                        maxHeight: height * 0.88,
                    },
                    isDesktop && styles.modalDesktop,
                ]}
            >
                {/* Modal Header */}
                <View
                    style={[
                        styles.modalHeader,
                        { borderBottomColor: theme.surface.borderSubtle },
                    ]}
                >
                    <View>
                        <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                            Central de Políticas & Proteção
                        </Text>
                        <Text
                            style={[
                                styles.modalSubTitle,
                                { color: theme.text.secondary },
                            ]}
                        >
                            Governança oficial do ecossistema Presco • Atualizado em Setembro de 2026
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.closeBtn,
                            {
                                backgroundColor: theme.isDark ? "#1F2937" : "#E5E7EB",
                            },
                        ]}
                        onPress={onClose}
                        accessibilityLabel="Fechar janela"
                    >
                        <Text style={[styles.closeBtnText, { color: theme.text.primary }]}>
                            ✕
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs Row */}
                <View
                    style={[
                        styles.tabsRow,
                        {
                            backgroundColor: theme.isDark ? "#111827" : "#F3F4F6",
                            borderBottomColor: theme.surface.borderSubtle,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === "terms" && [
                                styles.tabItemActive,
                                { borderBottomColor: theme.accent },
                            ],
                        ]}
                        onPress={() => setActiveTab("terms")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color:
                                        activeTab === "terms"
                                            ? theme.accent
                                            : theme.text.secondary,
                                },
                            ]}
                        >
                            Termos de Uso
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === "privacy" && [
                                styles.tabItemActive,
                                { borderBottomColor: theme.accent },
                            ],
                        ]}
                        onPress={() => setActiveTab("privacy")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color:
                                        activeTab === "privacy"
                                            ? theme.accent
                                            : theme.text.secondary,
                                },
                            ]}
                        >
                            Privacidade & LGPD
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === "guidelines" && [
                                styles.tabItemActive,
                                { borderBottomColor: theme.accent },
                            ],
                        ]}
                        onPress={() => setActiveTab("guidelines")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color:
                                        activeTab === "guidelines"
                                            ? theme.accent
                                            : theme.text.secondary,
                                },
                            ]}
                        >
                            Moderação & Quórum
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === "cookies" && [
                                styles.tabItemActive,
                                { borderBottomColor: theme.accent },
                            ],
                        ]}
                        onPress={() => setActiveTab("cookies")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color:
                                        activeTab === "cookies"
                                            ? theme.accent
                                            : theme.text.secondary,
                                },
                            ]}
                        >
                            Armazenamento Local
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content Scroll View */}
                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* TAB 1: TERMOS DE USO */}
                    {activeTab === "terms" && (
                        <View style={styles.policyArticle}>
                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                1. Natureza do Serviço
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                O Presco é uma plataforma colaborativa orientada à transparência do comércio varejista.
                                Nossa missão é conectar cidadãos para compartilhamento fidedigno de preços praticados em gôndolas
                                físicas e calcular rotas econômicas inteligentes. O serviço é disponibilizado de forma 100% gratuita
                                e mantido de maneira descentralizada pela comunidade.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                2. Responsabilidade sobre Preços e Ofertas
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                Os valores registrados no Presco refletem informações cadastradas e auditadas pelos próprios usuários.
                                Embora implementemos sistemas matemáticos de validação e quórum anti-fraude, o Presco não é vendedor,
                                revendedor ou representante legal de nenhuma rede de supermercados. A fixação de preços e a disponibilidade
                                de estoques cabem exclusivamente aos estabelecimentos comerciais correspondentes.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                3. Contas e Segurança
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                Para registrar preços ou votar em ocorrências, o usuário compromete-se a fornecer um endereço de e-mail válido
                                e a verificar sua identidade via 2FA (código OTP). O usuário é o único responsável pela guarda de suas credenciais
                                e por todas as ações praticadas em sua conta.
                            </Text>
                        </View>
                    )}

                    {/* TAB 2: PRIVACIDADE & LGPD */}
                    {activeTab === "privacy" && (
                        <View style={styles.policyArticle}>
                            <View
                                style={[
                                    styles.lgpdBadgeBox,
                                    {
                                        backgroundColor: theme.accent + "18",
                                        borderColor: theme.accent + "50",
                                    },
                                ]}
                            >
                                <Text style={[styles.lgpdBadgeTitle, { color: theme.accent }]}>
                                    🛡️ COMPROMISSO RIGOROSO COM A LEI 13.709/2018 (LGPD)
                                </Text>
                                <Text style={[styles.lgpdBadgeDesc, { color: theme.text.primary }]}>
                                    Seus dados pertencem a você. O Presco adota os princípios de Minimização,
                                    Finalidade Legítima e Segurança Cibernética por Padrão (Privacy by Default).
                                </Text>
                            </View>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                1. Quais Dados Coletamos e Por Quê
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                • <Text style={styles.strong}>Identificação e Acesso:</Text> Nome público, endereço de e-mail e hash criptográfico de senha (armazenado com algoritmo bcrypt fator de custo 10). O e-mail é utilizado estritamente para autenticação e envio do código de segurança 2FA via Resend.
                                {"\n"}• <Text style={styles.strong}>Geolocalização (GPS):</Text> Utilizada sob demanda para buscar supermercados no raio de até 15km e calcular o otimizador de rota veicular. <Text style={styles.strong}>Não armazenamos histórico de deslocamentos nem rastreamos o usuário em segundo plano.</Text>
                                {"\n"}• <Text style={styles.strong}>Câmera:</Text> Acessada exclusivamente no leitor de código de barras EAN-13 para leitura instantânea de gôndola. Nenhuma imagem da sua câmera é transmitida ou gravada em nossos servidores.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                2. Não Compartilhamento com Terceiros
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                O Presco <Text style={styles.strong}>NÃO vende, não comercializa e não compartilha</Text> dados pessoais de usuários com anunciantes, corretores de dados (data brokers) ou empresas de perfilamento comportamental.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                3. Direitos do Titular (Artigo 18 da LGPD)
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                A qualquer momento, através da aba Configurações no aplicativo móvel, você pode:
                                {"\n"}• Visualizar e exportar todos os dados vinculados à sua conta.
                                {"\n"}• Retificar informações cadastrais ou alterar sua senha.
                                {"\n"}• <Text style={styles.strong}>Excluir definitivamente sua conta:</Text> a exclusão purga instantaneamente todos os seus dados pessoais do banco de dados e encerra todas as sessões ativas no Redis.
                            </Text>
                        </View>
                    )}

                    {/* TAB 3: DIRETRIZES DA COMUNIDADE & MODERAÇÃO */}
                    {activeTab === "guidelines" && (
                        <View style={styles.policyArticle}>
                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                1. O Código de Integridade da Gôndola
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                O Presco é construído sobre a confiança mútua. Todo usuário concorda em cadastrar
                                somente preços reais que presenciou fisicamente no supermercado, na data correspondente,
                                sem arredondamentos arbitrários ou distorções.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                2. Sistema de Votação e Quórum Anti-Fraude
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                Cada preço possui um sistema aberto de confirmação (upvotes e downvotes).
                                Quando múltiplos usuários sinalizam que um preço está incorreto ou desatualizado,
                                a ocorrência é automaticamente rebaixada e pode ser suspensa preventivamente
                                para não prejudicar outros consumidores da região.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                3. Sanções e Bloqueio de Contas
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                O cadastro proposital de preços fraudulentos, spam automatizado ou tentativas de manipulação
                                de mercado constituem violação grave. Usuários infratores têm sua autoridade revogada,
                                pontuação de XP resetada e o e-mail inserido em lista negra de segurança.
                            </Text>
                        </View>
                    )}

                    {/* TAB 4: COOKIES & ARMAZENAMENTO LOCAL */}
                    {activeTab === "cookies" && (
                        <View style={styles.policyArticle}>
                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                1. Armazenamento Estritamente Necessário
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                Utilizamos o armazenamento local seguro do seu dispositivo (AsyncStorage no celular e localStorage no navegador)
                                única e exclusivamente para as seguintes finalidades operacionais essenciais:
                                {"\n"}• <Text style={styles.strong}>Sessão Autenticada:</Text> Chaves criptografadas de Access Token JWT (validade de 15 minutos) e Refresh Token (validade de 7 dias com rotação atômica no Redis).
                                {"\n"}• <Text style={styles.strong}>Preferências Visuais:</Text> Armazenamento do tema selecionado (Dark, AMOLED ou Light).
                                {"\n"}• <Text style={styles.strong}>Consentimento:</Text> Registro de que você tomou ciência das políticas desta plataforma.
                            </Text>

                            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
                                2. Ausência de Rastreamento Publicitário
                            </Text>
                            <Text style={[styles.paragraph, { color: theme.text.secondary }]}>
                                Não utilizamos cookies espiões, pixels de rastreamento do Facebook ou Google Adsense,
                                nem ferramentas de gravação invasiva de tela.
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Footer with Action */}
                <View
                    style={[
                        styles.modalFooter,
                        { borderTopColor: theme.surface.borderSubtle },
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
                        onPress={onClose}
                    >
                        <Text style={styles.confirmBtnText}>Entendi e Concordo</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        // @ts-ignore
        backdropFilter: "blur(8px)",
    },
    modalContainer: {
        width: "100%",
        maxWidth: 780,
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        zIndex: 101,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
        elevation: 24,
    },
    modalDesktop: {
        width: "90%",
    },
    modalHeader: {
        paddingHorizontal: 24,
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.4,
    },
    modalSubTitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    closeBtnText: {
        fontSize: 14,
        fontWeight: "700",
    },
    tabsRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        paddingHorizontal: 16,
    },
    tabItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabItemActive: {},
    tabText: {
        fontSize: 13,
        fontWeight: "700",
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    policyArticle: {
        gap: 16,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: "800",
        marginTop: 10,
        letterSpacing: -0.2,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
    },
    strong: {
        fontWeight: "700",
    },
    lgpdBadgeBox: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    lgpdBadgeTitle: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    lgpdBadgeDesc: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "600",
    },
    modalFooter: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        alignItems: "flex-end",
    },
    confirmBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    confirmBtnText: {
        color: "#030712",
        fontSize: 14,
        fontWeight: "800",
    },
});
