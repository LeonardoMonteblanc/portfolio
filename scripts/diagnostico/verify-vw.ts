import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const result =
      await client`SELECT count(*) as total FROM vw_auditoria_consolidada`;
    console.log("✅ View funcionando, total de registros:", result[0].total);
    const tables =
      await client`SELECT DISTINCT tabela_origem FROM vw_auditoria_consolidada ORDER BY tabela_origem`;
    console.log(
      "Tabelas na view:",
      tables.map((r) => r.tabela_origem).join(", "),
    );
  } catch (e) {
    console.error("❌ Erro:", e.message);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run();
