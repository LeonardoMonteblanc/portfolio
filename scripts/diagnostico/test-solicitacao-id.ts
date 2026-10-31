import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const tables = [
      "log_vinculacao_solicitacao",
      "log_solicitacao_analisada",
      "log_solicitacao_recebida",
      "log_correcao",
      "log_cancelamento_fila",
      "log_reabertura",
    ];

    for (const table of tables) {
      try {
        const result =
          await client`SELECT solicitacao_id FROM ${client(table)} LIMIT 1`;
        console.log(`✅ ${table}: solicitacao_id OK`);
      } catch (e: any) {
        console.log(`❌ ${table}: ${e.message}`);
      }
    }
  } catch (e: any) {
    console.error("❌ Erro geral:", e.message);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run();
