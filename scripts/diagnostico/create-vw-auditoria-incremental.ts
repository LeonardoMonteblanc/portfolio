import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log("🔄 Criando view vw_auditoria_consolidada em etapas...");

    // Etapa 1: Drop se existe
    await client`DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;`;
    await client`DROP VIEW IF EXISTS vw_auditoria_consolidada;`;
    console.log("✅ Limpeza OK");

    // Helper para cast de ator_tipo
    const castAtorTipo = "ator_tipo::character varying(20) as ator_tipo";

    // Etapa 1: Drop se existe
    await client`DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;`;
    await client`DROP VIEW IF EXISTS vw_auditoria_consolidada;`;
    console.log("✅ Limpeza OK");

    // Etapa 2: Criar view com apenas log_login
    await client`CREATE VIEW vw_auditoria_consolidada AS SELECT id, 'log_login' as tabela_origem, criado_em, ator_tipo::character varying(20) as ator_tipo, ator_id, 'login' as acao, 'admin' as entidade_tipo, ator_id as entidade_id, jsonb_build_object('admin_id', admin_id) as detalhes FROM log_login;`;
    console.log("✅ View criada com log_login");

    // Etapa 3: Adicionar log_logout
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_logout' as tabela_origem, criado_em, ator_tipo::character varying(20) as ator_tipo, ator_id, 'logout' as acao, 'admin' as entidade_tipo, ator_id as entidade_id, jsonb_build_object('admin_id', admin_id) as detalhes FROM log_logout;`;
    console.log("✅ log_logout adicionado");

    // Etapa 4: Adicionar log_falha_login
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_falha_login' as tabela_origem, criado_em, 'sistema'::character varying(20) as ator_tipo, null as ator_id, 'falha_login' as acao, 'admin' as entidade_tipo, null as entidade_id, jsonb_build_object('email_tentado', email_tentado, 'motivo', motivo) as detalhes FROM log_falha_login;`;
    console.log("✅ log_falha_login adicionado");

    // Etapa 5: Adicionar log_recuperacao_senha
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_recuperacao_senha' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, admin_id as ator_id, etapa as acao, 'admin' as entidade_tipo, admin_id as entidade_id, jsonb_build_object('admin_id', admin_id, 'etapa', etapa) as detalhes FROM log_recuperacao_senha;`;
    console.log("✅ log_recuperacao_senha adicionado");

    // Etapa 6: Adicionar log_rate_limit
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_rate_limit' as tabela_origem, criado_em, 'sistema'::character varying(20) as ator_tipo, null as ator_id, 'rate_limit' as acao, 'rate_limit' as entidade_tipo, null as entidade_id, jsonb_build_object('ip', ip, 'rota', rota, 'limite', limite) as detalhes FROM log_rate_limit;`;
    console.log("✅ log_rate_limit adicionado");

    // Etapa 7: Adicionar log_solicitacao_recebida
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_solicitacao_recebida' as tabela_origem, criado_em, 'solicitante'::character varying(20) as ator_tipo, null as ator_id, 'solicitacao_recebida' as acao, 'solicitacao' as entidade_tipo, solicitacao_id as entidade_id, jsonb_build_object('solicitacao_id', solicitacao_id, 'tipo', tipo) as detalhes FROM log_solicitacao_recebida;`;
    console.log("✅ log_solicitacao_recebida adicionado");

    // Etapa 8: Adicionar log_vinculacao_solicitacao
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_vinculacao_solicitacao' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, 'vincular_solicitacao' as acao, 'solicitacao' as entidade_tipo, solicitacao_id as entidade_id, jsonb_build_object('solicitacao_id', solicitacao_id, 'negocio_id_antes', negocio_id_antes, 'negocio_id_depois', negocio_id_depois) as detalhes FROM log_vinculacao_solicitacao;`;
    console.log("✅ log_vinculacao_solicitacao adicionado");

    // Etapa 9: Adicionar log_solicitacao_analisada
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_solicitacao_analisada' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, decisao as acao, 'solicitacao' as entidade_tipo, solicitacao_id as entidade_id, jsonb_build_object('solicitacao_id', solicitacao_id, 'decisao', decisao, 'justificativa', justificativa, 'negocio_id', negocio_id) as detalhes FROM log_solicitacao_analisada;`;
    console.log("✅ log_solicitacao_analisada adicionado");

    // Etapa 10: Adicionar log_forum
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_forum' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'forum_publicacao' as entidade_tipo, publicacao_id as entidade_id, jsonb_build_object('solicitacao_id', solicitacao_id, 'publicacao_id', publicacao_id, 'acao', acao) as detalhes FROM log_forum;`;
    console.log("✅ log_forum adicionado");

    // Etapa 10: Adicionar log_contestacao
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_contestacao' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'contestacao' as entidade_tipo, contestacao_id as entidade_id, jsonb_build_object('decisao_contestada_id', decisao_contestada_id, 'contestacao_id', contestacao_id) as detalhes FROM log_contestacao;`;
    console.log("✅ log_contestacao adicionado");

    // Etapa 10: Adicionar log_votacao
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_votacao' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, ator_id, acao as acao, 'votacao' as entidade_tipo, votacao_id as entidade_id, jsonb_build_object('votacao_id', votacao_id, 'acao', acao, 'admin_id', admin_id, 'resultado', resultado) as detalhes FROM log_votacao;`;
    console.log("✅ log_votacao adicionado");

    // Etapa 11: Adicionar log_suspensao_admin
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_suspensao_admin' as tabela_origem, criado_em, 'desenvolvedor'::character varying(20) as ator_tipo, por_admin_id as ator_id, acao as acao, 'admin' as entidade_tipo, admin_alvo_id as entidade_id, jsonb_build_object('admin_alvo_id', admin_alvo_id, 'acao', acao, 'por_admin_id', por_admin_id) as detalhes FROM log_suspensao_admin;`;
    console.log("✅ log_suspensao_admin adicionado");

    // Etapa 12: Adicionar log_negocio
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_negocio' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'negocio' as entidade_tipo, negocio_id as entidade_id, jsonb_build_object('negocio_id', negocio_id, 'acao', acao, 'snapshot_antes', snapshot_antes, 'snapshot_depois', snapshot_depois) as detalhes FROM log_negocio;`;
    console.log("✅ log_negocio adicionado");

    // Etapa 13: Adicionar log_categoria
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_categoria' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'categoria' as entidade_tipo, categoria_id as entidade_id, jsonb_build_object('categoria_id', categoria_id, 'acao', acao, 'snapshot_antes', snapshot_antes, 'snapshot_depois', snapshot_depois, 'categoria_destino_id', categoria_destino_id) as detalhes FROM log_categoria;`;
    console.log("✅ log_categoria adicionado");

    // Etapa 13: Adicionar log_sugestao_categoria
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_sugestao_categoria' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'sugestao_categoria' as entidade_tipo, sugestao_id as entidade_id, jsonb_build_object('sugestao_id', sugestao_id, 'acao', acao, 'categoria_criada_id', categoria_criada_id) as detalhes FROM log_sugestao_categoria;`;
    console.log("✅ log_sugestao_categoria adicionado");

    // Etapa 14: Adicionar log_imagem
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_imagem' as tabela_origem, criado_em, 'admin'::character varying(20) as ator_tipo, null as ator_id, acao as acao, 'imagem' as entidade_tipo, imagem_id as entidade_id, jsonb_build_object('imagem_id', imagem_id, 'negocio_id', negocio_id, 'acao', acao, 'justificativa', justificativa) as detalhes FROM log_imagem;`;
    console.log("✅ log_imagem adicionado");

    // Etapa 14: Adicionar log_auditoria
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_auditoria' as tabela_origem, criado_em, ator_tipo::character varying(20) as ator_tipo, ator_id, acao, entidade_tipo, entidade_id, detalhes FROM log_auditoria;`;
    console.log("✅ log_auditoria adicionado");

    // Etapa 15: Adicionar log_anexo
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_anexo' as tabela_origem, criado_em, ator_tipo::character varying(20) as ator_tipo, ator_id, acao, 'anexo' as entidade_tipo, anexo_id as entidade_id, jsonb_build_object('anexo_id', anexo_id, 'acao', acao, 'justificativa', justificativa) as detalhes FROM log_anexo;`;
    console.log("✅ log_anexo adicionado");

    // Etapa 15: Adicionar log_comunicacao
    await client`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada UNION ALL SELECT id, 'log_comunicacao' as tabela_origem, criado_em, 'sistema'::character varying(20) as ator_tipo, null as ator_id, 'enviar_email' as acao, 'comunicacao' as entidade_tipo, null as entidade_id, jsonb_build_object('tipo', tipo, 'destinatario', destinatario, 'sucesso', sucesso, 'erro', erro) as detalhes FROM log_comunicacao;`;
    console.log("✅ log_comunicacao adicionado");

    // Converter para materialized view
    await client`DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;`;
    await client`CREATE MATERIALIZED VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada;`;
    console.log("✅ Convertida para materialized view");

    // Índices
    await client`CREATE UNIQUE INDEX idx_vw_auditoria_id ON vw_auditoria_consolidada (id);`;
    await client`CREATE INDEX idx_vw_auditoria_criado_em ON vw_auditoria_consolidada (criado_em DESC);`;
    await client`CREATE INDEX idx_vw_auditoria_ator ON vw_auditoria_consolidada (ator_tipo, ator_id);`;
    await client`CREATE INDEX idx_vw_auditoria_entidade ON vw_auditoria_consolidada (entidade_tipo, entidade_id);`;
    await client`CREATE INDEX idx_vw_auditoria_acao ON vw_auditoria_consolidada (acao);`;
    console.log("✅ Índices criados");

    console.log("🎉 View COMPLETA criada com sucesso!");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run();
