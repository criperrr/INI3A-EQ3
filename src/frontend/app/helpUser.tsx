import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";

const FAQ_DATA = [
  {
    id: "1",
    question: "Como faço para realizar um pedido?",
    answer:
      "Basta navegar pela lista de produtos ou mercados, adicionar os itens desejados ao carrinho e seguir para a tela de finalização de compra.",
  },
  {
    id: "2",
    question: "Quais são as formas de pagamento aceitas?",
    answer:
      "Aceitamos cartões de crédito, débito, Pix e pagamento em dinheiro na hora da entrega.",
  },
  {
    id: "3",
    question: "Como posso acompanhar minha entrega?",
    answer:
      "Acesse a aba 'Meus Pedidos' no perfil para ver o status em tempo real do seu pedido.",
  },
  {
    id: "4",
    question: "O que fazer se faltar um item no pedido?",
    answer:
      "Entre em contato conosco através do suporte abaixo informando o número do pedido, e faremos o reembolso ou o reenvio do item.",
  },
];

const CONTACT_OPTIONS = [
  {
    id: "whatsapp",
    title: "Atendimento via WhatsApp",
    subtitle: "Seg a Sex, das 08h às 18h",
    icon: "logo-whatsapp",
    color: "#25D366",
    action: () => Linking.openURL("https://wa.me/5511999999999"),
  },
  {
    id: "email",
    title: "Enviar E-mail",
    subtitle: "presco.oficial@gmail.com",
    icon: "mail-outline",
    color: "#007AFF",
    action: () => Linking.openURL("mailto:presco.oficial@gmail.com"),
  },
];

export default function HelpUser() {
  const router = useRouter();
  const { themeStyles, isDark, accent } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, themeStyles.bg]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack && router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={[styles.backButton, themeStyles.card, themeStyles.border]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "#F0E6D3" : "#1A2E1A"}
          />
        </TouchableOpacity>
        <Text style={[styles.title, themeStyles.text]}>Central de Ajuda</Text>

        {/* Removido o comentário inline fora da formatação ideal que pode gerar nós de texto */}
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          Perguntas Frequentes
        </Text>
        <View
          style={[styles.faqContainer, themeStyles.card, themeStyles.border]}
        >
          {FAQ_DATA.map((item, index) => {
            const isExpanded = expandedFaq === item.id;
            const isLast = index === FAQ_DATA.length - 1;

            return (
              <View key={item.id} style={!isLast && styles.faqSeparator}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleFaq(item.id)}
                >
                  <Text style={[styles.faqQuestion, themeStyles.text]}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={accent || (isDark ? "#F0E6D3" : "#1A2E1A")}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={[styles.faqAnswer, themeStyles.subText]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, themeStyles.text]}>
          Ainda precisa de ajuda?
        </Text>
        <View style={styles.contactContainer}>
          {CONTACT_OPTIONS.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={[styles.contactCard, themeStyles.card, themeStyles.border]}
              activeOpacity={0.8}
              onPress={contact.action}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: `${contact.color}20` },
                ]}
              >
                <Ionicons
                  name={contact.icon as any}
                  size={28}
                  color={contact.color}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactTitle, themeStyles.text]}>
                  {contact.title}
                </Text>
                <Text style={[styles.contactSubtitle, themeStyles.subText]}>
                  {contact.subtitle}
                </Text>
              </View>
              <Ionicons
                name="open-outline"
                size={20}
                color={themeStyles.subText.color}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingVertical: 16, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  faqContainer: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  faqSeparator: { borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: { fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 16 },
  faqBody: { paddingHorizontal: 16, paddingBottom: 16 },
  faqAnswer: { fontSize: 14, lineHeight: 20 },
  contactContainer: { gap: 12 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  contactSubtitle: { fontSize: 13 },
});
