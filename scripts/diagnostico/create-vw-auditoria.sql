DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;

-- Criar view regular primeiro
CREATE VIEW vw_auditoria_consolidada AS
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
  jsonb_build_object('solicitacao_id', solicitacao_id, 'decisao', decisao, 'justificativa', justificativa, 'negocio_id', negocio_id) as detalhes
FROM log_solicitacao_analisada
UNION ALL
SELECT
  id,
  'log_forum' as tabela_origem,
  criado_em,
  'admin' as ator_tipo,
  null as ator_id,
  acao as acao,
  'forum_publicacao' as entidade_tipo,
  publicacao_id as entidade_id,
  jsonb_build_object('solicitacao_id', solicitacao_id, 'publicacao_id', publicacao_id, 'acao', acao) as detalhes
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
  admin_alvo_id as entidade_id,
  jsonb_build_object('admin_alvo_id', admin_alvo_id, 'acao', acao, 'por_admin_id', por_admin_id) as detalhes
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
FROM log_anexo
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

-- Converter para materialized view
DROP MATERIALIZED VIEW IF EXISTS vw_auditoria_consolidada;
CREATE MATERIALIZED VIEW vw_auditoria_consolidada AS SELECT * FROM vw_auditoria_consolidada;

-- Índices
CREATE UNIQUE INDEX idx_vw_auditoria_id ON vw_auditoria_consolidada (id);
CREATE INDEX idx_vw_auditoria_criado_em ON vw_auditoria_consolidada (criado_em DESC);
CREATE INDEX idx_vw_auditoria_ator ON vw_auditoria_consolidada (ator_tipo, ator_id);
CREATE INDEX idx_vw_auditoria_entidade ON vw_auditoria_consolidada (entidade_tipo, entidade_id);
CREATE INDEX idx_vw_auditoria_acao ON vw_auditoria_consolidada (acao);