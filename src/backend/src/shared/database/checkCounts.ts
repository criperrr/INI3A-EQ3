import "dotenv/config";
import { db, pool } from "./database";
import { product, market, ocurrency } from "./schema";
import { eq, inArray, sql } from "drizzle-orm";

async function verify() {
  const pCount = await db.select({ count: sql<number>`count(*)` }).from(product);
  const mCount = await db.select({ count: sql<number>`count(*)` }).from(market);
  const oCount = await db.select({ count: sql<number>`count(*)` }).from(ocurrency);
  const markets = await db.select().from(market);

  console.log("=== DB SEED VERIFICATION ===");
  console.log(`📦 Total Products: ${pCount[0]?.count ?? 0}`);
  console.log(`🏪 Total Markets: ${mCount[0]?.count ?? 0}`);
  console.log(`💰 Total Price Occurrences: ${oCount[0]?.count ?? 0}`);
  
  console.log("\nRegistered Markets:");
  markets.forEach((m) => console.log(` - [ID ${m.id}] ${m.name}`));

  const featuredEans = ["7891000100130", "7891000100101", "7891000100103", "7891000100170", "7891000100102"];
  const prods = await db.query.product.findMany({
    where: (t, { inArray }) => inArray(t.ean, featuredEans),
  });

  console.log("\n=== Multi-Market Price Occurrences for Key Products ===");
  for (const p of prods) {
    const occs = await db
      .select({
        marketName: market.name,
        value: ocurrency.value,
        upvotes: ocurrency.upvoteCount,
        trustFlag: ocurrency.trustFlag,
      })
      .from(ocurrency)
      .innerJoin(market, eq(ocurrency.marketId, market.id))
      .where(eq(ocurrency.productId, p.id));

    console.log(`\n📦 ${p.name} [EAN: ${p.ean}] - Categoria: ${p.description}`);
    occs.forEach((o) =>
      console.log(`   🏬 ${o.marketName.padEnd(25)} -> R$ ${Number(o.value).toFixed(2)} (👍 ${o.upvotes})`)
    );
  }

  await pool.end();
}

verify().catch(console.error);
