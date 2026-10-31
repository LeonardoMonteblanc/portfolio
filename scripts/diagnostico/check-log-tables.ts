import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function check() {
  const tables = [
    "log_login",
    "log_logout",
    "log_falha_login",
    "log_recuperacao_senha",
    "log_rate_limit",
    "log_solicitacao_recebida",
    "log_vinculacao_solicitacao",
    "log_solicitacao_analisada",
    "log_reabertura",
    "log_correcao",
    "log_cancelamento_fila",
    "log_forum",
    "log_contestacao",
    "log_votacao",
    "log_suspensao_admin",
    "log_negocio",
    "log_categoria",
    "log_sugestao_categoria",
    "log_imagem",
    "log_configuracao",
    "log_anonimizacao",
    "log_comunicacao",
    "log_auditoria",
    "log_anexo",
  ];

  for (const t of tables) {
    try {
      const r = await db.execute(
        sql`SELECT 1 FROM ${sql.identifier(t)} LIMIT 1`,
      );
      console.log(`✅ ${t}`);
    } catch (e) {
      console.log(`❌ ${t} - NAO EXISTE`);
    }
  }
  process.exit(0);
}

check();
