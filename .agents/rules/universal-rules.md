---
name: universal-rules
version: 1.0.0
priority: P0
trigger: always_on
---

# Universal Rules (TIER 0) - AG Kit

> Always-active rules that apply to every request, regardless of domain.

---

## 🌐 Language Handling

When user's prompt is NOT in English:

1. **Internally translate** for better comprehension
2. **Respond in user's language** - match their communication
3. **Code comments/variables** remain in English

---

## 🧹 Clean Code (Global Mandatory)

**ALL code MUST follow `@[skills/clean-code]` rules. No exceptions.**

- **Code**: Concise, direct, no over-engineering. Self-documenting.
- **Testing**: Mandatory. Pyramid (Unit > Int > E2E) + AAA Pattern.
- **Performance**: Measure first. Adhere to current Core Web Vitals standards.
- **Infra/Safety**: 5-Phase Deployment. Verify secrets security.

---

## 🚫 Axioma Fundamental de Erradicação de Emojis (No Emojis Policy)

**Proibição Absoluta de Emojis em Código, Interface e Workflows:**
- **Interface Gráfica (UI):** É terminantemente proibido utilizar emojis como ícones ou elementos visuais na UI. Qualquer representação visual/ícone DEVE utilizar bibliotecas vetoriais SVG (`@expo/vector-icons` como `Ionicons`, ou `lucide-react-native`).
- **Workflows e CI/CD:** É expressamente proibido usar emojis em logs, passos, nomes de steps ou saídas de pipelines de CI/CD do GitHub Actions. Utilize prefixos textuais claros como `[OK]`, `[INFO]`, `[ERRO]`, `[AVISO]`.
- **Backend e Logs:** Proibido o uso de emojis em logs de console, mensagens de erro, seeds de banco de dados ou documentação interna.
- **Única Exceção Permitida:** Mensagens externas destinadas a compartilhamento para fora do aplicativo (ex.: texto de lista de compras copiado para a área de transferência ou enviado via WhatsApp em `formatCartShareMessage`). Qualquer outro elemento visual interno deve ser estritamente textual ou com ícones vetoriais SVG.

---
