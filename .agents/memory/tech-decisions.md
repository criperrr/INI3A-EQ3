---
type: project
created: 2026-08-01
updated: 2026-09-04
---

# Technical Decisions - Presco (INI3A-EQ3)

Registro das decisões técnicas fundamentais tomadas na arquitetura do Presco.

---

## 1. Banco de Dados & Camada Geográfica
- **PostGIS sobre PostgreSQl**: Escolhido para viabilizar cálculos espaciais precisos (`ST_DWithin` com raio de 15km e ordenação `ST_Distance`) entre a localização do usuário e supermercados cadastrados.
- **Drizzle ORM**: Escolhido por ser leve, tipado e com overhead mínimo comparado ao Prisma. Colunas `geography` são custom types e devem ser convertidas com `sql`ST_AsGeoJson()``.
- **Encapsulamento Estrito**: Drizzle só pode ser importado dentro de `shared/database/repositories/`. Services e Controllers não conhecem a implementação do banco.

## 2. Autenticação & Sessões
- **JWT + Redis (Sem colunas de token no banco relacional)**: Access tokens duram 15 minutos e contêm o JTI. Refresh tokens criptográficos vivem exclusivamente no Redis com TTL de 7 dias. Logout invalida o JTI no Redis (`blacklist:<jti>`).
- **Dev Mode Quick Login**: Para agilizar o desenvolvimento acadêmico, o backend e o frontend expõem atalho rápido para `admin@admin.org` (senha `admin`) e usuário padrão de teste.

## 3. Frontend Mobile & Design System
- **Expo SDK 54 & Expo Router**: Arquitetura moderna de rotas baseadas em arquivos em `src/frontend/app/`.
- **Reanimated 4 Gesture Navigation**: Swipe horizontal fluido estilo TikTok entre as principais telas (`SwipeTabNavigator.tsx`) com física de mola suave e haptics.
- **Design Tokens & Monet**: Consumo unificado via `useTheme()` em `themeContext`. Suporte total a AMOLED com `#000000` puro para economia de bateria e extração dinâmica de cores do papel de parede Android (Material You / Monet).
- **Sem Frameworks CSS Web**: Proibido Tailwind CSS ou CSS web. Usar exclusivamente `StyleSheet.create` do React Native com os tokens de `DESIGN.md`.

## 4. Internacionalização (i18n)
- Suporte a 7 idiomas: `pt-BR`, `en-US`, `es-ES`, `de-DE`, `ru-RU`, `zh-CN`, `ja-JP`.
- Todas as chaves devem ser registradas em `src/frontend/constants/locales/` e consumidas via `useI18n()`.
