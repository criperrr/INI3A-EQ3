import "dotenv/config";
import { hash } from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./database";
import { role, user, badge, userBadge, market, customizationItem, userCustomization, product, ocurrency } from "./schema";

export async function seedDatabase() {
  console.log("🌱 [Seed] Checking and seeding database initial data...");

  // 0. Ensure Customization Tables & User Columns exist
  await db.execute(sql`
    ALTER TABLE "badge" ADD COLUMN IF NOT EXISTS description TEXT;

    CREATE TABLE IF NOT EXISTS customization_item (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      category VARCHAR(30) NOT NULL,
      description TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      min_level INTEGER NOT NULL DEFAULT 1,
      preview_value TEXT NOT NULL,
      config TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS equipped_banner_id INTEGER REFERENCES customization_item(id) ON DELETE SET NULL;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS equipped_avatar_frame_id INTEGER REFERENCES customization_item(id) ON DELETE SET NULL;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS equipped_level_frame_id INTEGER REFERENCES customization_item(id) ON DELETE SET NULL;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS equipped_title_id INTEGER REFERENCES customization_item(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS user_customization (
      user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES customization_item(id) ON DELETE CASCADE,
      purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS product_report (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
      reason VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "user" ALTER COLUMN role_id SET DEFAULT 1;
    ALTER TABLE "user" ALTER COLUMN points SET DEFAULT 0;
    ALTER TABLE "user" ALTER COLUMN danger_flag SET DEFAULT FALSE;
  `);

  // 1. Seed Roles
  const defaultRoles = [
    { id: 1, name: "default", minPoints: 0, authority: 0 },
    { id: 2, name: "supporter", minPoints: 100, authority: 1 },
    { id: 3, name: "healer", minPoints: 500, authority: 2 },
    { id: 4, name: "manager", minPoints: 1000, authority: 3 },
    { id: 5, name: "admin", minPoints: 0, authority: 10 },
  ];

  for (const r of defaultRoles) {
    const existing = await db.query.role.findFirst({
      where: (table, { eq }) => eq(table.id, r.id),
    });
    if (!existing) {
      await db.insert(role).values(r);
    } else if (existing.authority !== r.authority || existing.name !== r.name) {
      await db.update(role).set({ authority: r.authority, name: r.name, minPoints: r.minPoints }).where(eq(role.id, r.id));
    }
  }

  // 2. Seed Badges (15 progressive milestones from beginner to legend)
  const defaultBadges = [
    {
      id: 1,
      name: "Pioneiro",
      icon: "🌱",
      description: "Primeiro passo na comunidade Presco.",
      minPoints: 0,
    },
    {
      id: 2,
      name: "Primeiro Olhar",
      icon: "👁️",
      description: "Primeiro produto ou preço consultado no app.",
      minPoints: 25,
    },
    {
      id: 3,
      name: "Caçador de Preços",
      icon: "⭐",
      description: "Iniciou o monitoramento ativo de ofertas locais.",
      minPoints: 50,
    },
    {
      id: 4,
      name: "Sentinela do Bairro",
      icon: "🏪",
      description: "Colaborador frequente mapeando comércios da vizinhança.",
      minPoints: 100,
    },
    {
      id: 5,
      name: "Economista Ativo",
      icon: "💰",
      description: "Ajudando a comunidade a economizar em compras diárias.",
      minPoints: 175,
    },
    {
      id: 6,
      name: "Auditor Comunitário",
      icon: "🔍",
      description: "Verificando e confirmando a exatidão dos registros de preço.",
      minPoints: 250,
    },
    {
      id: 7,
      name: "Detetive de Ofertas",
      icon: "🕵️",
      description: "Especialista em identificar grandes descontos e pechinchas.",
      minPoints: 350,
    },
    {
      id: 8,
      name: "Guardião da Economia",
      icon: "🛡️",
      description: "Defensor do bolso coletivo e da transparência de mercado.",
      minPoints: 500,
    },
    {
      id: 9,
      name: "Mestre das Ofertas",
      icon: "🏆",
      description: "Contribuidor de alto impacto com ampla cobertura de preços.",
      minPoints: 750,
    },
    {
      id: 10,
      name: "Radar de Preços",
      icon: "📡",
      description: "Monitoramento constante e atualizações ágeis no catálogo.",
      minPoints: 1000,
    },
    {
      id: 11,
      name: "Lendário",
      icon: "👑",
      description: "Reconhecimento lendário por dedicação contínua à comunidade.",
      minPoints: 1500,
    },
    {
      id: 12,
      name: "Patrono do Consumo",
      icon: "💎",
      description: "Patrono essencial que transforma a experiência de consumo.",
      minPoints: 2000,
    },
    {
      id: 13,
      name: "Oráculo dos Mercados",
      icon: "🔮",
      description: "Conhecimento profundo das tendências de preço e supermercados.",
      minPoints: 3000,
    },
    {
      id: 14,
      name: "Soberano Supremo",
      icon: "⚡",
      description: "Autoridade e prestígio máximo em colaboração de preços.",
      minPoints: 5000,
    },
    {
      id: 15,
      name: "Mito Presco",
      icon: "🌌",
      description: "Lenda viva eterna com contribuições históricas na plataforma.",
      minPoints: 10000,
    },
  ];

  for (const b of defaultBadges) {
    const existing = await db.query.badge.findFirst({
      where: (table, { eq }) => eq(table.id, b.id),
    });
    if (!existing) {
      await db.insert(badge).values(b);
    } else {
      await db
        .update(badge)
        .set({ name: b.name, icon: b.icon, description: b.description, minPoints: b.minPoints })
        .where(eq(badge.id, b.id));
    }
  }

  // 3. Seed Customization Items (Banners, Avatar Frames, Level Badges)
  const defaultCustomizationItems = [
    // Banners
    {
      id: 1,
      name: "Folhas Tropicais",
      category: "banner",
      description: "Folhagens e plantas tropicais em traços finos sobre verde escuro.",
      price: 0,
      minLevel: 1,
      previewValue: "jungle",
      config: JSON.stringify({ primaryColor: "#1F3827", secondaryColor: "#152E1E", icon: "leaf" }),
      isDefault: true,
    },
    {
      id: 2,
      name: "Circuitos Digitais",
      category: "banner",
      description: "Padrão tecnológico de microchips e trilhas de circuitos integrados.",
      price: 100,
      minLevel: 2,
      previewValue: "cyberpunk",
      config: JSON.stringify({ primaryColor: "#0D0221", secondaryColor: "#00F0FF", accentColor: "#FF007F", icon: "hardware-chip" }),
      isDefault: false,
    },
    {
      id: 3,
      name: "Brisa Suave",
      category: "banner",
      description: "Arco-íris estilizados, nuvens e brisas em tom bordô aconchegante.",
      price: 150,
      minLevel: 2,
      previewValue: "sunset",
      config: JSON.stringify({ primaryColor: "#4A121A", secondaryColor: "#FF6F59", accentColor: "#F7B05B", icon: "sunny" }),
      isDefault: false,
    },
    {
      id: 4,
      name: "Noite Estrelada",
      category: "banner",
      description: "Constelações do zodíaco, luas crescentes e estrelas no céu noturno.",
      price: 250,
      minLevel: 3,
      previewValue: "obsidian",
      config: JSON.stringify({ primaryColor: "#0F0C20", secondaryColor: "#2D1B69", accentColor: "#9B5DE5", icon: "moon" }),
      isDefault: false,
    },
    {
      id: 5,
      name: "Ondas Cósmicas",
      category: "banner",
      description: "Ondulações fluidas de luz estelar com planetas e astros celestes.",
      price: 400,
      minLevel: 4,
      previewValue: "aurora",
      config: JSON.stringify({ primaryColor: "#051923", secondaryColor: "#00A896", accentColor: "#02C39A", icon: "planet" }),
      isDefault: false,
    },
    {
      id: 6,
      name: "Gemas & Cristais",
      category: "banner",
      description: "Padrão geométrico de diamantes lapidados e cristais preciosos.",
      price: 800,
      minLevel: 5,
      previewValue: "gold",
      config: JSON.stringify({ primaryColor: "#2B1A09", secondaryColor: "#C59B27", accentColor: "#FFD700", icon: "diamond" }),
      isDefault: false,
    },
    {
      id: 7,
      name: "Observatório Espacial",
      category: "banner",
      description: "Telescópios astronômicos, planetas com anéis e instrumentos no espaço.",
      price: 1200,
      minLevel: 6,
      previewValue: "nebula",
      config: JSON.stringify({ primaryColor: "#080710", secondaryColor: "#480CA8", accentColor: "#7209B7", icon: "telescope" }),
      isDefault: false,
    },

    // Avatar Frames
    {
      id: 10,
      name: "Clássico",
      category: "avatar_frame",
      description: "Moldura circular clean e minimalista.",
      price: 0,
      minLevel: 1,
      previewValue: "classic",
      config: JSON.stringify({ borderColor: "#FFFFFF", borderWidth: 3 }),
      isDefault: true,
    },
    {
      id: 11,
      name: "Anel Esmeralda",
      category: "avatar_frame",
      description: "Borda neon verde com pulso de energia bio.",
      price: 80,
      minLevel: 2,
      previewValue: "emerald_ring",
      config: JSON.stringify({ borderColor: "#00E676", borderWidth: 4, glowColor: "rgba(0, 230, 118, 0.4)" }),
      isDefault: false,
    },
    {
      id: 12,
      name: "Chama Carmesim",
      category: "avatar_frame",
      description: "Aura incandescente de fogo e rubi.",
      price: 150,
      minLevel: 2,
      previewValue: "crimson_flame",
      config: JSON.stringify({ borderColor: "#FF3366", borderWidth: 4, glowColor: "rgba(255, 51, 102, 0.5)", topBadge: "flame" }),
      isDefault: false,
    },
    {
      id: 13,
      name: "Aura Dourada",
      category: "avatar_frame",
      description: "Borda nobre dourada com brasão de brilho superior.",
      price: 300,
      minLevel: 3,
      previewValue: "golden_aura",
      config: JSON.stringify({ borderColor: "#FFD700", borderWidth: 4, glowColor: "rgba(255, 215, 0, 0.4)", topBadge: "sparkles" }),
      isDefault: false,
    },
    {
      id: 14,
      name: "Prisma Diamante",
      category: "avatar_frame",
      description: "Borda holográfica em tons ciano diamante.",
      price: 500,
      minLevel: 4,
      previewValue: "diamond_prism",
      config: JSON.stringify({ borderColor: "#00F0FF", borderWidth: 4, glowColor: "rgba(0, 240, 255, 0.5)", topBadge: "diamond" }),
      isDefault: false,
    },
    {
      id: 15,
      name: "Escudo Cibernético",
      category: "avatar_frame",
      description: "Moldura angular futurista com matriz tecnológica.",
      price: 750,
      minLevel: 5,
      previewValue: "cyber_shield",
      config: JSON.stringify({ borderColor: "#7928CA", borderWidth: 4, glowColor: "rgba(121, 40, 202, 0.5)", topBadge: "shield" }),
      isDefault: false,
    },
    {
      id: 16,
      name: "Coroa Mítica",
      category: "avatar_frame",
      description: "Moldura lendária de soberano com coroa brilhante.",
      price: 1000,
      minLevel: 6,
      previewValue: "mythic_crown",
      config: JSON.stringify({ borderColor: "#FF9900", borderWidth: 5, glowColor: "rgba(255, 153, 0, 0.6)", topBadge: "ribbon" }),
      isDefault: false,
    },

    // Level Frames / Badges
    {
      id: 20,
      name: "Distintivo Âmbar",
      category: "level_frame",
      description: "Distintivo padrão âmbar moderno com indicação de nível.",
      price: 0,
      minLevel: 1,
      previewValue: "classic_pill",
      config: JSON.stringify({ bg: "#FFC107", textColor: "#273462", icon: "star" }),
      isDefault: true,
    },
    {
      id: 21,
      name: "Engrenagem Steampunk",
      category: "level_frame",
      description: "Insígnia de bronze em formato de engrenagem artesanal.",
      price: 100,
      minLevel: 2,
      previewValue: "steampunk_gear",
      config: JSON.stringify({ bg: "#B87333", textColor: "#FFFFFF", icon: "settings" }),
      isDefault: false,
    },
    {
      id: 22,
      name: "Brasão Guardião",
      category: "level_frame",
      description: "Escudo de proteção prateado com relevo metálico.",
      price: 250,
      minLevel: 3,
      previewValue: "guardian_shield",
      config: JSON.stringify({ bg: "#4A90E2", textColor: "#FFFFFF", icon: "shield-checkmark" }),
      isDefault: false,
    },
    {
      id: 23,
      name: "Asas Celestiais",
      category: "level_frame",
      description: "Emblema alado dourado com asas de anjo guardião.",
      price: 500,
      minLevel: 4,
      previewValue: "celestial_wings",
      config: JSON.stringify({ bg: "#FF9F1C", textColor: "#FFFFFF", icon: "airplane" }),
      isDefault: false,
    },
    {
      id: 24,
      name: "Estrela Galáctica",
      category: "level_frame",
      description: "Insígnia cósmica estelar púrpura com gema central.",
      price: 800,
      minLevel: 5,
      previewValue: "galactic_star",
      config: JSON.stringify({ bg: "#8338EC", textColor: "#FFFFFF", icon: "sparkles" }),
      isDefault: false,
    },
    {
      id: 25,
      name: "Soberano Supremo",
      category: "level_frame",
      description: "Brasão imperial absoluto com coroa e asas douradas.",
      price: 1500,
      minLevel: 6,
      previewValue: "sovereign_crest",
      config: JSON.stringify({ bg: "#E6A100", textColor: "#FFFFFF", icon: "trophy" }),
      isDefault: false,
    },

    // Titles / Cargos & Títulos
    {
      id: 30,
      name: "Iniciante",
      category: "title",
      description: "Membro inicial na comunidade Presco.",
      price: 0,
      minLevel: 1,
      previewValue: "iniciante",
      config: JSON.stringify({ icon: "flag", badgeColor: "#4CAF50", textColor: "#FFFFFF" }),
      isDefault: true,
    },
    {
      id: 31,
      name: "Pioneiro",
      category: "title",
      description: "Primeiro passo na comunidade Presco.",
      price: 0,
      minLevel: 1,
      previewValue: "pioneiro",
      config: JSON.stringify({ icon: "leaf", badgeColor: "#00E676", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 32,
      name: "Primeiro Olhar",
      category: "title",
      description: "Primeiro produto ou preço consultado no app.",
      price: 25,
      minLevel: 1,
      previewValue: "primeiro_olhar",
      config: JSON.stringify({ icon: "eye", badgeColor: "#00B0FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 33,
      name: "Caçador de Preços",
      category: "title",
      description: "Iniciou o monitoramento ativo de ofertas locais.",
      price: 50,
      minLevel: 1,
      previewValue: "cacador_precos",
      config: JSON.stringify({ icon: "search", badgeColor: "#FF9100", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 34,
      name: "Contribuidor",
      category: "title",
      description: "Colaborador regular da comunidade.",
      price: 100,
      minLevel: 2,
      previewValue: "contribuidor",
      config: JSON.stringify({ icon: "people", badgeColor: "#2979FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 35,
      name: "Sentinela do Bairro",
      category: "title",
      description: "Colaborador frequente mapeando comércios da vizinhança.",
      price: 100,
      minLevel: 2,
      previewValue: "sentinela",
      config: JSON.stringify({ icon: "business", badgeColor: "#3D5AFE", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 36,
      name: "Economista Ativo",
      category: "title",
      description: "Ajudando a comunidade a economizar em compras diárias.",
      price: 175,
      minLevel: 2,
      previewValue: "economista",
      config: JSON.stringify({ icon: "cash", badgeColor: "#00E676", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 37,
      name: "Verificador Ativo",
      category: "title",
      description: "Verificador confiável com histórico de precisão.",
      price: 250,
      minLevel: 3,
      previewValue: "verificador",
      config: JSON.stringify({ icon: "checkmark-done-circle", badgeColor: "#00E5FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 38,
      name: "Auditor Comunitário",
      category: "title",
      description: "Verificando e confirmando a exatidão dos registros de preço.",
      price: 250,
      minLevel: 3,
      previewValue: "auditor",
      config: JSON.stringify({ icon: "shield-checkmark", badgeColor: "#651FFF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 39,
      name: "Detetive de Ofertas",
      category: "title",
      description: "Especialista em identificar grandes descontos e pechinchas.",
      price: 350,
      minLevel: 3,
      previewValue: "detetive",
      config: JSON.stringify({ icon: "compass", badgeColor: "#FF3D00", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 40,
      name: "Curador Sênior",
      category: "title",
      description: "Curador experiente de preços e ofertas.",
      price: 500,
      minLevel: 4,
      previewValue: "curador",
      config: JSON.stringify({ icon: "ribbon", badgeColor: "#D500F9", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 41,
      name: "Guardião da Economia",
      category: "title",
      description: "Defensor do bolso coletivo e da transparência de mercado.",
      price: 500,
      minLevel: 4,
      previewValue: "guardiao_economia",
      config: JSON.stringify({ icon: "shield", badgeColor: "#00B0FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 42,
      name: "Mestre das Ofertas",
      category: "title",
      description: "Contribuidor de alto impacto com ampla cobertura de preços.",
      price: 750,
      minLevel: 4,
      previewValue: "mestre",
      config: JSON.stringify({ icon: "trophy", badgeColor: "#FFD700", textColor: "#273462" }),
      isDefault: false,
    },
    {
      id: 43,
      name: "Guardião de Preços",
      category: "title",
      description: "Guardião da integridade de preços e ofertas.",
      price: 1000,
      minLevel: 5,
      previewValue: "guardiao_precos",
      config: JSON.stringify({ icon: "sparkles", badgeColor: "#FF9100", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 44,
      name: "Radar de Preços",
      category: "title",
      description: "Monitoramento constante e atualizações ágeis no catálogo.",
      price: 1000,
      minLevel: 5,
      previewValue: "radar",
      config: JSON.stringify({ icon: "radio", badgeColor: "#00E5FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 45,
      name: "Lendário",
      category: "title",
      description: "Reconhecimento lendário por dedicação contínua à comunidade.",
      price: 1500,
      minLevel: 6,
      previewValue: "lendario",
      config: JSON.stringify({ icon: "flame", badgeColor: "#FF1744", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 46,
      name: "Patrono do Consumo",
      category: "title",
      description: "Patrono essencial que transforma a experiência de consumo.",
      price: 2000,
      minLevel: 6,
      previewValue: "patrono",
      config: JSON.stringify({ icon: "diamond", badgeColor: "#00E5FF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 47,
      name: "Oráculo dos Mercados",
      category: "title",
      description: "Conhecimento profundo das tendências de preço e supermercados.",
      price: 3000,
      minLevel: 6,
      previewValue: "oraculo",
      config: JSON.stringify({ icon: "planet", badgeColor: "#7C4DFF", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 48,
      name: "Soberano Imperial",
      category: "title",
      description: "Autoridade e prestígio máximo em colaboração de preços.",
      price: 5000,
      minLevel: 6,
      previewValue: "soberano",
      config: JSON.stringify({ icon: "ribbon", badgeColor: "#FFD700", textColor: "#273462" }),
      isDefault: false,
    },
    {
      id: 49,
      name: "Mito Presco",
      category: "title",
      description: "Lenda viva eterna com contribuições históricas na plataforma.",
      price: 10000,
      minLevel: 6,
      previewValue: "mito",
      config: JSON.stringify({ icon: "infinite", badgeColor: "#FF007F", textColor: "#FFFFFF" }),
      isDefault: false,
    },
    {
      id: 50,
      name: "Administrador Master",
      category: "title",
      description: "Acesso e autoridade administrativa completa no sistema Presco.",
      price: 0,
      minLevel: 99,
      previewValue: "admin_master",
      config: JSON.stringify({ icon: "shield-half", badgeColor: "#E6A100", textColor: "#FFFFFF" }),
      isDefault: false,
    },
  ];

  for (const item of defaultCustomizationItems) {
    const existing = await db.query.customizationItem.findFirst({
      where: (table, { eq }) => eq(table.id, item.id),
    });
    if (!existing) {
      await db.insert(customizationItem).values(item);
    } else {
      await db
        .update(customizationItem)
        .set({
          name: item.name,
          category: item.category,
          description: item.description,
          price: item.price,
          minLevel: item.minLevel,
          previewValue: item.previewValue,
          config: item.config,
          isDefault: item.isDefault,
        })
        .where(eq(customizationItem.id, item.id));
    }
  }

  // 4. Seed Default Markets (Real Supermarket Chains with PostGIS Coordinates)
  const defaultMarkets = [
    // São Paulo (Capital)
    { name: "Mercado Global Padrão", location: { lat: -23.55052, lng: -46.633308 } },
    { name: "Supermercado Extra", location: { lat: -23.55152, lng: -46.634308 } },
    { name: "Carrefour Express", location: { lat: -23.55252, lng: -46.632308 } },
    { name: "Pão de Açúcar", location: { lat: -23.54952, lng: -46.635308 } },
    { name: "Atacadão Central", location: { lat: -23.54852, lng: -46.631308 } },
    { name: "Assaí Atacadista", location: { lat: -23.55400, lng: -46.630000 } },
    { name: "Dia Supermercado", location: { lat: -23.54700, lng: -46.636000 } },
    { name: "St. Marche Gourmet", location: { lat: -23.55320, lng: -46.637500 } },

    // Bauru & Interior SP (Real Existing Supermarket Chains)
    { name: "Confiança Supermercados - Max", location: { lat: -22.32980, lng: -49.07250 } },
    { name: "Confiança Supermercados - Nações", location: { lat: -22.33800, lng: -49.06200 } },
    { name: "Tauste Supermercados - Duque", location: { lat: -22.33850, lng: -49.05580 } },
    { name: "Tauste Supermercados - Rio Branco", location: { lat: -22.32200, lng: -49.07800 } },
    { name: "Atacadão - Bauru", location: { lat: -22.30870, lng: -49.03480 } },
    { name: "Assaí Atacadista - Bauru", location: { lat: -22.32100, lng: -49.03450 } },
    { name: "Tenda Atacado - Bauru", location: { lat: -22.31200, lng: -49.04100 } },
    { name: "Supermercado Panelão - Bauru", location: { lat: -22.33200, lng: -49.06500 } },
    { name: "Supermercados Jaú Serve - Bauru", location: { lat: -22.34500, lng: -49.05800 } },
    { name: "Pão de Açúcar - Bauru", location: { lat: -22.34210, lng: -49.06120 } },
    { name: "Carrefour Hipermercado - Bauru", location: { lat: -22.35560, lng: -49.04320 } },
    { name: "Supermercado Barracão - Bauru", location: { lat: -22.34120, lng: -49.05100 } },
  ];

  for (const m of defaultMarkets) {
    const existing = await db.query.market.findFirst({
      where: (table, { eq }) => eq(table.name, m.name),
    });
    if (!existing) {
      await db.insert(market).values(m as any);
    } else {
      await db
        .update(market)
        .set({ location: m.location as any })
        .where(eq(market.id, existing.id));
    }
  }

  // Cleanup defunct/non-existent markets (e.g. Paulistão in Bauru)
  const atacadaoBauruTarget = await db.query.market.findFirst({
    where: (table, { eq }) => eq(table.name, "Atacadão - Bauru"),
  });
  const defunctMarkets = await db.query.market.findMany({
    where: (table, { or, ilike, eq }) =>
      or(
        ilike(table.name, "%paulistão%"),
        ilike(table.name, "%paulistao%"),
        eq(table.name, "Supermercados Paulistão - Bauru")
      ),
  });
  for (const defunct of defunctMarkets) {
    if (atacadaoBauruTarget) {
      await db
        .update(ocurrency)
        .set({ marketId: atacadaoBauruTarget.id })
        .where(eq(ocurrency.marketId, defunct.id));
    }
    await db.delete(market).where(eq(market.id, defunct.id));
    console.log(`🧹 [Seed] Removed non-existent market "${defunct.name}" (ID ${defunct.id}) and migrated occurrences.`);
  }

  // 5. Seed Admin Test User: admin@admin.org / admin
  const adminEmail = "admin@admin.org";
  const existingAdmin = await db.query.user.findFirst({
    where: (table, { eq }) => eq(table.email, adminEmail),
  });

  const adminPassHash = await hash("admin", 10);

  let adminUserId = existingAdmin?.id || 1;

  if (!existingAdmin) {
    const [newAdmin] = await db
      .insert(user)
      .values({
        name: "Admin Master",
        email: adminEmail,
        passHash: adminPassHash,
        roleId: 5,
        points: 9999,
        equippedBannerId: 6, // Ouro Imperial
        equippedAvatarFrameId: 16, // Coroa Mítica
        equippedLevelFrameId: 25, // Soberano Supremo
        equippedTitleId: 50, // Administrador Master
      })
      .returning();

    if (newAdmin) {
      adminUserId = newAdmin.id;
      for (const b of defaultBadges) {
        await db.insert(userBadge).values({ userId: newAdmin.id, badgeId: b.id }).onConflictDoNothing();
      }
      for (const itemId of [1, 10, 20, 30, 6, 16, 25, 50]) {
        await db.insert(userCustomization).values({ userId: newAdmin.id, itemId }).onConflictDoNothing();
      }
    }
    console.log("✅ [Seed] Created test admin: admin@admin.org / admin (role: admin, authority: 10)");
  } else {
    adminUserId = existingAdmin.id;
    await db
      .update(user)
      .set({
        roleId: 5,
        points: existingAdmin.points > 0 ? existingAdmin.points : 9999,
        equippedBannerId: existingAdmin.equippedBannerId || 6,
        equippedAvatarFrameId: existingAdmin.equippedAvatarFrameId || 16,
        equippedLevelFrameId: existingAdmin.equippedLevelFrameId || 25,
        equippedTitleId: existingAdmin.equippedTitleId || 50,
      })
      .where(eq(user.id, existingAdmin.id));

    for (const b of defaultBadges) {
      await db.insert(userBadge).values({ userId: existingAdmin.id, badgeId: b.id }).onConflictDoNothing();
    }
    for (const itemId of [1, 10, 20, 30, 6, 16, 25, 50]) {
      await db.insert(userCustomization).values({ userId: existingAdmin.id, itemId }).onConflictDoNothing();
    }
  }

  // 6. Seed Regular Test User: usuario@presco.com / user123
  const userEmail = "usuario@presco.com";
  const existingUser = await db.query.user.findFirst({
    where: (table, { eq }) => eq(table.email, userEmail),
  });

  if (!existingUser) {
    const userPassHash = await hash("user123", 10);
    const [newRegularUser] = await db
      .insert(user)
      .values({
        name: "Usuário Comum",
        email: userEmail,
        passHash: userPassHash,
        roleId: 1,
        points: 150,
        equippedBannerId: 1, // Presco Selva
        equippedAvatarFrameId: 10, // Clássico
        equippedLevelFrameId: 20, // Distintivo Âmbar
        equippedTitleId: 30, // Iniciante
      })
      .returning();

    if (newRegularUser) {
      for (const b of defaultBadges) {
        if (newRegularUser.points >= b.minPoints) {
          await db.insert(userBadge).values({ userId: newRegularUser.id, badgeId: b.id }).onConflictDoNothing();
        }
      }

      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 1 }).onConflictDoNothing();
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 10 }).onConflictDoNothing();
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 20 }).onConflictDoNothing();
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 30 }).onConflictDoNothing();
    }
    console.log("✅ [Seed] Created regular test user: usuario@presco.com / user123");
  } else {
    for (const b of defaultBadges) {
      if (existingUser.points >= b.minPoints) {
        await db.insert(userBadge).values({ userId: existingUser.id, badgeId: b.id }).onConflictDoNothing();
      }
    }

    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 1 }).onConflictDoNothing();
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 10 }).onConflictDoNothing();
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 20 }).onConflictDoNothing();
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 30 }).onConflictDoNothing();
  }

  // 7. Seed Rich Catalog of Products & Multi-Market Occurrences (Idempotent)
  const allCurrentMarkets = await db.select().from(market);
  const marketMap = new Map<string, number>();
  for (const m of allCurrentMarkets) {
    marketMap.set(m.name, m.id);
  }

  // Fallback market IDs - São Paulo Capital
  const mGlobal = marketMap.get("Mercado Global Padrão") || allCurrentMarkets[0]?.id || 1;
  const mExtra = marketMap.get("Supermercado Extra") || allCurrentMarkets[1]?.id || 2;
  const mCarrefour = marketMap.get("Carrefour Express") || allCurrentMarkets[2]?.id || 3;
  const mPaoDeAcucar = marketMap.get("Pão de Açúcar") || allCurrentMarkets[3]?.id || 4;
  const mAtacadao = marketMap.get("Atacadão Central") || allCurrentMarkets[4]?.id || 5;
  const mAssai = marketMap.get("Assaí Atacadista") || mAtacadao;
  const mDia = marketMap.get("Dia Supermercado") || mExtra;
  const mStMarche = marketMap.get("St. Marche Gourmet") || mPaoDeAcucar;

  // Regional market IDs - Bauru & Interior SP
  const mConfiancaMax = marketMap.get("Confiança Supermercados - Max") || mExtra;
  const mConfiancaNacoes = marketMap.get("Confiança Supermercados - Nações") || mConfiancaMax;
  const mTausteDuque = marketMap.get("Tauste Supermercados - Duque") || mCarrefour;
  const mTausteRioBranco = marketMap.get("Tauste Supermercados - Rio Branco") || mTausteDuque;
  const mAtacadaoBauru = marketMap.get("Atacadão - Bauru") || mAtacadao;
  const mAssaiBauru = marketMap.get("Assaí Atacadista - Bauru") || mAssai;
  const mTendaBauru = marketMap.get("Tenda Atacado - Bauru") || mAtacadaoBauru;
  const mPanalaoBauru = marketMap.get("Supermercado Panelão - Bauru") || mConfiancaMax;
  const mJauServeBauru = marketMap.get("Supermercados Jaú Serve - Bauru") || mConfiancaNacoes;
  const mPaoDeAcucarBauru = marketMap.get("Pão de Açúcar - Bauru") || mPaoDeAcucar;
  const mCarrefourBauru = marketMap.get("Carrefour Hipermercado - Bauru") || mCarrefour;
  const mBarracaoBauru = marketMap.get("Supermercado Barracão - Bauru") || mConfiancaMax;

  interface SeedProductDef {
    ean: string;
    name: string;
    description: string;
    icon: string;
    prices: Array<{
      marketId: number;
      value: string;
      trustFlag?: boolean;
      upvotes?: number;
      downvotes?: number;
    }>;
  }

  const catalogProducts: SeedProductDef[] = [
    // 1. ALIMENTOS
    {
      ean: "7891000100101",
      name: "Café Especial Torrado e Moído 500g",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "14.90", trustFlag: true, upvotes: 12, downvotes: 0 }, // Promoção!
        { marketId: mCarrefour, value: "24.90", trustFlag: true, upvotes: 5, downvotes: 1 },
        { marketId: mPaoDeAcucar, value: "26.50", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mAtacadao, value: "18.90", trustFlag: true, upvotes: 8, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100102",
      name: "Azeite de Oliva Extra Virgem 500ml",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
      prices: [
        { marketId: mCarrefour, value: "26.90", trustFlag: true, upvotes: 14, downvotes: 1 }, // Promoção!
        { marketId: mPaoDeAcucar, value: "39.90", trustFlag: true, upvotes: 3, downvotes: 0 },
        { marketId: mAssai, value: "29.90", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mStMarche, value: "42.00", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100104",
      name: "Arroz Nobre Tipo 1 5kg",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "21.90", trustFlag: true, upvotes: 15, downvotes: 0 },
        { marketId: mAssai, value: "22.50", trustFlag: true, upvotes: 9, downvotes: 1 },
        { marketId: mExtra, value: "26.90", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mCarrefour, value: "27.50", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100110",
      name: "Feijão Carioca Selecionado 1kg",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "6.79", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mDia, value: "7.29", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mExtra, value: "8.49", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "9.20", trustFlag: true, upvotes: 2, downvotes: 1 },
      ],
    },
    {
      ean: "7891000100111",
      name: "Macarrão Espaguete Grano Duro 500g",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "5.49", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mCarrefour, value: "7.90", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mStMarche, value: "9.50", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100112",
      name: "Açúcar Refinado Especial 1kg",
      description: "Alimentos",
      icon: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "3.89", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mDia, value: "4.19", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mExtra, value: "4.89", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },

    // 2. HORTIFRÚTI
    {
      ean: "7891000100108",
      name: "Maçã Fuji Selecionada 1kg",
      description: "Hortifrúti",
      icon: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "7.99", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mCarrefour, value: "9.90", trustFlag: true, upvotes: 4, downvotes: 1 },
        { marketId: mStMarche, value: "12.50", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100120",
      name: "Banana Prata Climatizada 1kg",
      description: "Hortifrúti",
      icon: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "4.99", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mAssai, value: "5.49", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "7.89", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100121",
      name: "Tomate Italiano Especial 1kg",
      description: "Hortifrúti",
      icon: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "5.89", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mCarrefour, value: "7.49", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "8.90", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100122",
      name: "Batata Inglesa Lavada 1kg",
      description: "Hortifrúti",
      icon: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "3.99", trustFlag: true, upvotes: 14, downvotes: 0 },
        { marketId: mAssai, value: "4.29", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mExtra, value: "5.90", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100123",
      name: "Alface Crespa Hidropônica Un",
      description: "Hortifrúti",
      icon: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "2.49", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mCarrefour, value: "3.29", trustFlag: true, upvotes: 3, downvotes: 0 },
        { marketId: mStMarche, value: "4.50", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 3. CARNES
    {
      ean: "7891000100130",
      name: "Picanha Bovina Resfriada Peça 1kg",
      description: "Carnes",
      icon: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "59.90", trustFlag: true, upvotes: 25, downvotes: 1 }, // Super Promoção!
        { marketId: mAtacadao, value: "64.90", trustFlag: true, upvotes: 14, downvotes: 0 },
        { marketId: mExtra, value: "79.90", trustFlag: true, upvotes: 8, downvotes: 1 },
        { marketId: mStMarche, value: "119.00", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100131",
      name: "Peito de Frango Desossado e Congelado 1kg",
      description: "Carnes",
      icon: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "14.90", trustFlag: true, upvotes: 18, downvotes: 0 },
        { marketId: mAssai, value: "15.49", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mCarrefour, value: "18.90", trustFlag: true, upvotes: 5, downvotes: 1 },
        { marketId: mPaoDeAcucar, value: "22.50", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100132",
      name: "Linguiça Toscana para Churrasco 1kg",
      description: "Carnes",
      icon: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "16.90", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mAssai, value: "17.49", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mCarrefour, value: "21.90", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100133",
      name: "Filé de Tilápia Congelado 800g",
      description: "Carnes",
      icon: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "32.90", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "44.90", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mStMarche, value: "49.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },

    // 4. LATICÍNIOS
    {
      ean: "7891000100103",
      name: "Leite Integral Orgânico 1L",
      description: "Laticínios",
      icon: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "4.29", trustFlag: true, upvotes: 16, downvotes: 0 }, // Promoção!
        { marketId: mDia, value: "4.69", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "6.50", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mStMarche, value: "7.20", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100140",
      name: "Queijo Mussarela Fatiado 500g",
      description: "Laticínios",
      icon: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "19.90", trustFlag: true, upvotes: 15, downvotes: 0 },
        { marketId: mAssai, value: "20.50", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mCarrefour, value: "25.90", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "28.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100141",
      name: "Iogurte Natural Integral 170g",
      description: "Laticínios",
      icon: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "2.79", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mExtra, value: "3.29", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "4.10", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100142",
      name: "Manteiga Extra com Sal 200g",
      description: "Laticínios",
      icon: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "9.49", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mCarrefour, value: "11.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mStMarche, value: "14.50", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100143",
      name: "Requeijão Cremoso Tradicional 200g",
      description: "Laticínios",
      icon: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "6.99", trustFlag: true, upvotes: 13, downvotes: 0 },
        { marketId: mDia, value: "7.49", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "9.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },

    // 5. PADARIA
    {
      ean: "7891000100105",
      name: "Pão de Forma Artesanal 500g",
      description: "Padaria",
      icon: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "5.99", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mExtra, value: "6.89", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mCarrefour, value: "7.90", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mStMarche, value: "9.50", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100150",
      name: "Pão Francês Tradicional 1kg",
      description: "Padaria",
      icon: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "11.90", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mExtra, value: "13.90", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "17.90", trustFlag: true, upvotes: 5, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100151",
      name: "Torrada Tradicional Crocante 140g",
      description: "Padaria",
      icon: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "3.49", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mCarrefour, value: "4.29", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100152",
      name: "Bolo de Cenoura com Calda de Chocolate 400g",
      description: "Padaria",
      icon: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "12.90", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "16.50", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },

    // 6. BEBIDAS
    {
      ean: "7891000100160",
      name: "Suco de Laranja 100% Integral 1L",
      description: "Bebidas",
      icon: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "7.99", trustFlag: true, upvotes: 14, downvotes: 0 }, // Promoção!
        { marketId: mCarrefour, value: "10.90", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "12.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100161",
      name: "Refrigerante Guaraná Antarctica 2L",
      description: "Bebidas",
      icon: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "6.49", trustFlag: true, upvotes: 18, downvotes: 0 },
        { marketId: mExtra, value: "7.89", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mCarrefour, value: "8.49", trustFlag: true, upvotes: 5, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100162",
      name: "Cerveja Puro Malte Lata 350ml",
      description: "Bebidas",
      icon: "https://images.unsplash.com/photo-1608270110375-d14467a54483?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "3.49", trustFlag: true, upvotes: 21, downvotes: 0 },
        { marketId: mDia, value: "3.79", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "4.79", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100163",
      name: "Água Mineral Natural Sem Gás 510ml",
      description: "Bebidas",
      icon: "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "1.29", trustFlag: true, upvotes: 16, downvotes: 0 },
        { marketId: mCarrefour, value: "1.99", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mStMarche, value: "2.80", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 7. CONGELADOS
    {
      ean: "7891000100170",
      name: "Pizza Congelada Calabresa Especial 460g",
      description: "Congelados",
      icon: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "11.90", trustFlag: true, upvotes: 14, downvotes: 0 }, // Promoção!
        { marketId: mDia, value: "13.50", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mCarrefour, value: "16.90", trustFlag: true, upvotes: 5, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100171",
      name: "Hambúrguer Bovino Tradicional 672g",
      description: "Congelados",
      icon: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "17.90", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mAssai, value: "18.50", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "24.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100172",
      name: "Sorvete Especial de Chocolate Belga 1L",
      description: "Congelados",
      icon: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "19.90", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "27.90", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mStMarche, value: "32.00", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 8. DOCES & SNACKS
    {
      ean: "7891000100106",
      name: "Chocolate Meio Amargo 70% 90g",
      description: "Doces & Snacks",
      icon: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "5.99", trustFlag: true, upvotes: 17, downvotes: 0 }, // Promoção!
        { marketId: mDia, value: "6.79", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mCarrefour, value: "8.90", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100180",
      name: "Batata Chips Clássica Crocante 100g",
      description: "Doces & Snacks",
      icon: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "6.29", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mExtra, value: "7.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mStMarche, value: "9.90", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100181",
      name: "Biscoito Recheado Chocolate Duplo 130g",
      description: "Doces & Snacks",
      icon: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "2.49", trustFlag: true, upvotes: 15, downvotes: 0 },
        { marketId: mDia, value: "2.89", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mCarrefour, value: "3.79", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },

    // 9. LIMPEZA
    {
      ean: "7891000100107",
      name: "Detergente Líquido Concentrado Neutro 500ml",
      description: "Limpeza",
      icon: "https://images.unsplash.com/photo-1585670270608-b4b4f1da0d01?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "1.99", trustFlag: true, upvotes: 19, downvotes: 0 },
        { marketId: mAssai, value: "2.19", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mCarrefour, value: "2.89", trustFlag: true, upvotes: 5, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100190",
      name: "Sabão em Pó Concentrado Ação Total 1.6kg",
      description: "Limpeza",
      icon: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "16.90", trustFlag: true, upvotes: 14, downvotes: 0 }, // Promoção!
        { marketId: mAtacadao, value: "17.80", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mExtra, value: "22.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "25.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100191",
      name: "Desinfetante Antibacteriano Lavanda 1L",
      description: "Limpeza",
      icon: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "4.99", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mExtra, value: "6.49", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mCarrefour, value: "7.20", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100192",
      name: "Amaciante de Roupas Concentrado 1.5L",
      description: "Limpeza",
      icon: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "14.90", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mCarrefour, value: "18.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "21.90", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 10. HIGIENE
    {
      ean: "7891000100200",
      name: "Sabonete Líquido Hidratante Erva Doce 250ml",
      description: "Higiene",
      icon: "https://images.unsplash.com/photo-1608248597359-009139a03977?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "4.99", trustFlag: true, upvotes: 8, downvotes: 0 },
        { marketId: mExtra, value: "6.50", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mStMarche, value: "8.90", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100201",
      name: "Shampoo Revitalizante Nutrição 400ml",
      description: "Higiene",
      icon: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "13.90", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mCarrefour, value: "17.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "20.90", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100202",
      name: "Creme Dental Proteção Total 90g",
      description: "Higiene",
      icon: "https://images.unsplash.com/photo-1559567123-956247c45831?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "3.29", trustFlag: true, upvotes: 16, downvotes: 0 },
        { marketId: mDia, value: "3.79", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mExtra, value: "4.99", trustFlag: true, upvotes: 5, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100203",
      name: "Desodorante Antitranspirante Aerosol 150ml",
      description: "Higiene",
      icon: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "10.90", trustFlag: true, upvotes: 14, downvotes: 0 }, // Promoção!
        { marketId: mCarrefour, value: "14.90", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "16.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },

    // 11. BEBÊS
    {
      ean: "7891000100210",
      name: "Fralda Descartável Infantil Tamanho G 32 un",
      description: "Bebês",
      icon: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "38.90", trustFlag: true, upvotes: 20, downvotes: 0 },
        { marketId: mAssai, value: "39.90", trustFlag: true, upvotes: 13, downvotes: 0 },
        { marketId: mExtra, value: "49.90", trustFlag: true, upvotes: 6, downvotes: 1 },
        { marketId: mPaoDeAcucar, value: "54.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100211",
      name: "Lenços Umedecidos Toque Suave 48 un",
      description: "Bebês",
      icon: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
      prices: [
        { marketId: mDia, value: "6.99", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mCarrefour, value: "8.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mStMarche, value: "11.50", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 12. PETS
    {
      ean: "7891000100220",
      name: "Ração Seca Premium para Cães Adultos 3kg",
      description: "Pets",
      icon: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "42.90", trustFlag: true, upvotes: 15, downvotes: 0 },
        { marketId: mAtacadao, value: "44.50", trustFlag: true, upvotes: 9, downvotes: 0 },
        { marketId: mCarrefour, value: "54.90", trustFlag: true, upvotes: 4, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "59.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100221",
      name: "Ração Úmida Sachê para Gatos Salmão 85g",
      description: "Pets",
      icon: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "2.79", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mDia, value: "3.19", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mExtra, value: "3.99", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },

    // 13. FARMÁCIA
    {
      ean: "7891000100230",
      name: "Vitamina C Efervescente 1g 10 Comprimidos",
      description: "Farmácia",
      icon: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&h=400&fit=crop",
      prices: [
        { marketId: mExtra, value: "11.90", trustFlag: true, upvotes: 10, downvotes: 0 },
        { marketId: mCarrefour, value: "13.90", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "16.50", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100231",
      name: "Álcool em Gel 70% Antisséptico 500ml",
      description: "Farmácia",
      icon: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "6.49", trustFlag: true, upvotes: 13, downvotes: 0 },
        { marketId: mDia, value: "7.20", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mExtra, value: "8.90", trustFlag: true, upvotes: 4, downvotes: 0 },
      ],
    },

    // 14. UTILIDADES
    {
      ean: "7891000100240",
      name: "Papel Toalha Folha Dupla 2 Rolos",
      description: "Utilidades",
      icon: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAssai, value: "4.49", trustFlag: true, upvotes: 11, downvotes: 0 },
        { marketId: mDia, value: "4.99", trustFlag: true, upvotes: 7, downvotes: 0 },
        { marketId: mCarrefour, value: "6.20", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
    {
      ean: "7891000100241",
      name: "Sacos de Lixo Reforçados 50L 30 un",
      description: "Utilidades",
      icon: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "11.90", trustFlag: true, upvotes: 14, downvotes: 0 },
        { marketId: mExtra, value: "14.50", trustFlag: true, upvotes: 6, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "17.90", trustFlag: true, upvotes: 2, downvotes: 0 },
      ],
    },

    // 15. OUTROS
    {
      ean: "7891000100250",
      name: "Pilhas Alcalinas AA Pacote com 4 un",
      description: "Outros",
      icon: "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?w=400&h=400&fit=crop",
      prices: [
        { marketId: mAtacadao, value: "14.90", trustFlag: true, upvotes: 12, downvotes: 0 },
        { marketId: mCarrefour, value: "18.90", trustFlag: true, upvotes: 5, downvotes: 0 },
        { marketId: mPaoDeAcucar, value: "22.90", trustFlag: true, upvotes: 3, downvotes: 0 },
      ],
    },
  ];

  let insertedProductCount = 0;
  let insertedOccurrencesCount = 0;

  for (const item of catalogProducts) {
    let targetProduct = await db.query.product.findFirst({
      where: (table, { eq }) => eq(table.ean, item.ean),
    });

    if (!targetProduct) {
      const [newProduct] = await db
        .insert(product)
        .values({
          ean: item.ean,
          name: item.name,
          description: item.description,
          icon: item.icon,
        })
        .returning();
      targetProduct = newProduct;
      insertedProductCount++;
    } else {
      // Ensure description/category and icon are synchronized
      await db
        .update(product)
        .set({
          name: item.name,
          description: item.description,
          icon: item.icon,
        })
        .where(eq(product.id, targetProduct.id));
    }

    if (targetProduct) {
      const allPricesToSeed = [...item.prices];

      // Automatically populate regional counterparts for rich Bauru / Interior price comparisons
      for (const pr of item.prices) {
        const numVal = parseFloat(pr.value);
        if (isNaN(numVal) || numVal <= 0) continue;

        if (pr.marketId === mAtacadao) {
          allPricesToSeed.push(
            { marketId: mAtacadaoBauru, value: (numVal * 0.99).toFixed(2), trustFlag: true, upvotes: Math.max(3, (pr.upvotes ?? 5) - 1), downvotes: 0 },
            { marketId: mTendaBauru, value: (numVal * 1.01).toFixed(2), trustFlag: true, upvotes: Math.max(2, (pr.upvotes ?? 4) - 2), downvotes: 0 }
          );
        } else if (pr.marketId === mAssai) {
          allPricesToSeed.push(
            { marketId: mAssaiBauru, value: (numVal * 0.98).toFixed(2), trustFlag: true, upvotes: Math.max(3, (pr.upvotes ?? 5) - 1), downvotes: 0 },
            { marketId: mPanalaoBauru, value: (numVal * 1.02).toFixed(2), trustFlag: true, upvotes: Math.max(2, (pr.upvotes ?? 4) - 1), downvotes: 0 }
          );
        } else if (pr.marketId === mCarrefour) {
          allPricesToSeed.push(
            { marketId: mTausteDuque, value: (numVal * 0.96).toFixed(2), trustFlag: true, upvotes: Math.max(4, (pr.upvotes ?? 6) - 1), downvotes: 0 },
            { marketId: mTausteRioBranco, value: (numVal * 0.97).toFixed(2), trustFlag: true, upvotes: Math.max(2, (pr.upvotes ?? 4) - 2), downvotes: 0 },
            { marketId: mCarrefourBauru, value: (numVal * 1.00).toFixed(2), trustFlag: true, upvotes: Math.max(3, (pr.upvotes ?? 5) - 1), downvotes: 0 }
          );
        } else if (pr.marketId === mExtra) {
          allPricesToSeed.push(
            { marketId: mConfiancaMax, value: (numVal * 0.97).toFixed(2), trustFlag: true, upvotes: Math.max(5, (pr.upvotes ?? 7) - 1), downvotes: 0 },
            { marketId: mConfiancaNacoes, value: (numVal * 0.98).toFixed(2), trustFlag: true, upvotes: Math.max(3, (pr.upvotes ?? 5) - 2), downvotes: 0 }
          );
        } else if (pr.marketId === mPaoDeAcucar) {
          allPricesToSeed.push(
            { marketId: mPaoDeAcucarBauru, value: (numVal * 1.00).toFixed(2), trustFlag: true, upvotes: Math.max(2, (pr.upvotes ?? 4) - 1), downvotes: 0 },
            { marketId: mBarracaoBauru, value: (numVal * 0.95).toFixed(2), trustFlag: true, upvotes: Math.max(3, (pr.upvotes ?? 5) - 1), downvotes: 0 }
          );
        } else if (pr.marketId === mDia) {
          allPricesToSeed.push(
            { marketId: mJauServeBauru, value: (numVal * 0.99).toFixed(2), trustFlag: true, upvotes: Math.max(2, (pr.upvotes ?? 4) - 1), downvotes: 0 }
          );
        }
      }

      // Seed occurrences across markets
      for (const pr of allPricesToSeed) {
        if (!pr.marketId) continue;
        const existingOcc = await db.query.ocurrency.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.productId, targetProduct.id),
              eq(table.marketId, pr.marketId),
              eq(table.userId, adminUserId)
            ),
        });

        if (!existingOcc) {
          await db.insert(ocurrency).values({
            userId: adminUserId,
            marketId: pr.marketId,
            productId: targetProduct.id,
            value: pr.value,
            trustFlag: pr.trustFlag ?? true,
            upvoteCount: pr.upvotes ?? 0,
            downvoteCount: pr.downvotes ?? 0,
          });
          insertedOccurrencesCount++;
        }
      }
    }
  }

  console.log(
    `✅ [Seed] Catalog synchronized: ${catalogProducts.length} items checked (${insertedProductCount} newly inserted products, ${insertedOccurrencesCount} new market price occurrences).`
  );
  console.log("✨ [Seed] Database initial seed completed successfully.");
}

// Standalone execution support
if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ [Seed] Error:", err);
      await pool.end();
      process.exit(1);
    });
}
