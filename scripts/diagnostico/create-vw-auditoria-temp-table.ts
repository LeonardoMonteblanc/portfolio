import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log(
      "🔄 Criando view vw_auditoria_consolidada via tabela temporária...",
    );

    // Etapa 1: Drop se existe - drop regular view first, then materialized
    await client`DROP VIEW IF EXISTS vw_auditoria_consolidada;`;
    await client`DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;`;
    console.log("✅ Limpeza OK");

    // Etapa 2: Criar tabela regular (não temporária) com a query UNION ALL completa
    console.log("🔄 Criando tabela regular...");

    await client`CREATE TABLE audit_temp_consolidada AS
      SELECT
        id,
        'log_login' as tabela_origem,
        criado_em,
        ator_tipo::character varying(20) as ator_tipo,
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
        ator_tipo::character varying(20) as ator_tipo,
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
        'sistema'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
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
        'sistema'::character varying(20) as ator_tipo,
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
        'solicitante'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
        null as ator_id,
        decisao as acao,
        'solicitacao' as entidade_tipo,
        solicitacao_id as entidade_id,
        jsonb_build_object('solicitacao_id', solicitacao_id, 'decisao', decisao, 'justificativa', justificativa, 'negocio_id', negocio_id) as detalhes
      FROM log_solicitacao_analisada
      UNION ALL
      SELECT
        id,
        'log_forum' as tabela_origem,
        criado_em,
        'admin'::character varying(20) as ator_tipo,
        null as ator_id,
        acao as acao,
        'forum_publicacao' as entidade_tipo,
        publicacao_id as entidade_id,
        jsonb_build_object('publicacao_id', publicacao_id, 'acao', acao) as detalhes
      FROM log_forum
      UNION ALL
      SELECT
        id,
        'log_contestacao' as tabela_origem,
        criado_em,
        'admin'::character varying(20) as ator_tipo,
        null as ator_id,
        acao as acao,
        'contestacao' as entidade_tipo,
        contestacao_id as entidade_id,
        jsonb_build_object('contestacao_id', contestacao_id, 'acao', acao, 'situacao_anterior', situacao_anterior, 'situacao_nova', situacao_nova) as detalhes
      FROM log_contestacao
      UNION ALL
      SELECT
        id,
        'log_votacao' as tabela_origem,
        criado_em,
        'admin'::character varying(20) as ator_tipo,
        ator_id,
        acao as acao,
        'votacao' as entidade_tipo,
        votacao_id as entidade_id,
        jsonb_build_object('votacao_id', votacao_id, 'acao', acao, 'ator_id', ator_id, 'resultado', resultado) as detalhes
      FROM log_votacao
      UNION ALL
      SELECT
        id,
        'log_suspensao_admin' as tabela_origem,
        criado_em,
        'desenvolvedor'::character varying(20) as ator_tipo,
        admin_alvo_id as ator_id,
        acao as acao,
        'admin' as entidade_tipo,
        admin_alvo_id as entidade_id,
        jsonb_build_object('admin_alvo_id', admin_alvo_id, 'acao', acao) as detalhes
      FROM log_suspensao_admin
      UNION ALL
      SELECT
        id,
        'log_negocio' as tabela_origem,
        criado_em,
        'admin'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
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
        'admin'::character varying(20) as ator_tipo,
        null as ator_id,
        acao as acao,
        'imagem' as entidade_tipo,
        imagem_id as entidade_id,
        jsonb_build_object('imagem_id', imagem_id, 'acao', acao, 'justificativa', justificativa) as detalhes
      FROM log_imagem
      UNION ALL
      SELECT
        id,
        'log_auditoria' as tabela_origem,
        criado_em,
        ator_tipo::character varying(20) as ator_tipo,
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
        ator_tipo::character varying(20) as ator_tipo,
        ator_id,
        acao,
        'anexo' as entidade_tipo,
        anexo_id as entidade_id,
        jsonb_build_object('anexo_id', anexo_id, 'acao', acao, 'situacao_anterior', situacao_anterior, 'situacao_nova', situacao_nova) as detalhes
      FROM log_anexo
      UNION ALL
      SELECT
        id,
        'log_comunicacao' as tabela_origem,
        criado_em,
        'sistema'::character varying(20) as ator_tipo,
        null as ator_id,
        'enviar_email' as acao,
        'comunicacao' as entidade_tipo,
        null as entidade_id,
        jsonb_build_object('tipo', tipo, 'destinatario', destinatario, 'sucesso', sucesso, 'erro', erro) as detalhes
      FROM log_comunicacao;`;

    console.log("✅ Tabela regular criada");

    // Criar materialized view a partir da tabela regular
    await client`CREATE MATERIALIZED VIEW vw_auditoria_consolidada AS SELECT * FROM audit_temp_consolidada;`;
    console.log("✅ Materialized view criada");

    // Dropar tabela regular
    await client`DROP TABLE audit_temp_consolidada;`;
    console.log("✅ Tabela regular removida");

    // Índices
    await client`CREATE UNIQUE INDEX idx_vw_auditoria_id ON vw_auditoria_consolidada (id);`;
    await client`CREATE INDEX idx_vw_auditoria_criado_em ON vw_auditoria_consolidada (criado_em DESC);`;
    await client`CREATE INDEX idx_vw_auditoria_ator ON vw_auditoria_consolidada (ator_tipo, ator_id);`;
    await client`CREATE INDEX idx_vw_auditoria_entidade ON vw_auditoria_consolidada (entidade_tipo, entidade_id);`;
    await client`CREATE INDEX idx_vw_auditoria_acao ON vw_auditoria_consolidada (acao);`;
    console.log("✅ Índices criados");

    console.log("🎉 Materialized view COMPLETA criada com sucesso!");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run();
