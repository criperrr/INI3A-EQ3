import pg from "pg";

const { Pool } = pg;

async function runIntegrityChecks() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@127.0.0.1:5433/presco_db";

  console.log("[INFO] Conectando ao PostgreSQL para verificação profunda de integridade...");
  const pool = new Pool({ connectionString });

  const checks = [
    {
      name: "Valores positivos e válidos em ocorrências de preço",
      query: `SELECT count(*)::int as failures FROM ocurrency WHERE value <= 0 OR value IS NULL`,
      expected: 0,
    },
    {
      name: "Integridade referencial de ocorrências (sem produtos ou mercados órfãos)",
      query: `
        SELECT count(*)::int as failures FROM ocurrency 
        WHERE product_id NOT IN (SELECT id FROM product)
           OR market_id NOT IN (SELECT id FROM market)
      `,
      expected: 0,
    },
    {
      name: "Consistência de saldo de XP dos usuários (points >= 0)",
      query: `SELECT count(*)::int as failures FROM "user" WHERE points < 0`,
      expected: 0,
    },
    {
      name: "Prevenção de votos duplicados na auditoria comunitária (cured)",
      query: `
        SELECT count(*)::int as failures FROM (
          SELECT user_id, ocurrency_id, count(*) 
          FROM cured 
          GROUP BY user_id, ocurrency_id 
          HAVING count(*) > 1
        ) dups
      `,
      expected: 0,
    },
    {
      name: "Guarda anti-auto-voto (nenhum autor votando na própria cotação)",
      query: `
        SELECT count(*)::int as failures 
        FROM cured c 
        JOIN ocurrency o ON c.ocurrency_id = o.id 
        WHERE c.user_id = o.user_id
      `,
      expected: 0,
    },
    {
      name: "Integridade de catálogo (todos os produtos possuem nome preenchido)",
      query: `SELECT count(*)::int as failures FROM product WHERE name IS NULL OR length(trim(name)) = 0`,
      expected: 0,
    },
    {
      name: "Integridade geoespacial dos supermercados (coordenadas obrigatórias)",
      query: `SELECT count(*)::int as failures FROM market WHERE location IS NULL`,
      expected: 0,
    },
    {
      name: "Unicidade estrita de e-mails de usuários",
      query: `
        SELECT count(*)::int as failures FROM (
          SELECT email, count(*) 
          FROM "user" 
          GROUP BY email 
          HAVING count(*) > 1
        ) dups
      `,
      expected: 0,
    },
  ];

  let totalFailures = 0;

  try {
    for (let i = 0; i < checks.length; i++) {
      const c = checks[i];
      const res = await pool.query(c.query);
      const failures = Number(res.rows[0]?.failures || 0);

      if (failures === c.expected) {
        console.log(`[OK] [Check ${i + 1}/${checks.length}] ${c.name}: Aprovado (0 anomalias).`);
      } else {
        console.error(`[ERRO] [Check ${i + 1}/${checks.length}] ${c.name}: FALHOU! Encontrados ${failures} registros corruptos.`);
        totalFailures++;
      }
    }

    if (totalFailures > 0) {
      console.error(`\n[ERRO] A auditoria de integridade pós-carga detectou ${totalFailures} violação(ões) crítica(s) de regras de negócio no banco.`);
      process.exit(1);
    } else {
      console.log(`\n[OK] Todas as ${checks.length} verificações de integridade relacional, transacional e anti-fraude do banco foram APROVADAS com 100% de integridade!`);
      process.exit(0);
    }
  } catch (err: any) {
    console.error("[ERRO] Falha ao executar queries de verificação de integridade:", err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runIntegrityChecks();
