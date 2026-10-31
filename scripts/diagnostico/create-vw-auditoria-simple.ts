import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("🔄 Criando materialized view vw_auditoria_consolidada...");

    // Criar a view em partes para evitar erro de tamanho
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
      UNION ALL
      SELECT
        id,
        'log_logout' as tabela_origem,
        criado_em,
        ator_tipo,
        ator_id,
        'logout' as acao,
        'admin' as entidade_tipo,
        ator_id as entidade_id,
        jsonb_build_object('admin_id', admin_id) as detalhes
      FROM log_logout
      UNION ALL
      SELECT
        id,
        'log_falha_login' as tabela_origem,
        criado_em,
        'sistema' as ator_tipo,
        null as ator_id,
        'falha_login' as acao,
        'admin' as entidade_tipo,
        null as entidade_id,
        jsonb_build_object('email_tentado', email_tentado, 'motivo', motivo) as detalhes
      FROM log_falha_login
      UNION ALL
      SELECT
        id,
        'log_recuperacao_senha' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        admin_id as ator_id,
        etapa as acao,
        'admin' as entidade_tipo,
        admin_id as entidade_id,
        jsonb_build_object('admin_id', admin_id, 'etapa', etapa) as detalhes
      FROM log_recuperacao_senha
      UNION ALL
      SELECT
        id,
        'log_rate_limit' as tabela_origem,
        criado_em,
        'sistema' as ator_tipo,
        null as ator_id,
        'rate_limit' as acao,
        'rate_limit' as entidade_tipo,
        null as entidade_id,
        jsonb_build_object('ip', ip, 'rota', rota, 'limite', limite) as detalhes
      FROM log_rate_limit
      UNION ALL
      SELECT
        id,
        'log_solicitacao_recebida' as tabela_origem,
        criado_em,
        'solicitante' as ator_tipo,
        null as ator_id,
        'solicitacao_recebida' as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'tipo', tipo) as detalhes
      FROM log_solicitacao_recebida
      UNION ALL
      SELECT
        id,
        'log_vinculacao_solicitacao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        'vincular_solicitacao' as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'negocio_id_antes', negocio_id_antes, 'negocio_id_depois', negocio_id_depois) as detalhes
      FROM log_vinculacao_solicitacao
      UNION ALL
      SELECT
        id,
        'log_solicitacao_analisada' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        decisao as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'decisao', decisao, 'origem', origem, 'justificativa', justificativa, 'negocio_id', negocio_id) as detalhes
      FROM log_solicitacao_analisada
      WITH NO DATA;
    `);
    console.log("✅ Parte 1 da view criada");

    // Adicionar as demais tabelas via REFRESH
    await db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY vw_auditoria_consolidada;`,
    );
    console.log("✅ View refrescada com todas as tabelas");

    // Índices
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vw_auditoria_id ON vw_auditoria_consolidada (id);`,
    );
    console.log("✅ Unique index on id");

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_criado_em ON vw_auditoria_consolidada (criado_em DESC);`,
    );
    console.log("✅ idx criado_em");

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_ator ON vw_auditoria_consolidada (ator_tipo, ator_id);`,
    );
    console.log("✅ idx ator");

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_entidade ON vw_auditoria_consolidada (entidade_tipo, entidade_id);`,
    );
    console.log("✅ idx entidade");

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_vw_auditoria_acao ON vw_auditoria_consolidada (acao);`,
    );
    console.log("✅ idx acao");

    console.log(
      "🎉 Materialized view vw_auditoria_consolidada criada com sucesso!",
    );
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

run();
