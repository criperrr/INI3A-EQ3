import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./database";
import { HereMarketDiscovery } from "../services/hereMarketDiscovery.service";

export async function executeReallocation() {
  console.log("🚀 [Reallocation] Starting market reallocation to HERE API markets...");

  // 1. Ensure latest HERE API markets are populated for active areas (Bauru & São Paulo)
  console.log("📍 [Reallocation] Ensuring HERE API markets are discovered for Bauru and São Paulo...");
  await HereMarketDiscovery.discoverNearbyMarkets(-22.3145, -49.0587, 20000); // Bauru
  await HereMarketDiscovery.discoverNearbyMarkets(-23.5505, -46.6333, 15000); // São Paulo

  // 2. Clean up non-retail noise in markets with 0 occurrences
  await db.execute(sql`
    DELETE FROM market
    WHERE id >= 125
      AND id NOT IN (SELECT DISTINCT market_id FROM ocurrency)
      AND (
        name ILIKE '%livraria%' OR
        name ILIKE '%estética%' OR
        name ILIKE '%estetica%' OR
        name ILIKE '%bar e lanches%' OR
        name ILIKE '%embalagens%' OR
        name ILIKE '%descartáveis%' OR
        name ILIKE '%descartaveis%' OR
        name ILIKE '%pastelaria%' OR
        name ILIKE '%restaurante%' OR
        name ILIKE '%salão%' OR
        name ILIKE '%culturista%'
      )
  `);

  // 3. Find candidate target markets (authentic HERE API supermarkets)
  const targetMarkets = await db.execute(sql`
    SELECT id, name, ST_AsGeoJson(location) as geo
    FROM market
    WHERE id >= 125
      AND (
        name ILIKE '%supermercado%' OR
        name ILIKE '%hipermercado%' OR
        name ILIKE '%mercado%' OR
        name ILIKE '%mercearia%' OR
        name ILIKE '%atacad%' OR
        name ILIKE '%assai%' OR
        name ILIKE '%assaí%' OR
        name ILIKE '%carrefour%' OR
        name ILIKE '%pão de açúcar%' OR
        name ILIKE '%pao de acucar%' OR
        name ILIKE '%confiança%' OR
        name ILIKE '%tauste%' OR
        name ILIKE '%tenda%' OR
        name ILIKE '%panelão%' OR
        name ILIKE '%panelao%' OR
        name ILIKE '%extra%' OR
        name ILIKE '%dia%' OR
        name ILIKE '%spani%' OR
        name ILIKE '%hortifruti%' OR
        name ILIKE '%hortifrúti%' OR
        name ILIKE '%big%'
      )
      AND NOT (
        name ILIKE '%cacau show%' OR
        name ILIKE '%padaria%' OR
        name ILIKE '%bakery%' OR
        name ILIKE '%confeitaria%' OR
        name ILIKE '%café%' OR
        name ILIKE '%cafe%' OR
        name ILIKE '%pastelaria%' OR
        name ILIKE '%restaurante%' OR
        name ILIKE '%estética%' OR
        name ILIKE '%livraria%'
      )
    ORDER BY id ASC
  `);

  const targetIds = targetMarkets.rows.map(r => r.id as number);
  console.log(`✅ [Reallocation] Found ${targetIds.length} verified genuine HERE API Supermarket targets.`);

  if (targetIds.length === 0) {
    throw new Error("No target HERE API supermarkets found! Aborting reallocation.");
  }

  // 4. Find all non-API / legacy / fictitious markets that have occurrences (ID < 125)
  const oldMarketsWithOcc = await db.execute(sql`
    SELECT m.id, m.name, ST_AsGeoJson(m.location) as geo, count(o.id) as oc_count
    FROM market m
    JOIN ocurrency o ON o.market_id = m.id
    WHERE m.id < 125
    GROUP BY m.id, m.name, m.location
    ORDER BY oc_count DESC
  `);

  console.log(`📦 [Reallocation] Found ${oldMarketsWithOcc.rows.length} non-API markets with occurrences to reallocate.`);

  const brands = [
    { key: "tauste", pattern: "%tauste%" },
    { key: "confiança", pattern: "%confiança%" },
    { key: "atacadão", pattern: "%atacadão%" },
    { key: "atacadão - bauru", pattern: "%atacadão%" },
    { key: "assai", pattern: "%assa%" },
    { key: "pão de açúcar", pattern: "%pão de açúcar%" },
    { key: "carrefour", pattern: "%carrefour%" },
    { key: "tenda", pattern: "%tenda%" },
    { key: "panelão", pattern: "%panelão%" },
    { key: "extra", pattern: "%extra%" },
  ];

  let totalReallocated = 0;

  for (const old of oldMarketsWithOcc.rows) {
    const geo = JSON.parse(old.geo as string);
    const count = Number(old.oc_count);
    const oldName = String(old.name).toLowerCase();

    // Check brand match within 10km
    let brandMatch: any = null;
    const matchingBrand = brands.find(b => oldName.includes(b.key));
    if (matchingBrand) {
      const bRes = await db.execute(sql`
        SELECT m.id, m.name, ST_Distance(m.location, ST_GeographyFromText('POINT(' || ${geo.coordinates[0]} || ' ' || ${geo.coordinates[1]} || ')') ) as dist
        FROM market m
        WHERE m.id IN (${sql.join(targetIds.map(id => sql`${id}`), sql`, `)})
          AND m.name ILIKE ${matchingBrand.pattern}
          AND ST_DWithin(m.location, ST_GeographyFromText('POINT(' || ${geo.coordinates[0]} || ' ' || ${geo.coordinates[1]} || ')'), 10000)
        ORDER BY dist ASC
        LIMIT 1
      `);
      if (bRes.rows.length > 0) {
        brandMatch = bRes.rows[0];
      }
    }

    let target = brandMatch;
    let strategy = "BRAND MATCH";
    if (!target) {
      strategy = "NEAREST SPATIAL";
      const closest = await db.execute(sql`
        SELECT m.id, m.name, ST_Distance(m.location, ST_GeographyFromText('POINT(' || ${geo.coordinates[0]} || ' ' || ${geo.coordinates[1]} || ')') ) as dist
        FROM market m
        WHERE m.id IN (${sql.join(targetIds.map(id => sql`${id}`), sql`, `)})
        ORDER BY dist ASC
        LIMIT 1
      `);
      target = closest.rows[0];
    }

    const distKm = (Number(target.dist) / 1000).toFixed(2);
    console.log(`  ↪ Moving ${count} occurrences: "${old.name}" (ID ${old.id}) -> "${target.name}" (ID ${target.id}) [${distKm} km, ${strategy}]`);

    // Execute reallocation in database
    await db.execute(sql`
      UPDATE ocurrency
      SET market_id = ${target.id}
      WHERE market_id = ${old.id}
    `);

    totalReallocated += count;
  }

  console.log(`🎉 [Reallocation] Successfully migrated ${totalReallocated} occurrences!`);

  // 5. Delete all legacy / non-API markets (all IDs < 125)
  const deletedOld = await db.execute(sql`
    DELETE FROM market
    WHERE id < 125
    RETURNING id
  `);

  console.log(`🗑️ [Reallocation] Purged ${deletedOld.rows.length} legacy/inexistent markets from database.`);

  // 6. Verify that 100% of remaining markets are HERE API markets (ID >= 125)
  const remainingMarkets = await db.execute(sql`
    SELECT count(*) as total,
           count(CASE WHEN id >= 125 THEN 1 END) as here_count,
           count(CASE WHEN id < 125 THEN 1 END) as legacy_count
    FROM market
  `);

  const summary = remainingMarkets.rows[0];
  if (summary) {
    console.log(`📊 [Verification] Total markets: ${summary.total} (HERE API: ${summary.here_count}, Legacy: ${summary.legacy_count})`);
  }

  // Verify total occurrences preserved
  const totalOcc = await db.execute(sql`SELECT count(*) as total FROM ocurrency`);
  const occCount = totalOcc.rows[0]?.total;
  console.log(`📊 [Verification] Total active occurrences in database: ${occCount}`);
}

if (process.argv[1]?.endsWith("reallocateMarkets.ts")) {
  executeReallocation()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ [Reallocation] Error:", err);
      await pool.end();
      process.exit(1);
    });
}
