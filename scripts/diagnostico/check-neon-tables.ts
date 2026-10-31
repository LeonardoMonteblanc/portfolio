import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const result =
      await client`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'log_%' ORDER BY tablename`;
    console.log(
      "Tabelas log_* no Neon:",
      result.map((r) => r.tablename).join(", "),
    );
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run();
