import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log(
      "🔄 Criando materialized view vw_auditoria_consolidada (versão mínima)...",
    );

    // Versão mínima para testar
    await db.execute(sql`
      CREATE MATERIALIZED VIEW vw_auditoria_consolidada AS
      SELECT
        id,
        'log_login' as tabela_origem,
        criado_em,
        ator_tipo,
        ator_id,
        'login' as acao,
        'admin' as entidade_tipo,
        ator_id as entidade_id,
        jsonb_build_object('admin_id', admin_id) as detalhes
      FROM log_login
      WITH NO DATA;
    `);
    console.log("✅ View criada (versão mínima)");

    // Testar refresh
    await db.execute(sql`REFRESH MATERIALIZED VIEW vw_auditoria_consolidada;`);
    console.log("✅ Refresh funcionou");

    // Índices
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vw_auditoria_id ON vw_auditoria_consolidada (id);`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_criado_em ON vw_auditoria_consolidada (criado_em DESC);`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_ator ON vw_auditoria_consolidada (ator_tipo, ator_id);`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_entidade ON vw_auditoria_consolidada (entidade_tipo, entidade_id);`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_acao ON vw_auditoria_consolidada (acao);`,
    );
    console.log("✅ Índices criados");

    console.log("🎉 View mínima funcionando!");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

run();
