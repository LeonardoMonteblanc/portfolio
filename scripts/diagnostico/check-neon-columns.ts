import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  const tables = [
    "log_vinculacao_solicitacao",
    "log_solicitacao_analisada",
    "log_solicitacao_recebida",
    "log_vinculacao_solicitacao",
    "log_correcao",
    "log_cancelamento_fila",
    "log_reabertura",
    "log_configuracao",
    "log_anonimizacao",
    "log_comunicacao",
    "log_suspensao_admin",
  ];

  for (const table of tables) {
    try {
      const result =
        await client`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table} ORDER BY ordinal_position`;
      console.log(`\n${table}:`);
      console.log(result.map((r) => r.column_name).join(", "));
    } catch (e: any) {
      console.log(`\n${table}: ERRO - ${e.message}`);
    }
  }

  process.exit(0);
}

run();
