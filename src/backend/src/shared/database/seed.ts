import "dotenv/config";
import { hash } from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./database";
import { role, user, badge, userBadge, market, customizationItem, userCustomization } from "./schema";

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

    CREATE TABLE IF NOT EXISTS user_customization (
      user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES customization_item(id) ON DELETE CASCADE,
      purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id)
    );
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

  // 4. Seed Default Markets
  const defaultMarkets = [
    { name: "Mercado Global Padrão", location: { lat: -23.55052, lng: -46.633308 } },
    { name: "Supermercado Extra", location: { lat: -23.55152, lng: -46.634308 } },
    { name: "Carrefour Express", location: { lat: -23.55252, lng: -46.632308 } },
    { name: "Pão de Açúcar", location: { lat: -23.54952, lng: -46.635308 } },
    { name: "Atacadão Central", location: { lat: -23.54852, lng: -46.631308 } },
  ];

  const existingMarkets = await db.select().from(market);
  if (existingMarkets.length === 0) {
    for (const m of defaultMarkets) {
      await db.insert(market).values(m as any);
    }
  } else {
    for (const m of defaultMarkets) {
      const found = existingMarkets.find((em) => em.name === m.name);
      if (!found) {
        await db.insert(market).values(m as any);
      }
    }
  }

  // 5. Seed Admin Test User: admin@admin.org / admin
  const adminEmail = "admin@admin.org";
  const existingAdmin = await db.query.user.findFirst({
    where: (table, { eq }) => eq(table.email, adminEmail),
  });

  const adminPassHash = await hash("admin", 10);

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
      })
      .returning();

    // Award badges and initial items for admin
    if (newAdmin) {
      for (const b of defaultBadges) {
        await db.insert(userBadge).values({ userId: newAdmin.id, badgeId: b.id }).onConflictDoNothing();
      }
      for (const itemId of [1, 10, 20, 6, 16, 25]) {
        await db.insert(userCustomization).values({ userId: newAdmin.id, itemId }).onConflictDoNothing();
      }
    }
    console.log("✅ [Seed] Created test admin: admin@admin.org / admin (role: admin, authority: 10)");
  } else {
    // Ensure roleId, points, and customizations are synchronized without resetting custom password
    await db
      .update(user)
      .set({
        roleId: 5,
        points: existingAdmin.points > 0 ? existingAdmin.points : 9999,
        equippedBannerId: existingAdmin.equippedBannerId || 6,
        equippedAvatarFrameId: existingAdmin.equippedAvatarFrameId || 16,
        equippedLevelFrameId: existingAdmin.equippedLevelFrameId || 25,
      })
      .where(eq(user.id, existingAdmin.id));

    for (const b of defaultBadges) {
      await db.insert(userBadge).values({ userId: existingAdmin.id, badgeId: b.id }).onConflictDoNothing();
    }
    for (const itemId of [1, 10, 20, 6, 16, 25]) {
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
      })
      .returning();

    if (newRegularUser) {
      for (const b of defaultBadges) {
        if (newRegularUser.points >= b.minPoints) {
          await db.insert(userBadge).values({ userId: newRegularUser.id, badgeId: b.id }).onConflictDoNothing();
        }
      }

      // Give default free items
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 1 }).onConflictDoNothing();
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 10 }).onConflictDoNothing();
      await db.insert(userCustomization).values({ userId: newRegularUser.id, itemId: 20 }).onConflictDoNothing();
    }
    console.log("✅ [Seed] Created regular test user: usuario@presco.com / user123");
  } else {
    // Ensure badges corresponding to points are synchronized
    for (const b of defaultBadges) {
      if (existingUser.points >= b.minPoints) {
        await db.insert(userBadge).values({ userId: existingUser.id, badgeId: b.id }).onConflictDoNothing();
      }
    }

    // Ensure default customizations are unlocked
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 1 }).onConflictDoNothing();
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 10 }).onConflictDoNothing();
    await db.insert(userCustomization).values({ userId: existingUser.id, itemId: 20 }).onConflictDoNothing();
  }

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
