import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log(
      "🔄 Recriando materialized view vw_auditoria_consolidada com TODAS as tabelas...",
    );

    // Drop se existe
    await db.execute(
      sql`DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;`,
    );
    console.log("✅ View antiga removida");

    // Criar com todas as tabelas
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
      UNION ALL
      SELECT
        id,
        'log_reabertura' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        'reabrir_por_erro' as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'decisao_original_id', decisao_original_id, 'justificativa', justificativa) as detalhes
      FROM log_reabertura
      UNION ALL
      SELECT
        id,
        'log_correcao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'correcao_dados' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'acao', acao, 'prazo_em', prazo_em) as detalhes
      FROM log_correcao
      UNION ALL
      SELECT
        id,
        'log_cancelamento_fila' as tabela_origem,
        criado_em,
        'sistema' as ator_tipo,
        null as ator_id,
        'cancelar_fila' as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'motivo', motivo) as detalhes
      FROM log_cancelamento_fila
      UNION ALL
      SELECT
        id,
        'log_forum' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        tipo as acao,
        'forum_publicacao' as entidade_tipo,
        publicacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'publicacao_id', publicacao_id, 'tipo', tipo) as detalhes
      FROM log_forum
      UNION ALL
      SELECT
        id,
        'log_contestacao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'contestacao' as entidade_tipo,
        contestacao_id as entidade_id,
        jsonb_build_object('decisao_contestada_id', decisao_contestada_id, 'contestacao_id', contestacao_id) as detalhes
      FROM log_contestacao
      UNION ALL
      SELECT
        id,
        'log_votacao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        ator_id,
        acao as acao,
        'votacao' as entidade_tipo,
        votacao_id as entidade_id,
        jsonb_build_object('votacao_id', votacao_id, 'acao', acao, 'admin_id', admin_id, 'resultado', resultado) as detalhes
      FROM log_votacao
      UNION ALL
      SELECT
        id,
        'log_suspensao_admin' as tabela_origem,
        criado_em,
        'desenvolvedor' as ator_tipo,
        por_admin_id as ator_id,
        acao as acao,
        'admin' as entidade_tipo,
        admin_id_afetado as entidade_id,
        jsonb_build_object('admin_id_afetado', admin_id_afetado, 'acao', acao, 'por_admin_id', por_admin_id) as detalhes
      FROM log_suspensao_admin
      UNION ALL
      SELECT
        id,
        'log_negocio' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'negocio' as entidade_tipo,
        negocio_id as entidade_id,
        jsonb_build_object('negocio_id', negocio_id, 'acao', acao, 'snapshot_antes', snapshot_antes, 'snapshot_depois', snapshot_depois) as detalhes
      FROM log_negocio
      UNION ALL
      SELECT
        id,
        'log_categoria' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'categoria' as entidade_tipo,
        categoria_id as entidade_id,
        jsonb_build_object('categoria_id', categoria_id, 'acao', acao, 'snapshot_antes', snapshot_antes, 'snapshot_depois', snapshot_depois, 'categoria_destino_id', categoria_destino_id) as detalhes
      FROM log_categoria
      UNION ALL
      SELECT
        id,
        'log_sugestao_categoria' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'sugestao_categoria' as entidade_tipo,
        sugestao_id as entidade_id,
        jsonb_build_object('sugestao_id', sugestao_id, 'acao', acao, 'categoria_criada_id', categoria_criada_id) as detalhes
      FROM log_sugestao_categoria
      UNION ALL
      SELECT
        id,
        'log_imagem' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        acao as acao,
        'imagem' as entidade_tipo,
        imagem_id as entidade_id,
        jsonb_build_object('imagem_id', imagem_id, 'negocio_id', negocio_id, 'acao', acao, 'justificativa', justificativa) as detalhes
      FROM log_imagem
      UNION ALL
      SELECT
        id,
        'log_configuracao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        'atualizar_configuracao' as acao,
        'configuracao' as entidade_tipo,
        null as entidade_id,
        jsonb_build_object('chave', chave, 'valor_antes', valor_antes, 'valor_depois', valor_depois) as detalhes
      FROM log_configuracao
      UNION ALL
      SELECT
        id,
        'log_anonimizacao' as tabela_origem,
        criado_em,
        'admin' as ator_tipo,
        null as ator_id,
        'anonimizar' as acao,
        'solicitante' as entidade_tipo,
        solicitante_id as entidade_id,
        jsonb_build_object('solicitante_id', solicitante_id, 'campos_anonimizados', campos_anonimizados) as detalhes
      FROM log_anonimizacao
      UNION ALL
      SELECT
        id,
        'log_comunicacao' as tabela_origem,
        criado_em,
        'sistema' as ator_tipo,
        null as ator_id,
        'enviar_email' as acao,
        'comunicacao' as entidade_tipo,
        null as entidade_id,
        jsonb_build_object('tipo', tipo, 'destinatario', destinatario, 'sucesso', sucesso, 'erro', erro) as detalhes
      FROM log_comunicacao
      UNION ALL
      SELECT
        id,
        'log_auditoria' as tabela_origem,
        criado_em,
        ator_tipo,
        ator_id,
        acao,
        entidade_tipo,
        entidade_id,
        detalhes
      FROM log_auditoria
      UNION ALL
      SELECT
        id,
        'log_anexo' as tabela_origem,
        criado_em,
        ator_tipo,
        ator_id,
        acao,
        'anexo' as entidade_tipo,
        anexo_id as entidade_id,
        jsonb_build_object('anexo_id', anexo_id, 'acao', acao, 'justificativa', justificativa) as detalhes
      FROM log_anexo;
    `);
    console.log("✅ View completa criada");

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

    console.log("🎉 View COMPLETA criada com sucesso!");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

run();
