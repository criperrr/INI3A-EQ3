/**
 * seed.ts — Popula dados obrigatórios para o ambiente de desenvolvimento.
 * Execute com: npx tsx ./src/shared/database/seed.ts
 */
import "dotenv/config";
import { pool, db } from "./database";
import * as schema from "./schema";

async function seed() {
  console.log("🌱 Iniciando seed...");

  // Roles padrão do sistema
  // authority: nível de autoridade (quanto maior, mais permissões)
  await db
    .insert(schema.role)
    .values([
      { name: "default",   minPoints: 0,    authority: 0 },
      { name: "supporter", minPoints: 100,  authority: 1 },
      { name: "healer",    minPoints: 500,  authority: 2 },
      { name: "manager",   minPoints: 1000, authority: 3 },
      { name: "admin",     minPoints: 0,    authority: 10 },
    ])
    .onConflictDoNothing();

  console.log("✅ Roles inseridos.");

  // Scopes padrão (permissões granulares)
  await db
    .insert(schema.scope)
    .values([
      { scopeName: "read:market" },
      { scopeName: "write:market" },
      { scopeName: "read:entry" },
      { scopeName: "write:entry" },
      { scopeName: "read:user" },
      { scopeName: "write:user" },
      { scopeName: "admin:all" },
    ])
    .onConflictDoNothing();

  console.log("✅ Scopes inseridos.");

  // Badge de boas-vindas
  await db
    .insert(schema.badge)
    .values([
      { name: "Bem-vindo",      minPoints: 0,   icon: "🌱" },
      { name: "Contribuidor",   minPoints: 50,  icon: "⭐" },
      { name: "Verificador",    minPoints: 200, icon: "🔍" },
      { name: "Especialista",   minPoints: 500, icon: "🏆" },
    ])
    .onConflictDoNothing();

  console.log("✅ Badges inseridos.");

  // Mercado Global Padrão
  const existingMarkets = await db.select().from(schema.market).limit(1);
  if (existingMarkets.length === 0) {
    await db
      .insert(schema.market)
      .values({
        name: "Mercado Global Padrão",
        location: { lat: -23.55052, lng: -46.633308 },
      });
    console.log("✅ Mercado Global Padrão inserido.");
  } else {
    console.log("✅ Mercado já existente no banco.");
  }

  console.log("🎉 Seed concluído com sucesso!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed falhou:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
