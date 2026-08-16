import "dotenv/config";
import { hash } from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./database";
import { role, user, badge, userBadge, market } from "./schema";

export async function seedDatabase() {
  console.log("🌱 [Seed] Checking and seeding database initial data...");

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

  // 2. Seed Badges
  const defaultBadges = [
    { id: 1, name: "Pioneiro", icon: "🌱", minPoints: 0 },
    { id: 2, name: "Caçador de Preços", icon: "⭐", minPoints: 50 },
    { id: 3, name: "Auditor Comunitário", icon: "🔍", minPoints: 200 },
    { id: 4, name: "Mestre das Ofertas", icon: "🏆", minPoints: 500 },
    { id: 5, name: "Lendário", icon: "👑", minPoints: 1000 },
  ];

  for (const b of defaultBadges) {
    const existing = await db.query.badge.findFirst({
      where: (table, { eq }) => eq(table.id, b.id),
    });
    if (!existing) {
      await db.insert(badge).values(b);
    } else {
      await db.update(badge).set({ name: b.name, icon: b.icon, minPoints: b.minPoints }).where(eq(badge.id, b.id));
    }
  }

  // 3. Seed Default Markets
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

  // 4. Seed Admin Test User: admin@admin.org / admin
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
      })
      .returning();

    // Award all badges to admin
    if (newAdmin) {
      for (const b of defaultBadges) {
        await db.insert(userBadge).values({ userId: newAdmin.id, badgeId: b.id }).onConflictDoNothing();
      }
    }
    console.log("✅ [Seed] Created test admin: admin@admin.org / admin (role: admin, authority: 10)");
  } else {
    // Ensure roleId and password are synchronized
    await db
      .update(user)
      .set({
        roleId: 5,
        passHash: adminPassHash,
        points: existingAdmin.points > 0 ? existingAdmin.points : 9999,
      })
      .where(eq(user.id, existingAdmin.id));

    for (const b of defaultBadges) {
      await db.insert(userBadge).values({ userId: existingAdmin.id, badgeId: b.id }).onConflictDoNothing();
    }
  }

  // 5. Seed Regular Test User: usuario@presco.com / user123
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
      })
      .returning();

    if (newRegularUser) {
      await db.insert(userBadge).values({ userId: newRegularUser.id, badgeId: 1 }).onConflictDoNothing();
      await db.insert(userBadge).values({ userId: newRegularUser.id, badgeId: 2 }).onConflictDoNothing();
    }
    console.log("✅ [Seed] Created regular test user: usuario@presco.com / user123");
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
