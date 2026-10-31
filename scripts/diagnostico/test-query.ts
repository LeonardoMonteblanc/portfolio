import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const result =
      await client`SELECT solicitacao_id FROM log_vinculacao_solicitacao LIMIT 1`;
    console.log("✅ Query OK:", result);
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
  }
  await client.end();
  process.exit(0);
}

run();
